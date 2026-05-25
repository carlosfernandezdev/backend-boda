/**
 * Backfill de thumbnails para los videos ya subidos.
 *
 * Versión robusta: imprime desde el primer instante, verifica que ffmpeg y
 * ffprobe existan antes de empezar, y reporta cada error con detalle.
 *
 * Uso (desde la raíz del backend):
 *   node src/scripts/backfillThumbnails.js
 *
 * Si tu carpeta de código NO es `src/`, ajusta los 4 imports de abajo.
 */

// Log inmediato: si no ves esta línea, el archivo no se está ejecutando
// (comando equivocado o ruta incorrecta).
console.log('=== Backfill de thumbnails: iniciando ===');

import { existsSync } from 'node:fs';
import { GetObjectCommand } from '@aws-sdk/client-s3';

let query, closePool, r2Client, R2_BUCKET, R2Service, ThumbnailService;
let ffmpegStatic, ffprobeInstaller;

try {
  ({ query, closePool } = await import('../config/db.js'));
  ({ r2Client, R2_BUCKET } = await import('../config/r2.js'));
  ({ R2Service } = await import('../services/r2Service.js'));
  ({ ThumbnailService } = await import('../services/thumbnailService.js'));
  ffmpegStatic = (await import('ffmpeg-static')).default;
  ffprobeInstaller = await import('@ffprobe-installer/ffprobe');
} catch (err) {
  console.error('\n✗ Error importando dependencias:');
  console.error(`  ${err.message}`);
  console.error(
    '\n  Revisa que las rutas de import coincidan con tu estructura\n' +
      '  (¿es src/config, src/services?) y que ffmpeg-static esté instalado:\n' +
      '    npm install ffmpeg-static\n'
  );
  process.exit(1);
}

/**
 * Verifica que los binarios existan físicamente antes de procesar.
 */
const verificarBinarios = () => {
  const ffmpegPath = ffmpegStatic;
  const ffprobePath = ffprobeInstaller.path;

  console.log(`ffmpeg:  ${ffmpegPath || '(no encontrado)'}`);
  console.log(`ffprobe: ${ffprobePath || '(no encontrado)'}`);

  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    throw new Error(
      'Binario de ffmpeg no encontrado. Corre: npm install ffmpeg-static'
    );
  }
  if (!ffprobePath || !existsSync(ffprobePath)) {
    throw new Error(
      'Binario de ffprobe no encontrado. Revisa @ffprobe-installer/ffprobe'
    );
  }
};

/**
 * Lee un objeto de R2 a Buffer.
 */
const leerDeR2 = async (key) => {
  const res = await r2Client.send(
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
  );
  const chunks = [];
  for await (const chunk of res.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

async function main() {
  verificarBinarios();

  console.log('\nBuscando videos sin thumbnail…');

  const { rows } = await query(
    `SELECT id, r2_key, mime_type, tomada_en
       FROM archivos
      WHERE tipo = 'video'
        AND (thumbnail_url IS NULL OR thumbnail_url = '')`
  );

  console.log(`Encontrados: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('Nada que procesar. Todos los videos ya tienen thumbnail.');
    await closePool();
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const v of rows) {
    try {
      console.log(`→ ${v.id} (${v.r2_key})`);

      const buffer = await leerDeR2(v.r2_key);
      console.log(`  · descargado de R2 (${buffer.length} bytes)`);

      const thumbBuffer = await ThumbnailService.generar({
        buffer,
        mimeType: v.mime_type,
      });

      if (!thumbBuffer) {
        console.warn(`  ✗ no se pudo extraer frame del video`);
        fail++;
        continue;
      }

      const thumb = await R2Service.upload({
        buffer: thumbBuffer,
        tipo: 'imagen',
        nombreOriginal: 'thumbnail.jpg',
        mimeType: 'image/jpeg',
        fecha: v.tomada_en ? new Date(v.tomada_en) : new Date(),
      });

      await query(
        `UPDATE archivos
            SET thumbnail_url = $1, thumbnail_r2_key = $2
          WHERE id = $3`,
        [thumb.url, thumb.key, v.id]
      );

      console.log(`  ✓ thumbnail listo`);
      ok++;
    } catch (err) {
      console.error(`  ✗ error: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n=== Terminado. OK: ${ok} · Fallidos: ${fail} ===`);
  await closePool();
}

main().catch(async (err) => {
  console.error('\n✗ Backfill falló:', err.message);
  try {
    if (closePool) await closePool();
  } catch {
    /* no-op */
  }
  process.exit(1);
});