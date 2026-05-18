-- ============================================================================
-- Reset de la base de datos
-- Borra TODAS las tablas, types, funciones y triggers del proyecto.
-- Después aplicar schema.sql para volver a crear todo.
--
-- Uso standalone:
--   psql -d wedding_photobank -f backend/db/reset.sql
--
-- Uso vía npm script (recomendado, hace reset + schema + bootstrap en una pasada):
--   npm run db:reset
-- ============================================================================

-- Drop en orden inverso a las FKs para evitar errores.
DROP TABLE IF EXISTS archivos      CASCADE;
DROP TABLE IF EXISTS etapas        CASCADE;
DROP TABLE IF EXISTS rol_permisos  CASCADE;
DROP TABLE IF EXISTS permisos      CASCADE;
DROP TABLE IF EXISTS usuarios      CASCADE;
DROP TABLE IF EXISTS roles         CASCADE;

-- Custom types
DROP TYPE IF EXISTS archivo_tipo;

-- Funciones de soporte
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
