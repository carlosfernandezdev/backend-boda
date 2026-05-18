/**
 * Sanitiza un row de archivos para devolver al cliente.
 * Excluye la r2_key (es info interna; el cliente solo necesita la url pública).
 */
export const toArchivoPublico = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    usuario_id: row.usuario_id,
    usuario_nombre: row.usuario_nombre || undefined,
    etapa_id: row.etapa_id,
    etapa_nombre: row.etapa_nombre || undefined,
    tipo: row.tipo,
    url: row.url,
    tamano_bytes: row.tamano_bytes,
    mime_type: row.mime_type,
    visible: row.visible,
    tomada_en: row.tomada_en,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};
