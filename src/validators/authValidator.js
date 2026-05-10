import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

const registerSchema = Joi.object({
  correo: Joi.string().email().max(255).required().messages({
    'string.email': 'El correo no tiene un formato válido',
    'any.required': 'El correo es obligatorio',
  }),
  nombre: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'any.required': 'El nombre es obligatorio',
  }),
  contrasena: Joi.string().min(8).max(72).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.max': 'La contraseña no puede tener más de 72 caracteres',
    'any.required': 'La contraseña es obligatoria',
  }),
});

const loginSchema = Joi.object({
  correo: Joi.string().email().required(),
  contrasena: Joi.string().required(),
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

export const validateRegister = (data) => validate(registerSchema, data);
export const validateLogin = (data) => validate(loginSchema, data);
