import multer from 'multer';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Whitelist de mime types aceptados.
 * Si querés permitir más formatos (HEIC, etc) agregalos acá.
 */
const MIMES_PERMITIDOS = new Set([
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  // Videos
  'video/mp4',
  'video/quicktime',  // .mov
  'video/x-matroska', // .mkv
  'video/webm',
]);

const fileFilter = (_req, file, cb) => {
  if (MIMES_PERMITIDOS.has(file.mimetype)) {
    return cb(null, true);
  }
  cb(new ValidationError(`Tipo de archivo no permitido: ${file.mimetype}`));
};

export const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter,
}).single('archivo');

/**
 * Wrapper que traduce errores de multer a nuestro formato.
 * Multer lanza errores con propiedades raras (MulterError); los mapeamos a ValidationError.
 */
export const handleUpload = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ValidationError(
          `Archivo demasiado grande. Máximo permitido: ${env.UPLOAD_MAX_FILE_SIZE_MB} MB`
        )
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('Solo se permite un archivo por request, en el campo "archivo"'));
    }
    if (err instanceof ValidationError) {
      return next(err);
    }
    next(err);
  });
};
