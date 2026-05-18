import { ArchivoDAO } from '../dao/ArchivoDAO.js';
import { EtapaDAO } from '../dao/EtapaDAO.js';
import { R2Service } from '../services/r2Service.js';
import { MetadataService } from '../services/metadataService.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors.js';

/**
 * Mapea un mime type a nuestro enum archivo_tipo.
 */
const detectarTipo = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'imagen';
  if (mimeType.startsWith('video/')) return 'video';
  throw new ValidationError(`Mime type no soportado: ${mimeType}`);
};

/**
 * Reglas de ownership: ¿puede `usuario` modificar/eliminar `archivo`?
 * - El dueño siempre puede sobre sus archivos.
 * - admin/novio puede sobre cualquier archivo.
 */
const puedeGestionar = (usuario, archivo) => {
  if (!usuario || !archivo) return false;
  if (archivo.usuario_id === usuario.id) return true;
  return (
    usuario.permisos.includes('archivos.editar_todos') ||
    usuario.permisos.includes('archivos.eliminar_todos')
  );
};

/**
 * ¿Puede ver el archivo? Si está oculto (visible=false), solo el dueño y moderadores.
 */
const puedeVer = (usuario, archivo) => {
  if (!archivo) return false;
  if (archivo.visible) return true;
  if (!usuario) return false;
  if (archivo.usuario_id === usuario.id) return true;
  return usuario.permisos.includes('archivos.moderar');
};

export const ArchivoBO = {
  /**
   * Sube un archivo: extrae metadata, asigna etapa, sube a R2, persiste en DB.
   * Si la DB falla después de R2, intenta cleanup del objeto subido.
   */
  async crear({ file, usuario, etapa_id_manual }) {
    if (!file || !file.buffer) {
      throw new ValidationError('Falta el archivo (campo "archivo")');
    }

    const tipo = detectarTipo(file.mimetype);

    // 1. Extraer metadata (nunca lanza, devuelve null si no hay EXIF)
    const { tomada_en, metadata } = await MetadataService.extraer({
      buffer: file.buffer,
      tipo,
      mimeType: file.mimetype,
    });

    // 2. Asignar etapa
    let etapa_id;
    if (etapa_id_manual) {
      const etapa = await EtapaDAO.findById(etapa_id_manual);
      if (!etapa) throw new ValidationError(`Etapa ${etapa_id_manual} no existe`);
      etapa_id = etapa.id;
    } else if (tomada_en) {
      // Auto: la más cercana en el tiempo
      const masCercana = await EtapaDAO.findMasCercana(tomada_en);
      etapa_id = masCercana?.id || null;
    } else {
      etapa_id = null;
    }

    // 3. Subir a R2
    const { key, url } = await R2Service.upload({
      buffer: file.buffer,
      tipo,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      fecha: tomada_en || new Date(),
    });

    // 4. Persistir en DB. Si falla, limpiar R2.
    try {
      const archivo = await ArchivoDAO.crear({
        nombre: file.originalname,
        usuario_id: usuario.id,
        etapa_id,
        tipo,
        url,
        r2_key: key,
        tamano_bytes: file.size,
        mime_type: file.mimetype,
        tomada_en,
        metadata,
      });
      return await ArchivoDAO.findById(archivo.id); // re-fetch con joins
    } catch (err) {
      // Best-effort cleanup
      try {
        await R2Service.eliminar(key);
      } catch (cleanupErr) {
        console.error('Error en cleanup de R2 tras fallo DB:', cleanupErr.message);
      }
      throw err;
    }
  },

  /**
   * Listado con filtros. Aplica reglas de visibilidad según el usuario.
   */
  async listar({ filtros, usuario }) {
    // Por defecto solo archivos visibles
    // Pero los moderadores pueden ver ocultos si lo piden explícitamente
    const puedeVerOcultos = usuario.permisos.includes('archivos.moderar');
    const visibleParam = filtros.visible;

    let visibleFilter;
    if (visibleParam === 'all' && puedeVerOcultos) {
      visibleFilter = undefined; // sin filtrar
    } else if (visibleParam === 'false' && puedeVerOcultos) {
      visibleFilter = false;
    } else {
      visibleFilter = true; // default: solo visibles, también para invitados sin importar lo que manden
    }

    return ArchivoDAO.listar({ ...filtros, visible: visibleFilter });
  },

  async obtener(id, usuario) {
    const archivo = await ArchivoDAO.findById(id);
    if (!archivo) throw new NotFoundError('Archivo');
    if (!puedeVer(usuario, archivo)) throw new NotFoundError('Archivo'); // 404, no 403 (no leak de existencia)
    return archivo;
  },

  /**
   * Update parcial: nombre, etapa_id (manual), visible.
   * - nombre/etapa_id: dueño o moderador.
   * - visible: solo moderador.
   */
  async actualizar(id, cambios, usuario) {
    const archivo = await ArchivoDAO.findById(id);
    if (!archivo) throw new NotFoundError('Archivo');

    // Validar permisos generales
    if (!puedeGestionar(usuario, archivo)) {
      throw new ForbiddenError('No podés modificar este archivo');
    }

    // visible es restringido: solo moderadores
    if (cambios.visible !== undefined) {
      if (!usuario.permisos.includes('archivos.moderar')) {
        throw new ForbiddenError('Solo moderadores pueden cambiar la visibilidad');
      }
    }

    // Si cambian etapa_id manualmente, validar que exista
    if (cambios.etapa_id !== undefined && cambios.etapa_id !== null) {
      const etapa = await EtapaDAO.findById(cambios.etapa_id);
      if (!etapa) throw new ValidationError(`Etapa ${cambios.etapa_id} no existe`);
    }

    return ArchivoDAO.actualizar(id, cambios);
  },

  /**
   * Elimina archivo: primero de R2, después de DB.
   * Si R2 falla, no tocamos DB (queda recuperable).
   */
  async eliminar(id, usuario) {
    const archivo = await ArchivoDAO.findById(id);
    if (!archivo) throw new NotFoundError('Archivo');
    if (!puedeGestionar(usuario, archivo)) {
      throw new ForbiddenError('No podés eliminar este archivo');
    }

    await R2Service.eliminar(archivo.r2_key);
    await ArchivoDAO.eliminar(id);
  },
};
