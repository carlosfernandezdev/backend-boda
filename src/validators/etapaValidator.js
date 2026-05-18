import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

const crearSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'any.required': 'El nombre es obligatorio',
  }),
  descripcion: Joi.string().trim().max(1000).allow('', null),
  inicio: Joi.date().iso().required().messages({
    'date.format': 'inicio debe ser una fecha ISO válida (ej: 2026-06-20T17:00:00-04:00)',
    'any.required': 'inicio es obligatorio',
  }),
  fin: Joi.date().iso().greater(Joi.ref('inicio')).required().messages({
    'date.format': 'fin debe ser una fecha ISO válida',
    'date.greater': 'fin debe ser posterior a inicio',
    'any.required': 'fin es obligatorio',
  }),
});

const actualizarSchema = Joi.object({
  nombre: Joi.string().trim().min(2).max(100),
  descripcion: Joi.string().trim().max(1000).allow('', null),
  inicio: Joi.date().iso(),
  fin: Joi.date().iso(),
}).min(1).messages({
  'object.min': 'Debe enviar al menos un campo para actualizar',
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

export const validateCrearEtapa = (data) => validate(crearSchema, data);
export const validateActualizarEtapa = (data) => validate(actualizarSchema, data);
