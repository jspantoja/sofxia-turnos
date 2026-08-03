-- ============================================================
-- SOFXIA — 03_funciones_rpc.sql
-- Ejecutar DESPUÉS de 01_schema.sql y 02_rls_policies.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
--  fn_verificar_disponibilidad
--  Devuelve los turnos que CHOCAN con el horario propuesto.
--  0 filas devueltas = no hay cruce, se puede asignar tranquilo.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_verificar_disponibilidad(
  p_usuario_id       UUID,
  p_fecha            DATE,
  p_hora_inicio      TIME,
  p_hora_fin         TIME,
  p_turno_id_excluir INT DEFAULT NULL  -- se usa solo al EDITAR un turno existente
)
RETURNS TABLE (
  turno_id    INT,
  punto_id    INT,
  hora_inicio TIME,
  hora_fin    TIME,
  nombre_sede VARCHAR
)
-- SECURITY DEFINER: esta función necesita revisar TODOS los turnos del
-- operario en cuestión, sin que las políticas RLS del que hace la consulta
-- (el Admin) se lo restrinjan de alguna forma inesperada.
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS turno_id,
    t.punto_id,
    t.hora_inicio,
    t.hora_fin,
    p.nombre_sede
  FROM tbl_turnos t
  JOIN tbl_puntos_trabajo p ON p.id = t.punto_id
  WHERE t.usuario_id   = p_usuario_id
    AND t.fecha        = p_fecha
    AND t.estado_turno <> 'Cancelado'          -- un turno cancelado no cuenta como cruce
    AND (p_turno_id_excluir IS NULL OR t.id <> p_turno_id_excluir)
    -- ↓ la fórmula que acabamos de explicar arriba
    AND p_hora_inicio < t.hora_fin
    AND p_hora_fin    > t.hora_inicio;
END;
$$;

-- ─────────────────────────────────────────────────────────────
--  fn_horas_acumuladas_dia
--  Suma las horas que el operario YA tiene programadas ese día.
--  La usa horasCalculator.js (parámetro horasYaAcumuladasEseDia)
--  para saber, con datos reales, cuánto lleva antes de calcular
--  si el turno nuevo genera horas extra (RN-03).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_horas_acumuladas_dia(
  p_usuario_id UUID,
  p_fecha      DATE,
  p_excluir_id INT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(horas_calculadas), 0)   -- COALESCE: si no hay ningún turno
  INTO v_total                                 -- todavía, SUM daría NULL, no 0
  FROM tbl_turnos
  WHERE usuario_id   = p_usuario_id
    AND fecha        = p_fecha
    AND estado_turno <> 'Cancelado'
    AND (p_excluir_id IS NULL OR id <> p_excluir_id);

  RETURN v_total;
END;
$$;