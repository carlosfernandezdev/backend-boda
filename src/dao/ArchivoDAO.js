import { query } from '../config/db.js';

/**
 * SELECT base con joins a usuarios y etapas para evitar N+1 en el listado.
 */
const SELECT_ARCHIVO = `
  SELECT a.id, a.nombre, a.usuario_id, a.etapa_id, a.tipo,
         a.url, a.r2_key, a.tamano_bytes, a.mime_type, a.visible,
         a.tomada_en, a.metadata, a.created_at, a.updated_at,
         u.nombre AS usuario_nombre,
         e.nombre AS etapa_nombre
  FROM archivos a
  JOIN usuarios u ON u.id = a.usuario_id
  LEFT JOIN etapas e ON e.id = a.etapa_id
`;

export const ArchivoDAO = {
  /**
   * Lista con filtros dinámicos y paginación.
   *
   * @param {Object} filtros
   * @param {'imagen'|'video'} [filtros.tipo]
   * @param {number} [filtros.usuario_id]
   * @param {number|'sin_etapa'} [filtros.etapa_id]
   * @param {boolean} [filtros.visible] - si undefined, no filtra
   * @param {number} filtros.page
   * @param {number} filtros.limit
   * @param {'tomada_en'|'created_at'} filtros.order
   * @param {'asc'|'desc'} filtros.dir
   */
  async listar(filtros) {
    const where = [];
    const params = [];
    let i = 1;

    if (filtros.tipo) {
      where.push(`a.tipo = $${i++}`);
      params.push(filtros.tipo);
    }
    if (filtros.usuario_id) {
      where.push(`a.usuario_id = $${i++}`);
      params.push(filtros.usuario_id);
    }
    if (filtros.etapa_id === 'sin_etapa') {
      where.push(`a.etapa_id IS NULL`);
    } else if (filtros.etapa_id) {
      where.push(`a.etapa_id = $${i++}`);
      params.push(filtros.etapa_id);
    }
    if (filtros.visible !== undefined) {
      where.push(`a.visible = $${i++}`);
      params.push(filtros.visible);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Total para metadata de paginación
    const countSql = `SELECT COUNT(*)::int AS total FROM archivos a ${whereSql}`;
    const { rows: countRows } = await query(countSql, params);
    const total = countRows[0].total;

    // Orden con fallback: si pediste 'tomada_en', empuja los NULL al final
    const dir = filtros.dir === 'asc' ? 'ASC' : 'DESC';
    let orderSql;
    if (filtros.order === 'tomada_en') {
      orderSql = `ORDER BY a.tomada_en ${dir} NULLS LAST, a.created_at ${dir}`;
    } else {
      orderSql = `ORDER BY a.created_at ${dir}`;
    }

    const offset = (filtros.page - 1) * filtros.limit;
    const dataSql = `
      ${SELECT_ARCHIVO}
      ${whereSql}
      ${orderSql}
      LIMIT $${i++} OFFSET $${i++}
    `;
    const { rows } = await query(dataSql, [...params, filtros.limit, offset]);

    return {
      data: rows,
      pagination: {
        page: filtros.page,
        limit: filtros.limit,
        total,
        total_pages: Math.ceil(total / filtros.limit),
      },
    };
  },

  async findById(id) {
    const { rows } = await query(
      `${SELECT_ARCHIVO} WHERE a.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async crear({
    nombre,
    usuario_id,
    etapa_id,
    tipo,
    url,
    r2_key,
    tamano_bytes,
    mime_type,
    tomada_en,
    metadata,
  }) {
    const { rows } = await query(
      `INSERT INTO archivos (
         nombre, usuario_id, etapa_id, tipo, url, r2_key,
         tamano_bytes, mime_type, tomada_en, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, nombre, usuario_id, etapa_id, tipo, url, r2_key,
                 tamano_bytes, mime_type, visible, tomada_en, metadata,
                 created_at, updated_at`,
      [
        nombre,
        usuario_id,
        etapa_id || null,
        tipo,
        url,
        r2_key,
        tamano_bytes || null,
        mime_type || null,
        tomada_en || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
    return rows[0];
  },

  /**
   * Update parcial. Solo actualiza los campos definidos en `cambios`.
   */
  async actualizar(id, cambios) {
    const campos = [];
    const valores = [];
    let i = 1;

    for (const [key, value] of Object.entries(cambios)) {
      if (value !== undefined) {
        campos.push(`${key} = $${i++}`);
        valores.push(value);
      }
    }

    if (campos.length === 0) {
      return this.findById(id);
    }

    valores.push(id);
    await query(
      `UPDATE archivos SET ${campos.join(', ')} WHERE id = $${i}`,
      valores
    );
    return this.findById(id);
  },

  async eliminar(id) {
    const { rowCount } = await query('DELETE FROM archivos WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
