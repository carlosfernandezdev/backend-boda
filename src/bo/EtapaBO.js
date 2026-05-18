import { EtapaDAO } from '../dao/EtapaDAO.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errors.js';

/**
 * Valida que inicio sea anterior a fin.
 * La DB ya tiene un CHECK que valida esto, pero acá devolvemos
 * un error semántico antes de tocar la DB.
 */
const validarRango = (inicio, fin) => {
  if (!inicio || !fin) return;
  const ini = new Date(inicio);
  const fn = new Date(fin);
  if (isNaN(ini.getTime()) || isNaN(fn.getTime())) {
    throw new ValidationError('inicio o fin no son fechas válidas');
  }
  if (fn <= ini) {
    throw new ValidationError('La fecha fin debe ser posterior a la fecha inicio');
  }
};

export const EtapaBO = {
  async listar() {
    return EtapaDAO.listar();
  },

  async obtener(id) {
    const etapa = await EtapaDAO.findById(id);
    if (!etapa) throw new NotFoundError('Etapa');
    return etapa;
  },

  /**
   * Devuelve la etapa que está sucediendo en este momento, o null.
   */
  async obtenerActiva() {
    return EtapaDAO.findActivaEn(new Date());
  },

  async crear(data) {
    validarRango(data.inicio, data.fin);
    return EtapaDAO.crear(data);
  },

  async actualizar(id, data) {
    const existente = await EtapaDAO.findById(id);
    if (!existente) throw new NotFoundError('Etapa');

    // Validar rango contra los valores finales (merge entre lo existente y lo nuevo)
    const inicioFinal = data.inicio ?? existente.inicio;
    const finFinal = data.fin ?? existente.fin;
    validarRango(inicioFinal, finFinal);

    return EtapaDAO.actualizar(id, data);
  },

  async eliminar(id) {
    const existente = await EtapaDAO.findById(id);
    if (!existente) throw new NotFoundError('Etapa');

    const archivosAsociados = await EtapaDAO.contarArchivos(id);
    if (archivosAsociados > 0) {
      throw new ConflictError(
        `No se puede eliminar la etapa: tiene ${archivosAsociados} archivo(s) asociado(s). ` +
        `Reasigná los archivos a otra etapa primero.`
      );
    }

    await EtapaDAO.eliminar(id);
  },
};
