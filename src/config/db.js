import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  // Neon entrega un único connection string. Usa el endpoint "-pooler"
  // (PgBouncer) para que el pool de la app no agote las conexiones de Neon.
  connectionString: env.DATABASE_URL,
  // Neon exige conexión cifrada.
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // un poco más alto: Neon puede tardar al "despertar"
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente PG idle:', err);
});

/**
 * Helper para queries simples.
 * Uso: const { rows } = await query('SELECT * FROM usuarios WHERE id = $1', [id]);
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Helper para transacciones.
 * Uso:
 *   await withTransaction(async (client) => {
 *     await client.query(...);
 *     await client.query(...);
 *   });
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const closePool = async () => {
  await pool.end();
};