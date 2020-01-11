import Hapi from '@hapi/hapi';
import track from './controller/track';

const {
  PORT = 3000,
  DB_HOST,
  DB_NAME,
  DB_USER,
  DB_PASS,
} = process.env;

const init = async () => {
  const server = Hapi.server({
    port: PORT,
    host: '0.0.0.0'
  });

  server.route(track);

  await server.start();
  console.log('Server running on http://visit.alexandervarwijk.localhost');
};

process.on('unhandledRejection', (err) => {

  console.log(err);
  process.exit(1);
});

init();
