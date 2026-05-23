import { ArchivoBO } from '../bo/ArchivoBO.js';
import {
  validateListarArchivos,
  validateActualizarArchivo,
  validateSubirArchivo,
} from '../validators/archivoValidator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/errors.js';
import { toArchivoPublico } from '../models/Archivo.js';

// Los archivos usan UUID como id (no enteros). Validamos formato UUID.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parseId = (raw) => {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    throw new ValidationError('El id de archivo debe ser un UUID válido');
  }
  return raw;
};

export const archivoController = {
  listar: asyncHandler(async (req, res) => {
    const filtros = validateListarArchivos(req.query);
    const { data, pagination } = await ArchivoBO.listar({
      filtros,
      usuario: req.user,
    });
    res.json({
      archivos: data.map(toArchivoPublico),
      pagination,
    });
  }),

  obtener: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const archivo = await ArchivoBO.obtener(id, req.user);
    res.json({ archivo: toArchivoPublico(archivo) });
  }),

  subir: asyncHandler(async (req, res) => {
    // El body puede traer etapa_id como string (porque multipart), normalizamos
    const body = { ...req.body };
    if (body.etapa_id) body.etapa_id = Number(body.etapa_id);

    const { etapa_id } = validateSubirArchivo(body);

    const archivo = await ArchivoBO.crear({
      file: req.file,
      usuario: req.user,
      etapa_id_manual: etapa_id,
    });
    res.status(201).json({ archivo: toArchivoPublico(archivo) });
  }),

  actualizar: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const cambios = validateActualizarArchivo(req.body);
    const archivo = await ArchivoBO.actualizar(id, cambios, req.user);
    res.json({ archivo: toArchivoPublico(archivo) });
  }),

  eliminar: asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    await ArchivoBO.eliminar(id, req.user);
    res.status(204).send();
  }),
};