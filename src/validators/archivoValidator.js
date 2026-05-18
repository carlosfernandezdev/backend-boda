import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

const listarSchema = Joi.object({
  tipo: Joi.string().valid('imagen', 'video'),
  usuario_id: Joi.number().integer().min(1),
  etapa_id: Joi.alternatives().try(
    Joi.number().integer().min(1),
    Joi.string().valid('sin_etapa')
  ),
  visible: Joi.string().valid('true', 'false', 'all'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(24),
  order: Joi.string().valid('tomada_en', 'created_at').default('tomada_en'),
  dir: Joi.string().valid('asc', 'desc').default('desc'),
});

const actualizarSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(255),
  etapa_id: Joi.number().integer().min(1).allow(null),
  visible: Joi.boolean(),
}).min(1).messages({
  'object.min': 'Debe enviar al menos un campo para actualizar',
});

const subirSchema = Joi.object({
  // Solo etapa_id es opcional en el body (override manual de la auto-asignación)
  etapa_id: Joi.number().integer().min(1),
});

const validate = (schema, data) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    throw new ValidationError('Datos inválidos', details);
  }
  return value;
};

export const validateListarArchivos = (data) => validate(listarSchema, data);
export const validateActualizarArchivo = (data) => validate(actualizarSchema, data);
export const validateSubirArchivo = (data) => validate(subirSchema, data);
