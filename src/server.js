import { app } from './app.js';
import { env } from './config/env.js';
import { closePool } from './config/db.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server escuchando en http://localhost:${env.PORT}`);
  console.log(`   Entorno: ${env.NODE_ENV}`);
});

/**
 * Shutdown gracioso: cuando recibe SIGINT/SIGTERM cierra el server HTTP
 * y luego el pool de Postgres antes de salir.
 */
const shutdown = async (signal) => {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    try {
      await closePool();
      console.log('Pool de DB cerrado. Bye 👋');
      process.exit(0);
    } catch (err) {
      console.error('Error cerrando el pool:', err);
      process.exit(1);
    }
  });

  // Si en 10s no cerró, forzar
  setTimeout(() => {
    console.error('Timeout de shutdown, forzando salida.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
