-- ============================================================
-- SOFXIA — 02_rls_policies.sql
-- Ejecutar DESPUÉS de 01_schema.sql
-- ============================================================

-- Función reutilizable: lee el rol_id desde el token de sesión
CREATE OR REPLACE FUNCTION get_rol_id()
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'rol_id')::int;
$$;

-- ── tbl_usuarios ──────────────────────────────
ALTER TABLE tbl_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuarios_select" ON tbl_usuarios FOR SELECT
  USING (id = auth.uid() OR get_rol_id() = 1);
CREATE POLICY "usuarios_insert" ON tbl_usuarios FOR INSERT
  WITH CHECK (get_rol_id() = 1);
CREATE POLICY "usuarios_update" ON tbl_usuarios FOR UPDATE
  USING (id = auth.uid() OR get_rol_id() = 1);
CREATE POLICY "usuarios_no_delete" ON tbl_usuarios FOR DELETE
  USING (false);

-- ── tbl_puntos_trabajo ────────────────────────
ALTER TABLE tbl_puntos_trabajo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "puntos_select" ON tbl_puntos_trabajo FOR SELECT USING (true);
CREATE POLICY "puntos_insert" ON tbl_puntos_trabajo FOR INSERT WITH CHECK (get_rol_id() = 1);
CREATE POLICY "puntos_update" ON tbl_puntos_trabajo FOR UPDATE USING (get_rol_id() = 1);
CREATE POLICY "puntos_no_delete" ON tbl_puntos_trabajo FOR DELETE USING (false);

-- ── tbl_turnos ────────────────────────────────
ALTER TABLE tbl_turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turnos_select" ON tbl_turnos FOR SELECT
  USING (usuario_id = auth.uid() OR get_rol_id() = 1);
CREATE POLICY "turnos_insert" ON tbl_turnos FOR INSERT WITH CHECK (get_rol_id() = 1);
CREATE POLICY "turnos_update" ON tbl_turnos FOR UPDATE USING (get_rol_id() = 1);
CREATE POLICY "turnos_delete" ON tbl_turnos FOR DELETE USING (get_rol_id() = 1);

-- ── tbl_actividades ───────────────────────────
ALTER TABLE tbl_actividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actividades_select" ON tbl_actividades FOR SELECT
  USING (EXISTS (SELECT 1 FROM tbl_turnos t WHERE t.id = turno_id AND (t.usuario_id = auth.uid() OR get_rol_id() = 1)));
CREATE POLICY "actividades_insert" ON tbl_actividades FOR INSERT WITH CHECK (get_rol_id() = 1);
CREATE POLICY "actividades_update" ON tbl_actividades FOR UPDATE
  USING (get_rol_id() = 1 OR EXISTS (SELECT 1 FROM tbl_turnos t WHERE t.id = turno_id AND t.usuario_id = auth.uid()));

-- ── tbl_novedades ─────────────────────────────
ALTER TABLE tbl_novedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "novedades_select" ON tbl_novedades FOR SELECT
  USING (get_rol_id() = 1 OR EXISTS (SELECT 1 FROM tbl_turnos t WHERE t.id = turno_id AND t.usuario_id = auth.uid()));
CREATE POLICY "novedades_insert" ON tbl_novedades FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tbl_turnos t WHERE t.id = turno_id AND t.usuario_id = auth.uid()));

-- ── tbl_configuracion ─────────────────────────
ALTER TABLE tbl_configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select_todos" ON tbl_configuracion FOR SELECT USING (true);
CREATE POLICY "config_update_admin" ON tbl_configuracion FOR UPDATE USING (get_rol_id() = 1);

-- ── tbl_roles ─────────────────────────────────
ALTER TABLE tbl_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_todos" ON tbl_roles FOR SELECT USING (true);