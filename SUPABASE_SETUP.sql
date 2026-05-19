-- ============================================================================
-- SUPABASE SETUP: Habilitar RLS y crear políticas permisivas (DEV)
-- ============================================================================
-- ADVERTENCIA: Estas políticas abren la tabla públicamente.
-- Solo para desarrollo/pruebas. En producción, usa auth.uid() o roles.
-- ============================================================================

-- 1. Habilitar RLS en la tabla
ALTER TABLE public.notificaciones_terreno ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para SELECT (lectura / realtime events)
CREATE POLICY allow_select_public
  ON public.notificaciones_terreno
  FOR SELECT
  USING (true);

-- 3. Crear política para INSERT (escritura)
CREATE POLICY allow_insert_public
  ON public.notificaciones_terreno
  FOR INSERT
  WITH CHECK (true);

-- 4. Crear política para UPDATE (edición)
CREATE POLICY allow_update_public
  ON public.notificaciones_terreno
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. Crear política para DELETE (eliminación)
CREATE POLICY allow_delete_public
  ON public.notificaciones_terreno
  FOR DELETE
  USING (true);

-- 6. Verificar que Realtime está habilitado en la tabla
-- (Normalmente Supabase lo hace por defecto, pero confirma en Table Editor)

-- Primero: eliminar la restricción NOT NULL si existe
ALTER TABLE public.notificaciones_terreno ALTER COLUMN id_notificacion DROP NOT NULL;

-- Validación en base de datos: la ID debe ser de 8 o 9 dígitos cuando exista
ALTER TABLE public.notificaciones_terreno
ADD CONSTRAINT notificaciones_terreno_id_notificacion_formato_chk
CHECK (
  id_notificacion IS NULL OR id_notificacion ~ '^[0-9]{8,9}$'
);

-- Validación básica para la hora en formato HHMM
ALTER TABLE public.notificaciones_terreno
ADD CONSTRAINT notificaciones_terreno_hora_formato_chk
CHECK (
  hora IS NULL OR hora ~ '^[0-9]{4}$'
);

-- Agregar las nuevas columnas
ALTER TABLE public.notificaciones_terreno
ADD COLUMN IF NOT EXISTS comentarios TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS es_rebajada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rit VARCHAR(20),
ADD COLUMN IF NOT EXISTS año INTEGER,
ADD COLUMN IF NOT EXISTS geolocalizacion_fuente TEXT,
ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS carga_id UUID;

-- Tabla para agrupar registros por carga
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cargas_terreno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_certificacion DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cerrada')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS cargas_terreno_fecha_activa_unique
  ON public.cargas_terreno (fecha_certificacion)
  WHERE estado = 'activa';

CREATE INDEX IF NOT EXISTS cargas_terreno_fecha_estado_idx
  ON public.cargas_terreno (fecha_certificacion, estado, creada_en DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notificaciones_terreno_carga_id_fk'
  ) THEN
    ALTER TABLE public.notificaciones_terreno
    ADD CONSTRAINT notificaciones_terreno_carga_id_fk
    FOREIGN KEY (carga_id) REFERENCES public.cargas_terreno(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notificaciones_terreno_carga_id_chk'
  ) THEN
    ALTER TABLE public.notificaciones_terreno
    ADD CONSTRAINT notificaciones_terreno_carga_id_chk
    CHECK (carga_id IS NULL OR carga_id::text ~ '^[0-9a-fA-F-]{36}$');
  END IF;
END $$;

-- 8. PRUEBA: Inserta un registro desde SQL y observa que aparece en MonitoreoLive
INSERT INTO public.notificaciones_terreno 
  (id_notificacion, codigo, hora, observacion, codigo_lote, es_no_urbana, fecha_certificacion, comentarios, es_rebajada)
VALUES 
  ('TEST_SQL_' || NOW()::text, 'PRB', '0000', 'Test desde SQL Editor', NULL, false, '2026-04-28', 'Test comentario', false);

-- ============================================================================
-- Para verificar que las políticas están creadas:
-- SELECT * FROM pg_policies WHERE tablename = 'notificaciones_terreno';
-- ============================================================================
-- Para verificar que las nuevas columnas existen:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notificaciones_terreno';
