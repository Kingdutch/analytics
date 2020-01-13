require('dotenv').config();
import Hapi from '@hapi/hapi';
import Basic from '@hapi/basic';
import Bcrypt from 'bcrypt';
import { track, fallback } from './controller/track';
import { pageviews } from "./controller/pageviews";

const {
  PORT = 3000,
  HOST = '0.0.0.0',
  STATISTICS_USER,
  STATISTICS_PASS,
} = process.env;

const validate = async (request, username, password) => {
  if (username !== STATISTICS_USER) {
    return { credentials: null, isValid: false };
  }

  const isValid = await Bcrypt.compare(password, STATISTICS_PASS);
  const credentials = { id: 1, name: STATISTICS_USER };

  return { isValid, credentials };
};

const init = async () => {
  const server = Hapi.server({
    port: PORT,
    host: HOST,
  });

  await server.register(Basic);
  server.auth.strategy('simple', 'basic', { validate });

  server.route(track);
  server.route(fallback);
  server.route(pageviews);

  await server.start();
  console.log(`Server running on http://${HOST}`);
};

process.on('unhandledRejection', (err) => {

  console.log(err);
  process.exit(1);
});

init();
