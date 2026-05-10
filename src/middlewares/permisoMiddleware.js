import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

/**
 * Factory de middleware que valida que req.user tenga el permiso indicado.
 * SIEMPRE va después de authMiddleware.
 *
 * Uso:
 *   router.delete('/:id',
 *     authMiddleware,
 *     requirePermiso('usuarios.eliminar'),
 *     controller.eliminar);
 */
export const requirePermiso = (permiso) => (req, _res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (!req.user.permisos.includes(permiso)) {
    return next(new ForbiddenError(`Falta el permiso: ${permiso}`));
  }
  next();
};

/**
 * Variante: requiere AL MENOS UNO de los permisos pasados.
 * Útil cuando una acción es válida con permisos distintos según contexto
 * (ej: editar el archivo propio vs cualquier archivo).
 *
 * Uso:
 *   requireAlgunPermiso('archivos.editar_propio', 'archivos.editar_todos')
 *
 * La verificación final de ownership se hace en el BO.
 */
export const requireAlgunPermiso = (...permisos) => (req, _res, next) => {
  if (!req.user) return next(new UnauthorizedError());
  const tiene = permisos.some((p) => req.user.permisos.includes(p));
  if (!tiene) {
    return next(
      new ForbiddenError(`Falta alguno de los permisos: ${permisos.join(', ')}`)
    );
  }
  next();
};
