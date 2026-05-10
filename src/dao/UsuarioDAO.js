import { query } from '../config/db.js';

export const UsuarioDAO = {
  /**
   * Busca un usuario por correo INCLUYENDO el hash. Solo para login.
   */
  async findByCorreoConPassword(correo) {
    const sql = `
      SELECT u.id, u.correo, u.nombre, u.contrasena_hash,
             u.rol_id, u.activo, u.created_at, u.updated_at,
             r.nombre AS rol_nombre
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      WHERE u.correo = $1
      LIMIT 1
    `;
    const { rows } = await query(sql, [correo]);
    return rows[0] || null;
  },

  /**
   * Existe un usuario con ese correo? (para evitar duplicados en register)
   */
  async existsByCorreo(correo) {
    const { rows } = await query(
      'SELECT 1 FROM usuarios WHERE correo = $1 LIMIT 1',
      [correo]
    );
    return rows.length > 0;
  },

  /**
   * Busca usuario por id incluyendo su rol y permisos.
   * Usado por authMiddleware para hidratar req.user en cada request.
   */
  async findByIdConPermisos(id) {
    const sql = `
      SELECT u.id, u.correo, u.nombre, u.rol_id, u.activo,
             u.created_at, u.updated_at,
             r.nombre AS rol_nombre,
             COALESCE(
               ARRAY_AGG(p.nombre) FILTER (WHERE p.nombre IS NOT NULL),
               ARRAY[]::TEXT[]
             ) AS permisos
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
      LEFT JOIN permisos p ON p.id = rp.permiso_id
      WHERE u.id = $1 AND u.activo = TRUE
      GROUP BY u.id, r.nombre
      LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  },

  /**
   * Busca rol por nombre (ej: 'admin', 'novio', 'invitado').
   */
  async findRolByNombre(nombre) {
    const { rows } = await query(
      'SELECT id, nombre FROM roles WHERE nombre = $1 LIMIT 1',
      [nombre]
    );
    return rows[0] || null;
  },

  /**
   * Inserta un nuevo usuario. Devuelve el row sin el hash.
   */
  async crear({ correo, nombre, contrasena_hash, rol_id }) {
    const sql = `
      INSERT INTO usuarios (correo, nombre, contrasena_hash, rol_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, correo, nombre, rol_id, activo, created_at, updated_at
    `;
    const { rows } = await query(sql, [correo, nombre, contrasena_hash, rol_id]);
    return rows[0];
  },
};
