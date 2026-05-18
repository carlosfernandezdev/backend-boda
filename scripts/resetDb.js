/**
 * Reset completo de la DB + bootstrap de usuarios para probar desde cero.
 *
 * Qué hace:
 *   1. Pide confirmación (a menos que pases --force)
 *   2. Dropea todas las tablas, types y funciones
 *   3. Aplica schema.sql (estructura + seeds: roles, permisos, etapas)
 *   4. Crea usuarios bootstrap para los 3 roles
 *
 * Uso:
 *   node scripts/resetDb.js              # interactivo (pide y/N)
 *   node scripts/resetDb.js --force      # sin confirmación
 *   npm run db:reset                     # vía npm script
 *
 * ⚠️  BORRA TODOS LOS DATOS. No usar en producción.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { pool, closePool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';
import { env } from '../src/config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(__dirname, '..', 'db');

// Usuarios que se crean automáticamente. Editá esto si querés otros.
const USUARIOS_BOOTSTRAP = [
  { correo: 'admin@boda.com',    contrasena: 'AdminPass123',    rol: 'admin',    nombre: 'Valeria'   },
  { correo: 'guille@boda.com',   contrasena: 'NovioPass123',    rol: 'novio',    nombre: 'Guillermo' },
  { correo: 'janeric@boda.com',  contrasena: 'NovioPass123',    rol: 'novio',    nombre: 'Janeric'   },
  { correo: 'invitado@test.com', contrasena: 'InvitadoPass123', rol: 'invitado', nombre: 'Invitado de prueba' },
];

const confirmar = async () => {
  if (process.argv.includes('--force') || process.argv.includes('-f')) {
    return true;
  }
  const rl = readline.createInterface({ input, output });
  const resp = await rl.question(
    `⚠️  Esto borra TODOS los datos de '${env.DB_NAME}' en ${env.DB_HOST}:${env.DB_PORT}.\n` +
    `   Escribí "si" para continuar: `
  );
  rl.close();
  return resp.trim().toLowerCase() === 'si';
};

const aplicarSqlFile = async (filename) => {
  const path = join(DB_DIR, filename);
  const sql = await readFile(path, 'utf-8');
  await pool.query(sql);
};

const crearUsuario = async ({ correo, contrasena, rol, nombre }) => {
  const hash = await hashPassword(contrasena);
  await pool.query(
    `INSERT INTO usuarios (correo, nombre, contrasena_hash, rol_id)
     VALUES ($1, $2, $3, (SELECT id FROM roles WHERE nombre = $4))`,
    [correo, nombre, hash, rol]
  );
};

const main = async () => {
  const ok = await confirmar();
  if (!ok) {
    console.log('Cancelado.');
    return;
  }

  console.log('');
  console.log(`Conectado a: ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  console.log('');

  console.log('🔥 Drop de tablas, types y funciones...');
  await aplicarSqlFile('reset.sql');

  console.log('📦 Aplicando schema (estructura + seeds)...');
  await aplicarSqlFile('schema.sql');

  console.log('👤 Creando usuarios bootstrap...');
  for (const u of USUARIOS_BOOTSTRAP) {
    await crearUsuario(u);
    console.log(`   ✓ ${u.correo}  (${u.rol})`);
  }

  console.log('');
  console.log('✓ Reset completo. Credenciales de prueba:');
  console.log('');
  console.log('   ROL         CORREO                      CONTRASEÑA');
  console.log('   ─────────── ─────────────────────────── ──────────────────');
  for (const u of USUARIOS_BOOTSTRAP) {
    console.log(`   ${u.rol.padEnd(11)} ${u.correo.padEnd(27)} ${u.contrasena}`);
  }
  console.log('');
  console.log('Listo para correr las colecciones de Postman.');
};

main()
  .catch((err) => {
    console.error('');
    console.error('✗ Error durante el reset:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   → Postgres no está corriendo o las credenciales del .env están mal.');
    } else if (err.code === '3D000') {
      console.error(`   → La base de datos '${env.DB_NAME}' no existe. Creala primero:`);
      console.error(`     createdb ${env.DB_NAME}`);
    }
    process.exit(1);
  })
  .finally(() => closePool());
