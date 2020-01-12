import { config as dotenv } from 'dotenv';
import Hapi from '@hapi/hapi';
import { track, fallback } from './controller/track';

dotenv();

const {
  PORT = 3000,
  HOST = '0.0.0.0',
} = process.env;

const init = async () => {
  const server = Hapi.server({
    port: PORT,
    host: HOST,
  });

  server.route(track);
  server.route(fallback);

  await server.start();
  console.log('Server running on http://visit.alexandervarwijk.localhost');
};

process.on('unhandledRejection', (err) => {

  console.log(err);
  process.exit(1);
});

init();
