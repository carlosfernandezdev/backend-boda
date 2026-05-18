import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { etapaRoutes } from './etapaRoutes.js';
import { archivoRoutes } from './archivoRoutes.js';

export const router = Router();

router.get('/', (_req, res) => {
  res.json({
    message: 'Wedding Photobank API',
    version: '0.1.0',
  });
});

router.use('/auth', authRoutes);
router.use('/etapas', etapaRoutes);
router.use('/archivos', archivoRoutes);

// TODO: montar routers de cada módulo cuando se vayan creando
// router.use('/usuarios', usuarioRoutes);
