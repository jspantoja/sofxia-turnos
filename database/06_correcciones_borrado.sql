DROP POLICY IF EXISTS "usuarios_no_delete" ON tbl_usuarios;
CREATE POLICY "usuarios_delete_admin" ON tbl_usuarios FOR DELETE USING (get_rol_id() = 1);

DROP POLICY IF EXISTS "puntos_no_delete" ON tbl_puntos_trabajo;
CREATE POLICY "puntos_delete_admin" ON tbl_puntos_trabajo FOR DELETE USING (get_rol_id() = 1);