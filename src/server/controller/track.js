import Joi from '@hapi/joi';

export default {
  method: 'POST',
  path: '/post',
  handler: async function (request, h) {
    console.dir(request.payload);
    if (request.headers.dnt && request.headers.dnt === "1") {
      return "Tracking skipped due to Do Not Track header";
    }

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
            scroll: Joi.number().integer().min(0).required()
          })
        ) ,
        time: Joi.date().timestamp('unix').required()
      })
    }
  }
};
