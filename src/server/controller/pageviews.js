import { fetch } from '../store';

const pageviews = {
  method: 'GET',
  path: '/pageviews',
  handler: async function (request, h) {
    return fetch();
  },
  options: {
    auth: 'simple',
    cors: {
      origin: ['http://localhost', 'http://localhost:8000', 'https://*.alexandervarwijk.com', 'http://*.alexandervarwijk.localhost'],
      credentials: true,
    },
  },
};

export {
  pageviews,
}
