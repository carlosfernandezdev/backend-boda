import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * Cloudflare R2 es S3-compatible, así que usamos el SDK de AWS S3
 * apuntando al endpoint de R2.
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = env.R2_BUCKET_NAME;
export const R2_PUBLIC_URL = env.R2_PUBLIC_URL;
