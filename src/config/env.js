import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Cargamos el .env desde la raíz del backend usando una ruta absoluta
// relativa a ESTE archivo (src/config/env.js → ../../.env).
// Así funciona sin importar desde qué directorio se ejecute node
// (raíz, scripts/, etc.), no depende de process.cwd().
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '..', '.env') });

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable de entorno faltante: ${name}`);
  }
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),

  // Database
  DB_HOST: required('DB_HOST'),
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: required('DB_NAME'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: required('DB_PASSWORD'),

  // JWT
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Cloudflare R2
  R2_ACCOUNT_ID: required('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: required('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: required('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: required('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: required('R2_PUBLIC_URL'),

  // Boda
  WEDDING_TIMEZONE: process.env.WEDDING_TIMEZONE || 'America/Caracas',

  // Uploads
  UPLOAD_MAX_FILE_SIZE_MB: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB || '200', 10),

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
