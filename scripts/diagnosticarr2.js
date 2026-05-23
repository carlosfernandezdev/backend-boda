/**
 * Diagnóstico de Cloudflare R2.
 * Verifica que los objetos se hayan subido y que la URL pública los sirva.
 *
 * Uso:
 *   node scripts/diagnosticarR2.js
 */
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../src/config/r2.js';

const main = async () => {
  console.log('🔍 Diagnóstico de R2');
  console.log('   Bucket:     ', R2_BUCKET);
  console.log('   Public URL: ', R2_PUBLIC_URL);
  console.log('');

  // 1. ¿Se subieron objetos?
  console.log('1️⃣  Listando objetos del bucket...');
  let objetos = [];
  try {
    const list = await r2Client.send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 })
    );
    objetos = list.Contents || [];
  } catch (err) {
    console.log('   ✗ No se pudo listar el bucket:', err.message);
    console.log('     → Revisá credenciales (R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY) y el nombre del bucket.');
    process.exit(1);
  }

  if (objetos.length === 0) {
    console.log('   ⚠️  El bucket está vacío. ¿Subiste algo? ¿Es el bucket correcto?');
    process.exit(0);
  }

  console.log(`   ✓ ${objetos.length} objeto(s) (mostrando hasta 5):`);
  for (const obj of objetos) {
    console.log(`      • ${obj.Key}  (${obj.Size} bytes)`);
  }
  console.log('');

  // 2. ¿La URL pública sirve el objeto?
  const key = objetos[0].Key;
  const url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  console.log('2️⃣  Probando acceso público al primer objeto...');
  console.log('   GET', url);

  try {
    const res = await fetch(url);
    console.log('   Status:', res.status, res.statusText);
    console.log('   Content-Type:', res.headers.get('content-type'));
    console.log('');

    if (res.ok) {
      console.log('   ✅ El objeto es accesible. La URL pública funciona.');
      console.log('      Si igual no se ve en el navegador, es un problema del frontend (revisá la consola).');
    } else if (res.status === 401 || res.status === 403) {
      console.log('   ❌ Acceso denegado (el bucket NO es público).');
      console.log('      → Cloudflare → R2 → bucket "' + R2_BUCKET + '" → Settings');
      console.log('      → sección "Public Development URL" → Enable / Allow Access');
    } else if (res.status === 404) {
      console.log('   ❌ 404 Not Found.');
      console.log('      La R2_PUBLIC_URL no apunta a este bucket, o el hash pub-XXXX está mal copiado.');
      console.log('      → Verificá que la URL coincida con la que muestra el dashboard al habilitar el público.');
    } else {
      console.log('   ❌ Status inesperado. Revisá la config del bucket.');
    }
  } catch (err) {
    console.log('   ✗ Error de red al pedir la URL pública:', err.message);
  }
};

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});