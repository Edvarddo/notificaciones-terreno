-- Migration: habilitar RLS en cargas_terreno, permitir acceso seguro desde el cliente
-- y crear + asignar una carga para 2026-05-18 a las filas con carga_id IS NULL
-- Ejecutar en el SQL editor de Supabase (Run and enable RLS si te lo pide)

BEGIN;

-- 1) Asegurar que la tabla existe (si viene de otra migración)
-- Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cargas_terreno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_certificacion date NOT NULL,
  estado text NOT NULL DEFAULT 'activa',
  creada_en timestamptz NOT NULL DEFAULT now(),
  cerrada_en timestamptz
);

-- 2) Habilitar RLS
ALTER TABLE public.cargas_terreno ENABLE ROW LEVEL SECURITY;

-- 3) Política: permitir SELECT de cargas activas a usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cargas_terreno' AND policyname = 'authenticated_select_active_cargas'
  ) THEN
    EXECUTE E'CREATE POLICY "authenticated_select_active_cargas" ON public.cargas_terreno FOR SELECT USING (estado = ''activa'' AND auth.role() = ''authenticated'')';
  END IF;
END$$;

-- 4) Política: permitir INSERT desde clientes autenticados (requiere fecha)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cargas_terreno' AND policyname = 'authenticated_insert_cargas'
  ) THEN
    EXECUTE E'CREATE POLICY "authenticated_insert_cargas" ON public.cargas_terreno FOR INSERT WITH CHECK (auth.role() = ''authenticated'' AND fecha_certificacion IS NOT NULL)';
  END IF;
END$$;

-- 5) Política opcional: permitir que usuarios autenticados puedan SELECT de cargas cerradas
-- (comenta / elimina si no quieres exponer cargas cerradas al cliente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cargas_terreno' AND policyname = 'authenticated_select_closed_cargas'
  ) THEN
    EXECUTE E'CREATE POLICY "authenticated_select_closed_cargas" ON public.cargas_terreno FOR SELECT USING (estado = ''cerrada'' AND auth.role() = ''authenticated'')';
  END IF;
END$$;

-- 6) Backfill: crear (si no existe) una carga para 2026-05-18 y asignar su id
WITH wanted AS (
  SELECT '2026-05-18'::date AS fecha
), ins AS (
  INSERT INTO public.cargas_terreno (fecha_certificacion, estado, creada_en)
  SELECT fecha, 'cerrada', now()
  FROM wanted
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cargas_terreno ct WHERE ct.fecha_certificacion = wanted.fecha
  )
  RETURNING id, fecha_certificacion
), carga AS (
  SELECT id, fecha_certificacion
  FROM ins
  UNION ALL
  SELECT ct.id, ct.fecha_certificacion
  FROM public.cargas_terreno ct
  JOIN wanted w ON ct.fecha_certificacion = w.fecha
  LIMIT 1
)
UPDATE public.notificaciones_terreno nt
SET carga_id = c.id
FROM carga c
WHERE nt.carga_id IS NULL
  AND nt.fecha_certificacion = c.fecha_certificacion;

COMMIT;

-- Verificaciones recomendadas (ejecutar por separado si quieres):
-- SELECT count(*) FROM public.notificaciones_terreno WHERE fecha_certificacion = '2026-05-18' AND carga_id IS NULL;
-- SELECT ct.id, ct.fecha_certificacion, count(*) AS total
-- FROM public.notificaciones_terreno nt
-- JOIN public.cargas_terreno ct ON nt.carga_id = ct.id
-- WHERE ct.fecha_certificacion = '2026-05-18'
-- GROUP BY ct.id, ct.fecha_certificacion;
