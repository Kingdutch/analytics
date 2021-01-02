import Joi from 'joi';
import { store } from '../store';

const track = {
  method: 'POST',
  path: '/post',
  handler: async function (request, h) {
    if (request.headers.dnt && request.headers.dnt === "1") {
      return "Tracking skipped due to Do Not Track header";
    }

    let payload = request.payload;

    // Mark this payload as originating from our client side code.
    payload.type = 'js-tracking';

    // Add the user agent.
    payload.agent = request.headers['user-agent'];

    store(payload);

    return "Request tracked";
  },
  options: {
    payload: {
      // Force parsing the payload as JSON. Even if it's sent as plaintext.
      // This may happen to prevent tracking blockers from blocking the request.
      override: 'application/json',
    },
    validate: {
      payload: Joi.object({
        hostname: Joi.string().required(),
        timezone: Joi.string(),
        width: Joi.number().integer().positive().required(),
        height: Joi.number().integer().positive().required(),
        source: Joi.object({
          source: Joi.string().allow(null),
          medium: Joi.string().allow(null),
          campaign: Joi.string().allow(null),
          referrer: Joi.string().allow(null),
        }),
        pageviews: Joi.array().items(
          Joi.object({
            path: Joi.string().required(),
            time: Joi.date().timestamp('unix').required(),
            timeOnPage: Joi.number().integer().min(0).required(),
            scroll: Joi.number().min(0).required()
          })
        ) ,
        time: Joi.date().timestamp('unix').required()
      })
    }
  }
};

// Allocate a single buffer with a transparent GIF once that can be send in
// every request.
const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const fallback = {
  method: 'GET',
  path: '/image.gif',
  handler: async function (request, h) {
    const response = h.response(transparentGif).type('image/gif');
    if (request.headers.dnt && request.headers.dnt === "1") {
      return response;
    }

    let page;
    try {
      // The referrer is now the page being requested.
      // If someone tried to load this directly then we don't track anything.
      if (!request.info.referrer.length) {
        return response;
      }

      page = new URL(request.info.referrer);
    }
    catch (e) {
      console.log(e);
      // For some reason we got an invalid referrer so we exit.
      return response;
    }

    // Convert the received timestamp into a date object to coincide with what
    // the Joi validator does for JavaScript tracking requests.
    const timestamp = new Date(request.info.received);

    // Construct a payload manually based on what we got from the request.
    const payload = {
      type: 'image-fallback',
      hostname: page.hostname,
      time: timestamp,
      agent: request.headers['user-agent'],
      // There's no way to know the browser size of the user.
      width: null,
      height: null,
      // Unfortunately with this method there's no way to tell where the user
      // came from.
      source: {
        source: null,
        medium: null,
        campaign: null,
      },
      // Add the single pageview that we know about.
      pageviews: [{
        path: page.pathname,
        time: timestamp,
        // We don't know anything about Time on Page or Scroll distance.
        timeOnPage: null,
        scroll: null,
      }],
    };

    store(payload);

    return response;
  },
};

export {
  fallback,
  track,
}