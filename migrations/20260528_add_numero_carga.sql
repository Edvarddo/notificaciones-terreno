ALTER TABLE public.cargas_terreno
ADD COLUMN IF NOT EXISTS numero_carga INTEGER;

WITH cargas_ordenadas AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY fecha_certificacion
      ORDER BY creada_en ASC, id ASC
    ) AS numero
  FROM public.cargas_terreno
)
UPDATE public.cargas_terreno c
SET numero_carga = o.numero
FROM cargas_ordenadas o
WHERE c.id = o.id;

CREATE UNIQUE INDEX IF NOT EXISTS cargas_terreno_fecha_numero_unique
  ON public.cargas_terreno (fecha_certificacion, numero_carga)
  WHERE numero_carga IS NOT NULL;