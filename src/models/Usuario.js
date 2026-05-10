/**
 * Convierte una fila cruda de la DB en un objeto seguro para devolver al cliente.
 * Nunca incluye contrasena_hash.
 */
export const toUsuarioPublico = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    correo: row.correo,
    nombre: row.nombre,
    rol_id: row.rol_id,
    rol_nombre: row.rol_nombre || null,
    activo: row.activo ?? true,
    permisos: row.permisos || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};
