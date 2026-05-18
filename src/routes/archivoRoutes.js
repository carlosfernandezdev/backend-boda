import { Router } from 'express';
import { archivoController } from '../controllers/archivoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  requirePermiso,
  requireAlgunPermiso,
} from '../middlewares/permisoMiddleware.js';
import { handleUpload } from '../middlewares/uploadMiddleware.js';

export const archivoRoutes = Router();

// Todas las rutas requieren auth
archivoRoutes.use(authMiddleware);

// Lecturas
archivoRoutes.get('/',     requirePermiso('archivos.listar'), archivoController.listar);
archivoRoutes.get('/:id',  requirePermiso('archivos.ver'),    archivoController.obtener);

// Upload (cualquier autenticado con permiso archivos.crear)
// El middleware handleUpload procesa multipart y pone req.file
archivoRoutes.post('/',    requirePermiso('archivos.crear'),  handleUpload, archivoController.subir);

// Update: dueño con editar_propio O moderadores con editar_todos.
// La validación fina (ownership real, visibilidad) la hace el BO.
archivoRoutes.patch('/:id',
  requireAlgunPermiso('archivos.editar_propio', 'archivos.editar_todos', 'archivos.moderar'),
  archivoController.actualizar
);

// Delete: dueño con eliminar_propio O moderadores con eliminar_todos
archivoRoutes.delete('/:id',
  requireAlgunPermiso('archivos.eliminar_propio', 'archivos.eliminar_todos'),
  archivoController.eliminar
);
