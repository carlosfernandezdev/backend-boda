/**
 * Test rápido del servicio de metadata sobre archivos locales.
 * Útil para verificar que exifr/ffprobe extraen bien la fecha de captura
 * antes de probar el flujo completo.
 *
 * Uso:
 *   node scripts/testMetadata.js <ruta-a-imagen-o-video>
 *
 * Ejemplos:
 *   node scripts/testMetadata.js ~/Pictures/foto.jpg
 *   node scripts/testMetadata.js ~/Movies/video.mp4
 */
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';

import { MetadataService } from '../services/metadataService.js';

const EXT_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tiff', '.tif']);
const EXT_VIDEO = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']);

const MIME_POR_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.heic': 'image/heic', '.heif': 'image/heif',
  '.webp': 'image/webp', '.tiff': 'image/tiff', '.tif': 'image/tiff',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.webm': 'video/webm', '.m4v': 'video/mp4',
};

const detectarTipo = (path) => {
  const ext = extname(path).toLowerCase();
  if (EXT_IMAGEN.has(ext)) return { tipo: 'imagen', mimeType: MIME_POR_EXT[ext] };
  if (EXT_VIDEO.has(ext))  return { tipo: 'video',  mimeType: MIME_POR_EXT[ext] };
  return null;
};

const main = async () => {
  const path = process.argv[2];
  if (!path) {
    console.error('Uso: node scripts/testMetadata.js <ruta-a-archivo>');
    process.exit(1);
  }

  const detectado = detectarTipo(path);
  if (!detectado) {
    console.error(`✗ Extensión no soportada: ${extname(path)}`);
    console.error('  Imagenes: .jpg .jpeg .png .heic .webp .tiff');
    console.error('  Videos:   .mp4 .mov .avi .mkv .webm');
    process.exit(1);
  }

  console.log(`📄 Archivo: ${basename(path)}`);
  console.log(`   Tipo:    ${detectado.tipo}`);
  console.log(`   Mime:    ${detectado.mimeType}`);
  console.log('');

  const buffer = await readFile(path);
  console.log(`   Tamaño:  ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  console.log('🔍 Extrayendo metadata...');
  const { tomada_en, metadata } = await MetadataService.extraer({
    buffer,
    tipo: detectado.tipo,
    mimeType: detectado.mimeType,
  });

  console.log('');
  console.log('Resultado:');
  console.log('  tomada_en:', tomada_en ? tomada_en.toISOString() : 'null (sin metadata)');
  console.log('  metadata:');
  console.log(JSON.stringify(metadata, null, 2).split('\n').map((l) => '    ' + l).join('\n'));
};

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
