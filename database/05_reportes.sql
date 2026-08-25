-- ============================================================
-- SOFXIA — 05_reportes.sql
-- Ejecutar DESPUÉS de 01, 02, 03, 04.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calcular_prenomina(
  p_fecha_inicio DATE,
  p_fecha_fin    DATE
)
RETURNS TABLE (
  usuario_id              UUID,
  nombre_completo         VARCHAR,
  email                   VARCHAR,
  total_turnos            BIGINT,
  horas_ordinarias        NUMERIC,
  horas_extra             NUMERIC,
  horas_recargo_nocturno  NUMERIC,
  horas_totales           NUMERIC
)
-- SECURITY DEFINER + verificación manual de rol: esta función agrega
-- datos de TODOS los operarios, así que no puede depender de las
-- políticas RLS normales (esas solo dejan ver los datos propios).
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  IF (auth.jwt() ->> 'rol_id')::int <> 1 THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol Administrador';
  END IF;

  RETURN QUERY
  SELECT
    u.id, u.nombre_completo, u.email,
    COUNT(t.id),
    COALESCE(SUM(t.horas_ordinarias), 0),
    COALESCE(SUM(t.horas_extra), 0),
    COALESCE(SUM(t.horas_recargo_nocturno), 0),
    COALESCE(SUM(t.horas_calculadas), 0)
  FROM tbl_turnos t
  JOIN tbl_usuarios u ON u.id = t.usuario_id
  WHERE t.fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    AND t.estado_turno <> 'Cancelado'
  GROUP BY u.id, u.nombre_completo, u.email
  ORDER BY u.nombre_completo;
END;
$$;