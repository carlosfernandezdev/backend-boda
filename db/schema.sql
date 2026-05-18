-- ============================================================================
-- Wedding Photo Bank - Database Schema
-- PostgreSQL 13+
-- ============================================================================
-- Requiere extensión pgcrypto para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Limpieza opcional (descomentar para reset)
-- ----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS archivos, etapas, rol_permisos, permisos, usuarios, roles CASCADE;
-- DROP TYPE IF EXISTS archivo_tipo;
-- DROP FUNCTION IF EXISTS set_updated_at();

-- ----------------------------------------------------------------------------
-- ENUMs
-- ----------------------------------------------------------------------------
CREATE TYPE archivo_tipo AS ENUM ('imagen', 'video');

-- ----------------------------------------------------------------------------
-- Función para mantener updated_at automáticamente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(50)  UNIQUE NOT NULL,
    descripcion  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- permisos
-- Convención: nombre = 'modulo.accion' (ej: 'archivos.crear')
-- ----------------------------------------------------------------------------
CREATE TABLE permisos (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(100) UNIQUE NOT NULL,
    modulo       VARCHAR(50)  NOT NULL,
    descripcion  TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permisos_modulo ON permisos(modulo);

-- ----------------------------------------------------------------------------
-- rol_permisos (M:N)
-- ----------------------------------------------------------------------------
CREATE TABLE rol_permisos (
    rol_id      INT NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
    permiso_id  INT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

-- ----------------------------------------------------------------------------
-- usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id               SERIAL       PRIMARY KEY,
    correo           VARCHAR(255) UNIQUE NOT NULL,
    nombre           VARCHAR(100) NOT NULL,           -- nombre o apodo
    contrasena_hash  VARCHAR(255) NOT NULL,           -- bcrypt
    rol_id           INT          NOT NULL REFERENCES roles(id),
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX idx_usuarios_activo ON usuarios(activo) WHERE activo = TRUE;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- etapas (momentos de la boda: ceremonia, recepción, fiesta...)
-- ----------------------------------------------------------------------------
CREATE TABLE etapas (
    id           SERIAL       PRIMARY KEY,
    nombre       VARCHAR(100) NOT NULL,
    descripcion  TEXT,
    inicio       TIMESTAMPTZ  NOT NULL,
    fin          TIMESTAMPTZ  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_etapas_rango_valido CHECK (fin > inicio)
);

CREATE INDEX idx_etapas_inicio ON etapas(inicio);

CREATE TRIGGER trg_etapas_updated_at
BEFORE UPDATE ON etapas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- archivos (fotos y videos en Cloudflare R2)
-- ----------------------------------------------------------------------------
CREATE TABLE archivos (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre        VARCHAR(255) NOT NULL,
    usuario_id   INT          NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    etapa_id      INT          REFERENCES etapas(id) ON DELETE SET NULL,
    tipo          archivo_tipo NOT NULL,
    url           TEXT         NOT NULL,            -- URL pública servida desde R2
    r2_key        VARCHAR(500) NOT NULL UNIQUE,     -- key del objeto en el bucket
    tamano_bytes  BIGINT,
    mime_type     VARCHAR(100),
    visible       BOOLEAN      NOT NULL DEFAULT TRUE,
    tomada_en     TIMESTAMPTZ,                       -- fecha de captura (de EXIF/ffprobe), NULL si no hay metadata
    metadata      JSONB,                             -- raw EXIF/ffprobe para debug y datos extra (cámara, GPS...)
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_archivos_usuario_id ON archivos(usuario_id);
CREATE INDEX idx_archivos_etapa_id   ON archivos(etapa_id);
CREATE INDEX idx_archivos_tipo       ON archivos(tipo);
CREATE INDEX idx_archivos_visible    ON archivos(visible) WHERE visible = TRUE;
CREATE INDEX idx_archivos_created_at ON archivos(created_at DESC);
CREATE INDEX idx_archivos_tomada_en  ON archivos(tomada_en DESC NULLS LAST);

CREATE TRIGGER trg_archivos_updated_at
BEFORE UPDATE ON archivos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- SEEDS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Roles base
-- ----------------------------------------------------------------------------
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin',    'Desarrolladores del sistema. Control total.'),
    ('novio',    'Los novios. Gestionan archivos, usuarios y etapas.'),
    ('invitado', 'Invitados a la boda. Suben y ven contenido.');

-- ----------------------------------------------------------------------------
-- Permisos
-- ----------------------------------------------------------------------------
INSERT INTO permisos (nombre, modulo, descripcion) VALUES
    -- Usuarios
    ('usuarios.listar',         'usuarios', 'Listar todos los usuarios'),
    ('usuarios.ver',            'usuarios', 'Ver detalle de un usuario'),
    ('usuarios.crear',          'usuarios', 'Crear usuarios'),
    ('usuarios.editar',         'usuarios', 'Editar cualquier usuario'),
    ('usuarios.eliminar',       'usuarios', 'Eliminar usuarios'),
    ('usuarios.asignar_rol',    'usuarios', 'Cambiar el rol de un usuario'),
    -- Roles y permisos
    ('roles.gestionar',         'roles',    'Crear/editar/eliminar roles y permisos'),
    -- Archivos
    ('archivos.listar',         'archivos', 'Listar archivos'),
    ('archivos.ver',            'archivos', 'Ver detalle de un archivo'),
    ('archivos.crear',          'archivos', 'Subir nuevos archivos'),
    ('archivos.editar_propio',  'archivos', 'Editar archivos propios'),
    ('archivos.editar_todos',   'archivos', 'Editar cualquier archivo'),
    ('archivos.eliminar_propio','archivos', 'Eliminar archivos propios'),
    ('archivos.eliminar_todos', 'archivos', 'Eliminar cualquier archivo'),
    ('archivos.moderar',        'archivos', 'Cambiar visibilidad de archivos'),
    -- Etapas
    ('etapas.listar',           'etapas',   'Listar etapas'),
    ('etapas.crear',            'etapas',   'Crear etapas'),
    ('etapas.editar',           'etapas',   'Editar etapas'),
    ('etapas.eliminar',         'etapas',   'Eliminar etapas');

-- ----------------------------------------------------------------------------
-- Asignación rol → permisos
-- ----------------------------------------------------------------------------

-- admin: TODOS los permisos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT (SELECT id FROM roles WHERE nombre = 'admin'), id
FROM permisos;

-- novio: gestión de archivos, etapas y vista de usuarios (sin asignar roles)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT (SELECT id FROM roles WHERE nombre = 'novio'), id
FROM permisos
WHERE nombre IN (
    'usuarios.listar', 'usuarios.ver',
    'archivos.listar', 'archivos.ver', 'archivos.crear',
    'archivos.editar_todos', 'archivos.eliminar_todos', 'archivos.moderar',
    'etapas.listar', 'etapas.crear', 'etapas.editar', 'etapas.eliminar'
);

-- invitado: ver galería + gestionar lo propio
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT (SELECT id FROM roles WHERE nombre = 'invitado'), id
FROM permisos
WHERE nombre IN (
    'archivos.listar', 'archivos.ver', 'archivos.crear',
    'archivos.editar_propio', 'archivos.eliminar_propio',
    'etapas.listar'
);

-- ----------------------------------------------------------------------------
-- Etapas de ejemplo (ajustar fecha real de la boda)
-- ----------------------------------------------------------------------------
INSERT INTO etapas (nombre, descripcion, inicio, fin) VALUES
    ('Pre-boda',  'Sesión de fotos previa', '2026-06-20 14:00:00', '2026-06-20 16:00:00'),
    ('Ceremonia', 'Ceremonia',              '2026-06-20 17:00:00', '2026-06-20 18:30:00'),
    ('Recepción', 'Cóctel y cena',          '2026-06-20 19:00:00', '2026-06-20 22:00:00'),
    ('Fiesta',    'Baile y celebración',    '2026-06-20 22:00:00', '2026-06-21 03:00:00');
