import { fetch } from '../store';

const pageviews = {
  method: 'GET',
  path: '/pageviews',
  handler: async function (request, h) {
    return fetch();
  },
  options: {
    auth: 'simple'
  },
};

export {
  pageviews,
}
