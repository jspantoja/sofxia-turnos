-- ============================================================
-- SOFXIA — 04_correcciones.sql
-- Ejecutar DESPUÉS de 01, 02, 03.
-- ============================================================

-- Quitamos el permiso amplio de UPDATE que tenía el Operario sobre
-- tbl_actividades (le permitía editar CUALQUIER columna, incluida
-- la descripción de la tarea).
DROP POLICY IF EXISTS "actividades_update" ON tbl_actividades;

-- El Admin sí conserva edición directa y completa.
CREATE POLICY "actividades_update_admin"
  ON tbl_actividades FOR UPDATE
  USING (get_rol_id() = 1);

-- El Operario ya NO tiene una política de UPDATE directo — su único
-- camino es esta función, que solo toca la columna "completada".
CREATE OR REPLACE FUNCTION fn_marcar_actividad(
  p_actividad_id INT,
  p_completada   BOOLEAN
)
RETURNS tbl_actividades
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fila tbl_actividades;
BEGIN
  -- Verifica que la actividad pertenezca a un turno del usuario en
  -- sesión (o que sea Admin) antes de dejarlo continuar.
  IF NOT EXISTS (
    SELECT 1 FROM tbl_actividades a
    JOIN tbl_turnos t ON t.id = a.turno_id
    WHERE a.id = p_actividad_id
      AND (t.usuario_id = auth.uid() OR (auth.jwt() ->> 'rol_id')::int = 1)
  ) THEN
    RAISE EXCEPTION 'No autorizado para modificar esta actividad';
  END IF;

  UPDATE tbl_actividades SET completada = p_completada
  WHERE id = p_actividad_id
  RETURNING * INTO v_fila;

  RETURN v_fila;
END;
$$;