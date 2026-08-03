  // api/auth/login.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Se requieren email y contraseña' });
  }

  const { data: usuario, error } = await supabaseAdmin
    .from('tbl_usuarios')
    .select('id, password_hash, rol_id, nombre_completo, estado')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  const MENSAJE_GENERICO = 'Credenciales inválidas';

  if (error || !usuario) {
    return res.status(401).json({ error: MENSAJE_GENERICO });
  }

  if (!usuario.estado) {
    return res.status(401).json({ error: 'Esta cuenta está desactivada.' });
  }

  const passwordValida = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordValida) {
    return res.status(401).json({ error: MENSAJE_GENERICO });
  }

  const token = jwt.sign(
    {
      sub: usuario.id,
      role: 'authenticated',
      rol_id: usuario.rol_id,
      nombre_completo: usuario.nombre_completo
    },
    process.env.SUPABASE_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '12h' }
  );

  return res.status(200).json({
    token,
    rol_id: usuario.rol_id,
    nombre_completo: usuario.nombre_completo
  });
}