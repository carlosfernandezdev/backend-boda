import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

/**
 * 404 handler: cualquier ruta que no matchee se cae acá.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
};

/**
 * Error handler central. Tiene que ir AL FINAL del stack de middlewares.
 * Traduce AppError -> respuesta HTTP estructurada.
 * Para errores no controlados loguea y devuelve 500.
 */
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Errores de Postgres con violación de unique
  if (err.code === '23505') {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Ya existe un registro con esos datos',
      },
    });
  }

  console.error('Error no manejado:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
