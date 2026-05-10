-- Migración 001: agregar tomada_en y metadata a archivos
-- Aplicar SOLO si ya corriste schema.sql sin estas columnas.
-- Si recién vas a correr schema.sql, ignorá este archivo (el schema ya las trae).

ALTER TABLE archivos
    ADD COLUMN IF NOT EXISTS tomada_en TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata  JSONB;

CREATE INDEX IF NOT EXISTS idx_archivos_tomada_en
    ON archivos(tomada_en DESC NULLS LAST);
