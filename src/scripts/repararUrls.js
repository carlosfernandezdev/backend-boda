/**
 * Diagnostica y repara las URLs de archivos en la DB.
 *
 * El síntoma: URLs sin la barra entre el dominio y la key, tipo
 *   https://pub-xxxx.r2.devimagenes/2026/...   (MAL)
 * en vez de
 *   https://pub-xxxx.r2.dev/imagenes/2026/...  (BIEN)
 *
 * Causa típica: R2_PUBLIC_URL con un salto de línea o espacio invisible,
 * o URLs guardadas antes de un fix.
 *
 * Uso:
 *   node scripts/repararUrls.js          # solo diagnostica (dry-run)
 *   node scripts/repararUrls.js --fix    # repara las URLs rotas
 */
import { pool, closePool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const FIX = process.argv.includes('--fix');

const main = async () => {
  // 1. Mostrar la R2_PUBLIC_URL tal como se cargó, para detectar basura invisible
  console.log('R2_PUBLIC_URL cargada:', JSON.stringify(env.R2_PUBLIC_URL));
  console.log('   Longitud:', env.R2_PUBLIC_URL.length);
  console.log('   ¿Termina en barra?:', env.R2_PUBLIC_URL.endsWith('/'));
  console.log('');

  const base = env.R2_PUBLIC_URL.trim().replace(/\/$/, '');

  // 2. Buscar archivos cuya URL no tenga la barra correcta después del dominio
  const { rows } = await pool.query(
    `SELECT id, url, r2_key FROM archivos ORDER BY created_at DESC`
  );

  console.log(`Archivos en la DB: ${rows.length}`);
  console.log('');

  const rotos = [];
  for (const row of rows) {
    const urlCorrecta = `${base}/${row.r2_key}`;
    if (row.url !== urlCorrecta) {
      rotos.push({ id: row.id, actual: row.url, correcta: urlCorrecta });
    }
  }

  if (rotos.length === 0) {
    console.log('✅ Todas las URLs están bien. No hay nada que reparar.');
    return;
  }

  console.log(`⚠️  ${rotos.length} URL(s) con problemas:`);
  for (const r of rotos.slice(0, 5)) {
    console.log('');
    console.log('   id:      ', r.id);
    console.log('   actual:  ', r.actual);
    console.log('   correcta:', r.correcta);
  }
  if (rotos.length > 5) console.log(`   ... y ${rotos.length - 5} más`);
  console.log('');

  if (!FIX) {
    console.log('Esto es un dry-run. Para reparar, corré:');
    console.log('   node scripts/repararUrls.js --fix');
    return;
  }

  // 3. Reparar
  console.log('🔧 Reparando...');
  for (const r of rotos) {
    await pool.query('UPDATE archivos SET url = $1 WHERE id = $2', [
      r.correcta,
      r.id,
    ]);
  }
  console.log(`✅ ${rotos.length} URL(s) reparada(s).`);
};

main()
  .catch((err) => {
    console.error('✗ Error:', err.message);
    process.exit(1);
  })
  .finally(() => closePool());
