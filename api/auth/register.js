// api/auth/register.js
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

  // ── 1. Verificar que quien llama es un Administrador ──────────
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, ''); // quita el prefijo "Bearer "

  if (!token) {
    return res.status(401).json({ error: 'Se requiere autenticación' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  if (payload.rol_id !== 1) {
    return res.status(403).json({ error: 'Sólo los administradores pueden registrar operarios' });
  }

  // ── 2. Validar los datos del nuevo usuario ─────────────────────
  const { email, password, nombre_completo, rol_id = 2 } = req.body ?? {};

  if (!email || !password || !nombre_completo) {
    return res.status(400).json({ error: 'Se requieren: email, password, nombre_completo' });
  }

  // ── 3. Cifrar la contraseña (nunca se guarda en texto plano) ───
  const password_hash = await bcrypt.hash(password, 10);

  // ── 4. Insertar en la base de datos ─────────────────────────────
  const { data, error } = await supabaseAdmin
    .from('tbl_usuarios')
    .insert({
      email: email.toLowerCase().trim(),
      password_hash,
      rol_id: Number(rol_id),
      nombre_completo: nombre_completo.trim(),
      estado: true
    })
    .select('id, email, nombre_completo, rol_id')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Violación de la restricción UNIQUE en email — ya viste esto en 01_schema.sql
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    return res.status(500).json({ error: 'Error al registrar el usuario', detalle: error.message });
  }

  return res.status(201).json(data);
}