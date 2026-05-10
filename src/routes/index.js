import { Router } from 'express';
import { authRoutes } from './authRoutes.js';

export const router = Router();

router.get('/', (_req, res) => {
  res.json({
    message: 'Wedding Photobank API',
    version: '0.1.0',
  });
});

router.use('/auth', authRoutes);

// TODO: montar routers de cada módulo cuando se vayan creando
// router.use('/usuarios', usuarioRoutes);
// router.use('/archivos', archivoRoutes);
// router.use('/etapas', etapaRoutes);
