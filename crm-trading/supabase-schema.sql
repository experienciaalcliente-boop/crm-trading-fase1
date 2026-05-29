-- ============================================================
-- ACADEMIA CRM — Esquema completo de Supabase
-- Fase 1: Seguimiento de llamadas
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase
-- 2. Menú izquierdo → SQL Editor → New query
-- 3. Pega TODO este contenido y haz clic en "Run"
-- ============================================================

-- ── TABLA: asesoras ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asesoras (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     text NOT NULL UNIQUE,
  activo     boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── TABLA: alumnos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumnos (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        text NOT NULL,
  programa      text NOT NULL,
  semana_actual text,
  asesora       text,
  estado        text DEFAULT 'Activo',
  activo        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(nombre, programa)
);

-- ── TABLA: registros_llamadas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS registros_llamadas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo        text NOT NULL UNIQUE,
  fecha         date NOT NULL DEFAULT CURRENT_DATE,
  alumno_id     uuid REFERENCES alumnos(id) ON DELETE SET NULL,
  asesora_id    uuid REFERENCES asesoras(id) ON DELETE SET NULL,
  semana        text,
  respondio     text CHECK (respondio IN ('Sí', 'No')),
  avance        numeric(5,2)  CHECK (avance >= 0 AND avance <= 100),
  mentoria      text CHECK (mentoria IN ('Sí', 'No')),
  cuenta        text CHECK (cuenta IN ('Demo', 'Real', 'Fondeo', 'No opera', 'Balance')),
  capital_real  numeric(12,2) CHECK (capital_real >= 0),
  fase_fondeo   text CHECK (fase_fondeo IN ('Primera fase', 'Segunda fase', 'Aprobado')),
  beneficio     numeric(12,2),
  retiro        text CHECK (retiro IN ('Sí', 'No')),
  monto_retiro  numeric(12,2) CHECK (monto_retiro >= 0),
  observaciones text,
  created_at    timestamptz DEFAULT now()
);

-- ── DATOS INICIALES: asesoras ─────────────────────────────────
-- ⚠️  PERSONALIZA estos nombres con los de tu equipo real
INSERT INTO asesoras (nombre) VALUES
  ('Asesora 1'),   -- Cambia este nombre
  ('Asesora 2'),   -- Cambia este nombre
  ('Orientador')   -- El asesor técnico
ON CONFLICT (nombre) DO NOTHING;

-- ── ÍNDICES para rendimiento ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_llamadas_fecha    ON registros_llamadas(fecha);
CREATE INDEX IF NOT EXISTS idx_llamadas_alumno   ON registros_llamadas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_asesora  ON registros_llamadas(asesora_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_codigo   ON registros_llamadas(codigo);
CREATE INDEX IF NOT EXISTS idx_alumnos_programa  ON alumnos(programa);
CREATE INDEX IF NOT EXISTS idx_alumnos_nombre    ON alumnos(nombre);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- (permite acceso sin autenticación — adecuado para uso interno)
ALTER TABLE asesoras           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_llamadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acceso_asesoras"  ON asesoras;
DROP POLICY IF EXISTS "acceso_alumnos"   ON alumnos;
DROP POLICY IF EXISTS "acceso_llamadas"  ON registros_llamadas;

CREATE POLICY "acceso_asesoras"  ON asesoras           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_alumnos"   ON alumnos            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_llamadas"  ON registros_llamadas FOR ALL USING (true) WITH CHECK (true);

-- ── REALTIME ──────────────────────────────────────────────────
-- Permite que los cambios se reflejen en tiempo real en la app
ALTER PUBLICATION supabase_realtime ADD TABLE registros_llamadas;

-- ── VERIFICACIÓN ─────────────────────────────────────────────
-- Ejecuta esto para confirmar que todo quedó bien:
SELECT 'asesoras'           AS tabla, count(*) AS filas FROM asesoras
UNION ALL
SELECT 'alumnos',            count(*) FROM alumnos
UNION ALL
SELECT 'registros_llamadas', count(*) FROM registros_llamadas;

-- ── ACTUALIZACIÓN: columna rol en asesoras ────────────────────
-- Ejecuta esto si quieres marcar el orientador correctamente:
ALTER TABLE asesoras ADD COLUMN IF NOT EXISTS rol text DEFAULT 'asesora'
  CHECK (rol IN ('asesora', 'orientador'));

-- Marcar al orientador (cambia el nombre por el real):
UPDATE asesoras SET rol = 'orientador' WHERE nombre ILIKE '%orientador%';

-- ============================================================
-- FASE 2: Recaudación
-- ============================================================

-- Cuotas de pago por alumno
CREATE TABLE IF NOT EXISTS cuotas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id     uuid REFERENCES alumnos(id) ON DELETE CASCADE,
  numero_cuota  integer NOT NULL,
  fecha_vence   date NOT NULL,
  monto         numeric(12,2) NOT NULL,
  moneda        text DEFAULT 'USD' CHECK (moneda IN ('USD','PEN')),
  estado        text DEFAULT 'No iniciada' CHECK (estado IN ('Pagada','Pago parcial','No iniciada','Prórroga','Reserva académica','Retirado')),
  monto_pagado  numeric(12,2) DEFAULT 0,
  fecha_pago    date,
  nueva_fecha   date,
  motivo_retiro text,
  observaciones text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(alumno_id, numero_cuota)
);

-- Historial de pagos (cada transacción registrada)
CREATE TABLE IF NOT EXISTS pagos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cuota_id    uuid REFERENCES cuotas(id) ON DELETE CASCADE,
  alumno_id   uuid REFERENCES alumnos(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('Pago completo','Pago parcial','Prórroga','Reserva académica','Retiro')),
  monto       numeric(12,2),
  moneda      text CHECK (moneda IN ('USD','PEN')),
  fecha_pago  date NOT NULL DEFAULT CURRENT_DATE,
  nueva_fecha date,
  motivo      text,
  observaciones text,
  registrado_por text,
  created_at  timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cuotas_alumno    ON cuotas(alumno_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado    ON cuotas(estado);
CREATE INDEX IF NOT EXISTS idx_cuotas_vence     ON cuotas(fecha_vence);
CREATE INDEX IF NOT EXISTS idx_pagos_cuota      ON pagos(cuota_id);
CREATE INDEX IF NOT EXISTS idx_pagos_alumno     ON pagos(alumno_id);

-- RLS
ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_cuotas" ON cuotas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_pagos"  ON pagos  FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cuotas;
ALTER PUBLICATION supabase_realtime ADD TABLE pagos;
