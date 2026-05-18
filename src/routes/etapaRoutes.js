import { Router } from 'express';
import { etapaController } from '../controllers/etapaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePermiso } from '../middlewares/permisoMiddleware.js';

export const etapaRoutes = Router();

// Todas las rutas requieren login. La galería va a usar /api/etapas para mostrar
// el listado en filtros, así que cualquier usuario autenticado puede leerlas.
etapaRoutes.use(authMiddleware);

// Lecturas - cualquier rol con permiso etapas.listar
etapaRoutes.get('/',        requirePermiso('etapas.listar'), etapaController.listar);
etapaRoutes.get('/activa',  requirePermiso('etapas.listar'), etapaController.obtenerActiva);
etapaRoutes.get('/:id',     requirePermiso('etapas.listar'), etapaController.obtener);

// Escrituras - solo admin y novios
etapaRoutes.post('/',       requirePermiso('etapas.crear'),    etapaController.crear);
etapaRoutes.patch('/:id',   requirePermiso('etapas.editar'),   etapaController.actualizar);
etapaRoutes.delete('/:id',  requirePermiso('etapas.eliminar'), etapaController.eliminar);
