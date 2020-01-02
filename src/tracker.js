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
}

export default tracker;
