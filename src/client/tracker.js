/**
 * Used to parse the query string so values can be retrieved.
 *
 * Tries to use the browser's default implementation and falls back to a custom
 * polyfill.
 *
 * @param params
 *  The query string without leading `?`
 * @return {{get: (function(*): string|undefined)}|URLSearchParams}
 *   Returns an instance of URLSearchParams or an object that has a similar get
 *   function.
 */
function parseUrlParams(params) {
  // Try to use the built in URLSearchParams parser for browsers.
  try {
    return new URLSearchParams(params);
  }
  // Polyfill to something custom. At least Internet Explorer requires this.
  catch {
    const getParam = param => {
      const reFindValue = new RegExp("[?&](" + param + ")=([^?&]+)", "gi");
      // Find the desired parameter with regular expressions.
      // Convert null from `match` to an empty array for `map`.
      return (params.match(reFindValue) || [])
        // Match the matches to their values only.
        .map(function(m) {
          return m.split("=")[1];
        })
        // Finally return the first value found.
        .shift();
    };

    // Return an object with `.get` so its signature matches
    // URLSearchParams.
    return {
      get: getParam,
    }
  }
}

/**
 * Returns a time in milliseconds.
 *
 * Defaults to time since the UNIX epoch (a timestamp).
 *
 * @param since
 *   A timestamp that can be used to calculate the difference.
 * @return {number}
 *   The time in milliseconds.
 */
function time(since = 0) {
  return Date.now() - since;
}

/**
 * Convert a number of milliseconds to seconds.
 *
 * @return {number}
 *   The number of seconds.
 */
function msToS(ms) {
  return Math.round(ms / 1000);
}

function createTracker(window, endpoint) {
  // Record the start of the current page view to measure time-on-page.
  let start = time();

  // Allow retrieving values from the query string.
  // TODO: Possibly don't use URLSearchParams here to allow also tracking utm_
  //    prefixed strings.
  const query = parseUrlParams(window.document.location.search.substring(1));

  // The timezone detection can error on some platforms where resolvedOptions
  // is not a function. Tracking should continue regardless.
  let timezone;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {}

  // Start building a payload with metadata for this request.
  let payload = {
    hostname: window.location.hostname,
    timezone,
    width: window.innerWidth,
    height: window.innerHeight,
    source: {
      source: query.get('source'),
      medium: query.get('medium'),
      campaign: query.get('campaign'),
      referrer:
        (window.document.referrer || "")
          // Strip out the protocol, loadbalancer or mobile specific
          // subdomains and remove the query string.
          .replace(
            /^https?:\/\/((m|l|w{2,3}([0-9]+)?)\.)?([^?#]+)(.*)$/,
            "$4"
          )
          // Normalise to no trailing slash.
          .replace(/^([^\/]+)\/$/, "$1") || undefined
    },
    pageviews: [],
  };

  // Track how long the page was loaded but not visible to the user. This is
  // needed to determine how long the user actually spent viewing the page.
  let msHidden = 0;
  let hiddenStart = 0;
  window.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenStart = time();
    }
    else {
      msHidden += time(hiddenStart);
    }
  }, false);

  // Wrap up tracking for our latest pageview.
  const finishPageView = () => {
    // If there are no pageviews yet there's nothing to do.
    if (!payload.pageviews.length) return;

    // Use this opportunity to complete time tracking for our latest pageview.
    const lastPageView = payload.pageviews[payload.pageviews.length - 1];

    // Include the time spent hidden as an offset to our start so that it's
    // not counted towards page view time.
    lastPageView.timeOnPage = msToS(time(start + msHidden));
    start = time();
    msHidden = 0;

    // Store the farthest point the user has scrolled to and restart measuring.
    // Rounding to two decimals.
    lastPageView.scroll = Math.round(scrollPos * 100) / 100;
    scrollPos = 0;
  };

  // Whether we use the beacon API or immediately submit our pageviews.
  let useSendBeacon = false;

  // Set up our function that adds pageviews to our tracking payload.
  let lastPath;

  // Store the scrollposition for the current pageview.
  let scrollPos = 0;

  // Return the functions that can be used to manipulate our payload.
  return {
    /**
     * Puts the tracker in Beacon mode to send the pageviews at the end.
     *
     * @return {function(...[*]=)}
     *   A function that should be passed to the pagehide or unload event.
     */
    lightBeacon: () => {
      useSendBeacon = true;
      return (event) => {
        // Send the beacon only if the page is destructed, otherwise we're just
        // unfocused which is already handled by visibility change tracking
        // elsewhere. This most closely mimics the unload behaviour.
        if (event.persisted) {
          return;
        }

        finishPageView();

        // Timestamp our payload.
        payload.time = msToS(time());

        // Use the beacon API to submit our data to ensure navigation isn't
        // blocked while we make our request.
        window.navigator.sendBeacon(endpoint + "/post", JSON.stringify(payload));
      }
    },
    /**
     * Records a new pageview.
     *
     * @param isPushState
     *   Whether this pageview is the result of a SPA navigation.
     */
    pageview: isPushState => {
      // Use only the path so we don't store info that could identify the user.
      const path = window.location.pathname;

      // If this was an on-page navigation we don't track it.
      if (lastPath === path) return;
      lastPath = path;

      let data = {
        path,
        time: msToS(time()),
      };

      finishPageView();
      payload.pageviews.push(data);

      // If we use the beacon API then we're done now.
      // Otherwise we send immediately.
      if (useSendBeacon) {
        return;
      }

      // If this is performed from an SPA we unset the initial referrer data.
      if (isPushState) {
        delete payload.source;
      }

      // Send our data as a post request containing plaintext to avoid the
      // CORS roundtrip that would occur for sending JSON.
      let request = new XMLHttpRequest();
      request.open("POST", endpoint + "post", true);
      request.setRequestHeader("Content-Type", "text/plain; charset=UTF-8");
      request.send(JSON.stringify(payload));
    },
    /**
     * Update the scrollposition for the current pageview.
     */
    updateScrollPos: () => {
      // Calculate the number of pixels that can be scrolled. This is the total
      // length of the document minus what the user sees in the viewport at 0.
      const scrollRange = (window.document.documentElement.scrollHeight - window.document.documentElement.clientHeight);
      // Calculate how far the user has scrolled.
      const scrollOffset = (window.document.documentElement.scrollTop + window.document.body.scrollTop);
      // Calculate how far the user scrolled relative to the total scroll
      // length.
      const currentScrollPos = scrollOffset / scrollRange * 100;

      // Only store the farthest the user has gone down a page.
      scrollPos = Math.max(0, scrollPos, currentScrollPos);
    }
  }
}

function trackRequest(window, endpoint) {
  // If we're not running in a browser there's nothing to be done.
  if (!window) return;

  // Make a simple function that won't cause errors if the console is not
  // available.
  const warn = console && console.warn ? message => console.warn("Analytics: " + message) : _message => null;

  // Don't track when the user requests us not to do so.
  if (typeof window.navigator.doNotTrack !== "undefined" && window.navigator.doNotTrack === "1") {
    return warn("Not tracking request due to do not track request");
  }

  // Don't track on localhost.
  if (window.location.hostname === "localhost" || window.location.protocol === "file:") {
    return warn("Not tracking request from localhost ");
  }

  // Filter out any bots we're already sure about before sending them to our
  // tracking server.
  if (!window.navigator.userAgent || window.navigator.userAgent.search(/(bot|crawl|spider)/gi) > -1) {
    return warn("Not tracking request from bots");
  }

  try {
    const {lightBeacon, pageview, updateScrollPos} = createTracker(window, endpoint);

    // Safari on iOS < 13 has issues with the Beacon API so we don't use it there.
    if (typeof window.navigator.sendBeacon !== "undefined" &&
      /ip(hone|ad)(.*)os\s([1-9]|1[0-2])_/i.test(window.navigator.userAgent) === false) {
      // Use pagehide if the browser supports it, unload otherwise.
      // See: https://webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/
      window.addEventListener(
        "onpagehide" in window ? "pagehide" : "unload",
        lightBeacon(),
        false
      );
    }

    // Set up tracking for navigations or Single-Page Applications (SPA). This
    // ensures the script works with things like Gatsby and Next.js.
    // This only works if the browser supports pushState.
    if (window.history && window.history.pushState) {
      // Monkeypatch the push state function to also trigger a pageview.
      const ps = window.history.pushState;
      window.history.pushState = function () {
        // Forward our calling context and arguments to the original pushState.
        const ret = ps.apply(this, arguments);
        pageview(1);
        // Return the original value.
        return ret;
      };
      // Also register pageviews when the page goes back.
      window.onpopstate = function () {
        pageview(1);
      }
    }

    // Set up tracking of the scroll position. This can tell us how far the user
    // has read through articles or viewed landing pages.
    window.addEventListener("scroll", updateScrollPos, false);

    // After everything is set-up, record the initial pageview.
    pageview();
  }
  // If there is an error in any of our Javascript tracker then we fall back to
  // tracking by asking the browser to load an image for us.
  catch (e) {
    warn(e.message);
    // If available, we  include the error message for debugging.
    new Image().src = endpoint + "/image.gif" + (e.message ? "?error=" + encodeURIComponent(e.message) : "");
  }
}

export default trackRequest;
