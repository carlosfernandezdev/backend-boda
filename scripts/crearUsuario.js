/**
 * Crea un usuario con rol específico, salteando el flujo público de register.
 * Usalo para bootstrap del admin inicial y de los novios.
 *
 * Uso:
 *   node scripts/crearUsuario.js <correo> <contrasena> <rol> [nombre]
 *
 * Ejemplos:
 *   node scripts/crearUsuario.js admin@boda.com pass1234 admin "Valeria"
 *   node scripts/crearUsuario.js guille@boda.com pass1234 novio "Guillermo"
 *   node scripts/crearUsuario.js janeric@boda.com pass1234 novio "Janeric"
 */
import { pool } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';

const [, , correo, contrasena, rol, nombre] = process.argv;

if (!correo || !contrasena || !rol) {
  console.error(
    'Uso: node scripts/crearUsuario.js <correo> <contrasena> <rol> [nombre]'
  );
  console.error('Roles válidos: admin, novio, invitado');
  process.exit(1);
}

if (!['admin', 'novio', 'invitado'].includes(rol)) {
  console.error(`✗ Rol inválido: ${rol}. Usá: admin, novio, o invitado.`);
  process.exit(1);
}

if (contrasena.length < 8) {
  console.error('✗ La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

try {
  const hash = await hashPassword(contrasena);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (correo, nombre, contrasena_hash, rol_id)
     VALUES ($1, $2, $3, (SELECT id FROM roles WHERE nombre = $4))
     RETURNING id, correo, nombre, rol_id, created_at`,
    [correo, nombre || correo.split('@')[0], hash, rol]
  );
  console.log(`✓ Usuario creado con rol '${rol}':`);
  console.log(rows[0]);
} catch (err) {
  if (err.code === '23505') {
    console.error('✗ Ya existe un usuario con ese correo.');
  } else if (err.code === '23502') {
    console.error('✗ Falta el rol en la tabla roles. ¿Corriste los seeds?');
  } else {
    console.error('✗ Error:', err.message);
  }
  process.exit(1);
} finally {
  await pool.end();
}
