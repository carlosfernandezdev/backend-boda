import { query } from '../config/db.js';

export const EtapaDAO = {
  async listar() {
    const { rows } = await query(
      `SELECT id, nombre, descripcion, inicio, fin, created_at, updated_at
       FROM etapas
       ORDER BY inicio ASC`
    );
    return rows;
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT id, nombre, descripcion, inicio, fin, created_at, updated_at
       FROM etapas
       WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Devuelve la etapa que contiene el timestamp dado (o null si no hay match).
   */
  async findActivaEn(timestamp) {
    const { rows } = await query(
      `SELECT id, nombre, descripcion, inicio, fin
       FROM etapas
       WHERE $1 BETWEEN inicio AND fin
       ORDER BY inicio ASC
       LIMIT 1`,
      [timestamp]
    );
    return rows[0] || null;
  },

  /**
   * Etapa más cercana a un timestamp dado.
   * - Si el timestamp cae dentro de alguna etapa → distancia = 0 y gana esa.
   * - Si está afuera → gana la más cercana en el tiempo (antes o después).
   *
   * Devuelve { id, distancia_seg } o null si no hay etapas en la DB.
   *
   * Esta es la query CORE para auto-asignar archivos a etapas según
   * su fecha de captura (EXIF/ffprobe). La usa ArchivoBO al subir.
   */
  async findMasCercana(timestamp) {
    const { rows } = await query(
      `SELECT id,
              CASE
                WHEN $1 BETWEEN inicio AND fin THEN 0
                WHEN $1 < inicio THEN EXTRACT(EPOCH FROM (inicio - $1))
                ELSE EXTRACT(EPOCH FROM ($1 - fin))
              END AS distancia_seg
       FROM etapas
       ORDER BY distancia_seg ASC, id ASC
       LIMIT 1`,
      [timestamp]
    );
    return rows[0] || null;
  },

  async crear({ nombre, descripcion, inicio, fin }) {
    const { rows } = await query(
      `INSERT INTO etapas (nombre, descripcion, inicio, fin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, inicio, fin, created_at, updated_at`,
      [nombre, descripcion || null, inicio, fin]
    );
    return rows[0];
  },

  async actualizar(id, { nombre, descripcion, inicio, fin }) {
    const { rows } = await query(
      `UPDATE etapas
       SET nombre = COALESCE($2, nombre),
           descripcion = COALESCE($3, descripcion),
           inicio = COALESCE($4, inicio),
           fin = COALESCE($5, fin)
       WHERE id = $1
       RETURNING id, nombre, descripcion, inicio, fin, created_at, updated_at`,
      [id, nombre ?? null, descripcion ?? null, inicio ?? null, fin ?? null]
    );
    return rows[0] || null;
  },

  async eliminar(id) {
    const { rowCount } = await query('DELETE FROM etapas WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /**
   * Cuenta archivos asignados a esta etapa. Sirve para bloquear DELETE
   * o avisar al usuario antes de hacerlo.
   */
  async contarArchivos(id) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS total FROM archivos WHERE etapa_id = $1',
      [id]
    );
    return rows[0].total;
  },
};
