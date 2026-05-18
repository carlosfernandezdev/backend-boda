import { EtapaBO } from '../bo/EtapaBO.js';
import {
  validateCrearEtapa,
  validateActualizarEtapa,
} from '../validators/etapaValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/errors.js';

const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError('El id debe ser un entero positivo');
  }
  return id;
};

export const etapaController = {
  listar: asyncHandler(async (_req, res) => {
    const etapas = await EtapaBO.listar();
    res.json({ etapas });
  }),

  obtenerActiva: asyncHandler(async (_req, res) => {
    const etapa = await EtapaBO.obtenerActiva();
    res.json({ etapa }); // puede ser null si no estamos dentro de ninguna
  }),

  obtener: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const etapa = await EtapaBO.obtener(id);
    res.json({ etapa });
  }),

  crear: asyncHandler(async (req, res) => {
    const data = validateCrearEtapa(req.body);
    const etapa = await EtapaBO.crear(data);
    res.status(201).json({ etapa });
  }),

  actualizar: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const data = validateActualizarEtapa(req.body);
    const etapa = await EtapaBO.actualizar(id, data);
    res.json({ etapa });
  }),

  eliminar: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await EtapaBO.eliminar(id);
    res.status(204).send();
  }),
};
