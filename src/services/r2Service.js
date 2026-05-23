import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'node:path';

import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../config/r2.js';
import { AppError } from '../utils/errors.js';

/**
 * Construye la key del objeto en R2.
 * Formato: <imagenes|videos>/YYYY/MM/DD/<uuid>.<ext>
 *
 * Ventajas:
 *  - Está ordenado por fecha en el bucket (útil para auditar/limpiar).
 *  - Sin colisiones (UUID).
 *  - Permite borrar un día entero con prefix delete.
 *
 * @param {Object} params
 * @param {'imagen'|'video'} params.tipo
 * @param {string} params.nombreOriginal - nombre del archivo subido por el usuario (para sacar la extensión)
 * @param {Date} params.fecha - fecha de captura o NOW como fallback
 */
const construirKey = ({ tipo, nombreOriginal, fecha }) => {
  const folder = tipo === 'imagen' ? 'imagenes' : 'videos';
  const year = fecha.getUTCFullYear();
  const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const day = String(fecha.getUTCDate()).padStart(2, '0');
  const ext = (extname(nombreOriginal) || '').toLowerCase();
  const uuid = uuidv4();
  return `${folder}/${year}/${month}/${day}/${uuid}${ext}`;
};

export const R2Service = {
  /**
   * Sube un buffer a R2 y devuelve la URL pública + la key.
   * La key se usa después para borrar; la URL pública para servir al frontend.
   */
  async upload({ buffer, tipo, nombreOriginal, mimeType, fecha }) {
    const key = construirKey({
      tipo,
      nombreOriginal,
      fecha: fecha || new Date(),
    });

    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          // Cache largo: los objetos son inmutables (UUID en el nombre)
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    } catch (err) {
      throw new AppError(
        `Error subiendo archivo a R2: ${err.message}`,
        502,
        'R2_UPLOAD_FAILED'
      );
    }

    return {
      key,
      url: `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`,
    };
  },

  /**
   * Borra un objeto del bucket por su key.
   * No tira error si el objeto no existe (idempotente).
   */
  async eliminar(key) {
    if (!key) return;

    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
        })
      );
    } catch (err) {
      // No frenamos el flujo de delete por un fallo en R2. Logueamos para investigar.
      // El BO decide si tira error o no.
      throw new AppError(
        `Error eliminando archivo de R2: ${err.message}`,
        502,
        'R2_DELETE_FAILED'
      );
    }
  },
};
