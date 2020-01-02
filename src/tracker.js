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
  if (!nav.userAgent || nav.userAgent.search(/(bot|spider|crawl)/gi) > -1) {
    return warn("Not tracking request from bots");
  }
}

export default tracker;
