import { UsuarioDAO } from '../dao/UsuarioDAO.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors.js';

const ROL_REGISTRO_PUBLICO = 'invitado';

export const AuthBO = {
  /**
   * Registra un nuevo usuario. Siempre con rol 'invitado'.
   * Promociones a admin/novio se hacen vía endpoint admin-only o vía script CLI.
   */
  async register({ correo, nombre, contrasena }) {
    if (await UsuarioDAO.existsByCorreo(correo)) {
      throw new ConflictError('Ya existe un usuario con ese correo');
    }

    const rol = await UsuarioDAO.findRolByNombre(ROL_REGISTRO_PUBLICO);
    if (!rol) {
      // Esto solo pasa si no se corrió el seed
      throw new NotFoundError(`Rol '${ROL_REGISTRO_PUBLICO}'`);
    }

    const contrasena_hash = await hashPassword(contrasena);
    const usuario = await UsuarioDAO.crear({
      correo,
      nombre,
      contrasena_hash,
      rol_id: rol.id,
    });

    const token = signToken({
      id: usuario.id,
      correo: usuario.correo,
      rol_id: usuario.rol_id,
    });

    return {
      usuario: { ...usuario, rol_nombre: rol.nombre },
      token,
    };
  },

  /**
   * Login por correo + contraseña.
   * Usa un mensaje genérico ("Credenciales inválidas") para no filtrar
   * si el correo existe o no.
   */
  async login({ correo, contrasena }) {
    const usuario = await UsuarioDAO.findByCorreoConPassword(correo);
    if (!usuario) {
      throw new UnauthorizedError('Credenciales inválidas');
    }
    if (!usuario.activo) {
      throw new UnauthorizedError('Usuario inactivo. Contactá al administrador.');
    }

    const passOk = await verifyPassword(contrasena, usuario.contrasena_hash);
    if (!passOk) {
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const token = signToken({
      id: usuario.id,
      correo: usuario.correo,
      rol_id: usuario.rol_id,
    });

    delete usuario.contrasena_hash;
    return { usuario, token };
  },

  /**
   * Trae el usuario actual con permisos. Para GET /auth/me.
   */
  async getMe(id) {
    const usuario = await UsuarioDAO.findByIdConPermisos(id);
    if (!usuario) {
      throw new NotFoundError('Usuario');
    }
    return usuario;
  },
};
