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
 * Returns a time(stamp) in milliseconds.
 *
 * @param since
 *   A timestamp that can be used to calculate the difference.
 * @return {number}
 *   The number of milliseconds offset or since the unix epoch.
 */
function time(since = 0) {
  return Date.now() - since;
}

/**
 * Returns a time(stamp) in seconds.
 *
 * @param since
 *   A timestamp that can be used to calculate the difference.
 * @return {number}
 *   The number of seconds offset or since the unix epoch.
 */
function timeInSeconds(since = 0) {
  return Math.round(time(since) / 1000);
}

function tracker(window, endpoint) {
  // If we're not running in a browser there's nothing to be done.
  if (!window) return;

  // Make a simple function that won't cause errors if the console is not
  // available.
  const warn = console && console.warn ? message => console.warn("Analytics: " + message) : _message => null;

  // Don't track when the user requests us not to do so.
  if (typeof nav.doNotTrack !== "undefined" && nav.doNotTrack === "1") {
    return warn("Not tracking request due to do not track request");
  }

  // Don't track on localhost.
  if (window.location.hostname === "localhost" || window.location.protocol === "file:") {
    return warn("Not tracking request from localhost ");
  }

  // Filter out any bots we're already sure about before sending them to our
  // tracking server.
  if (!nav.userAgent || nav.userAgent.search(/(bot|crawl|spider)/gi) > -1) {
    return warn("Not tracking request from bots");
  }

  // Allow retrieving values from the query string.
  // TODO: Possibly don't use URLSearchParams here to allow also tracking utm_
  //    prefixed strings.
  const query = parseUrlParams(document.location.search.substring(1));

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

  // Safari on iOS < 13 has issues with the Beacon API so we don't use it there.
  const useSendBeacon =
    typeof window.navigator.sendBeacon !== "undefined" &&
    /ip(hone|ad)(.*)os\s([1-9]|1[0-2])_/i.test(window.navigator.userAgent) === false;

  if (useSendBeacon) {
    window.addEventListener("unload", () => {
      // Timestamp our payload.
      payload.time = timeInSeconds();

      // Use the beacon API to submit our data to ensure navigation isn't
      // blocked while we make our request.
      window.navigator.sendBeacon(endpoint + "post", JSON.stringify(payload));
    }, false);
  }
}

export default tracker;
