import exifr from 'exifr';
import ffmpeg from 'fluent-ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import { fromZonedTime } from 'date-fns-tz';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';

// Configurar fluent-ffmpeg para usar el binario empaquetado
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Parsea fechas tipo "2026:06:20 22:30:00" (formato EXIF) o
 * "2026-06-20T22:30:00" (ISO sin TZ) en la zona horaria de la boda.
 *
 * Si la string viene CON timezone (Z o +/-HH:MM), respetamos esa.
 * Si viene sin timezone, asumimos que está en WEDDING_TIMEZONE.
 */
const parsearFechaLocal = (raw) => {
  if (!raw) return null;

  // exifr a veces devuelve Date directo
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw !== 'string') return null;

  // EXIF usa "YYYY:MM:DD HH:MM:SS" → normalizamos a ISO básico
  const normalizado = raw
    .replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    .replace(' ', 'T');

  // Tiene timezone explícito (Z, +HH:MM, -HH:MM)?
  const tieneTZ = /(Z|[+-]\d{2}:?\d{2})$/.test(normalizado);

  if (tieneTZ) {
    const d = new Date(normalizado);
    return isNaN(d.getTime()) ? null : d;
  }

  // Sin TZ: interpretar en la zona de la boda
  try {
    const d = fromZonedTime(normalizado, env.WEDDING_TIMEZONE);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

/**
 * Extrae fecha de captura y metadata cruda de una IMAGEN.
 * Tolera errores: si no hay EXIF, devuelve { tomada_en: null, metadata: null }.
 */
const extraerDeImagen = async (buffer) => {
  try {
    // Sin `pick`: exifr decide los campos óptimos y maneja correctamente
    //   - GPS con signos (combina latitude/longitude con LatitudeRef/LongitudeRef)
    //   - Dimensiones desde ExifImageWidth/Height o el header SOF
    // El overhead es despreciable comparado con el costo de leer el archivo.
    const exif = await exifr.parse(buffer, { gps: true });

    if (!exif) {
      return { tomada_en: null, metadata: null };
    }

    // Prioridad: DateTimeOriginal > CreateDate > ModifyDate
    const tomada_en =
      parsearFechaLocal(exif.DateTimeOriginal) ||
      parsearFechaLocal(exif.CreateDate) ||
      parsearFechaLocal(exif.ModifyDate);

    // Dimensiones: probar varias fuentes (varía según cámara/celular)
    const ancho =
      exif.ExifImageWidth || exif.ImageWidth || exif.PixelXDimension || null;
    const alto =
      exif.ExifImageHeight || exif.ImageHeight || exif.PixelYDimension || null;

    // GPS: cuando se usa `gps: true`, exifr devuelve un objeto `gps` con
    // latitude/longitude ya firmados (S es negativo, W es negativo).
    let gps = null;
    if (exif.latitude != null && exif.longitude != null) {
      gps = { lat: exif.latitude, lng: exif.longitude };
    }

    const metadata = {
      tipo: 'imagen',
      camara: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}`.trim() : null,
      ancho,
      alto,
      orientacion: exif.Orientation || null,
      gps,
      raw: {
        DateTimeOriginal: exif.DateTimeOriginal || null,
        CreateDate: exif.CreateDate || null,
        ModifyDate: exif.ModifyDate || null,
      },
    };

    return { tomada_en, metadata };
  } catch (err) {
    // EXIF inválido o ausente → no rompemos el upload
    return { tomada_en: null, metadata: { error: err.message } };
  }
};

/**
 * Extrae fecha de creación y metadata de un VIDEO.
 * fluent-ffmpeg/ffprobe necesita un archivo en disco (no acepta buffers),
 * así que escribimos a un tmpfile, leemos, y lo borramos.
 */
const extraerDeVideo = async (buffer, mimeType) => {
  // Extensión del temp file (puede afectar el parsing)
  const ext = (mimeType?.split('/')[1] || 'mp4').replace(/[^a-z0-9]/gi, '');
  const tmpPath = join(tmpdir(), `meta-${randomUUID()}.${ext}`);

  try {
    await writeFile(tmpPath, buffer);

    const data = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tmpPath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });

    // creation_time puede venir en format.tags o en stream.tags
    const formatCreationTime = data.format?.tags?.creation_time;
    const streamCreationTime = data.streams?.find((s) => s.tags?.creation_time)
      ?.tags?.creation_time;

    const tomada_en =
      parsearFechaLocal(formatCreationTime) ||
      parsearFechaLocal(streamCreationTime);

    const videoStream = data.streams?.find((s) => s.codec_type === 'video');

    const metadata = {
      tipo: 'video',
      duracion_seg: data.format?.duration ? Number(data.format.duration) : null,
      bitrate: data.format?.bit_rate ? Number(data.format.bit_rate) : null,
      ancho: videoStream?.width || null,
      alto: videoStream?.height || null,
      codec: videoStream?.codec_name || null,
      raw: {
        format_creation_time: formatCreationTime || null,
        stream_creation_time: streamCreationTime || null,
      },
    };

    return { tomada_en, metadata };
  } catch (err) {
    return { tomada_en: null, metadata: { error: err.message } };
  } finally {
    // Limpieza, incluso si algo falló
    try {
      await unlink(tmpPath);
    } catch {
      /* no-op */
    }
  }
};

export const MetadataService = {
  /**
   * Extrae { tomada_en, metadata } de cualquier archivo soportado.
   * Nunca lanza error: si no se puede leer la metadata, devuelve nulls.
   *
   * @param {Object} params
   * @param {Buffer} params.buffer
   * @param {'imagen'|'video'} params.tipo
   * @param {string} params.mimeType
   */
  async extraer({ buffer, tipo, mimeType }) {
    if (!buffer || buffer.length === 0) {
      return { tomada_en: null, metadata: null };
    }

    if (tipo === 'imagen') {
      return extraerDeImagen(buffer);
    }
    if (tipo === 'video') {
      return extraerDeVideo(buffer, mimeType);
    }
    return { tomada_en: null, metadata: null };
  },

  /**
   * Helper exportado para testing: parsea una string de fecha cruda.
   */
  _parsearFechaLocal: parsearFechaLocal,
};
