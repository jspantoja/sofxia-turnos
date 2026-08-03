// test-login.js — SOLO para probar. No es el servidor final, lo borramos después.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

//console.log('¿Se leyó la URL?', process.env.SUPABASE_URL);

// service_role: la única clave con permiso de saltarse RLS.
// Por eso esto SOLO puede vivir en un archivo que corre en un servidor,
// nunca en código que se envía al navegador de un usuario.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function probarLogin(email, passwordEnTextoPlano) {
  // 1. Buscar el usuario por email
  const { data: usuario, error } = await supabaseAdmin
    .from('tbl_usuarios')
    .select('id, password_hash, rol_id, nombre_completo, estado')
    .eq('email', email)
    .single();

  if (error || !usuario) {
    console.log('❌ Usuario no encontrado:', error?.message);
    return;
  }

  // 2. Comparar la contraseña escrita contra el hash guardado
  //    (nunca "desciframos" el hash — bcrypt solo puede comparar, no revertir)
  const passwordValida = await bcrypt.compare(passwordEnTextoPlano, usuario.password_hash);
  console.log('¿Contraseña correcta?', passwordValida);
  if (!passwordValida) return;

  // 3. Generar el "carnet temporal" (JWT), firmado con el Legacy JWT Secret
  //    El claim "role: authenticated" es el que hace que get_rol_id() de RLS
  //    funcione — sin ese claim exacto, Postgres trataría la petición como anónima.
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

  console.log('✅ Token generado:');
  console.log(token);
}

probarLogin('admin@sofxia.co', 'MiNuevaClaveSegura456'); // usa TU contraseña real, no esta de ejemplo