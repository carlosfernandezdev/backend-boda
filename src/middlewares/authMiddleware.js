import { verifyToken } from '../utils/jwt.js';
import { UsuarioDAO } from '../dao/UsuarioDAO.js';
import { UnauthorizedError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Valida el header `Authorization: Bearer <token>`, decodifica el JWT,
 * y carga el usuario fresco desde la DB (con sus permisos) en req.user.
 *
 * Cargar fresco en cada request asegura que cambios de rol o desactivación
 * tengan efecto inmediato sin esperar a que expire el token.
 */
export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Falta header Authorization Bearer');
  }
  const token = header.slice(7).trim();
  if (!token) {
    throw new UnauthorizedError('Token vacío');
  }

  const payload = verifyToken(token);

  const usuario = await UsuarioDAO.findByIdConPermisos(payload.id);
  if (!usuario) {
    throw new UnauthorizedError('Usuario no encontrado o inactivo');
  }

  req.user = usuario;
  next();
});
