// src/utils/config.js
// Valores PÚBLICOS de conexión — a propósito no son secretos.
// La seguridad real la dan las políticas RLS que ya probamos en el
// Checkpoint 2, no el que esta clave esté "escondida".
export const SUPABASE_URL      = 'https://agjsadxuvqcazfkbjkmp.supabase.co'; // reemplaza con el tuyo
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnanNhZHh1dnFjYXpma2Jqa21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyOTcyODYsImV4cCI6MjA5ODg3MzI4Nn0.zeO4QQXcPWlutDG0rSnyItZ0krtGkbYc1pT5PolacRA';                // reemplaza con la tuya

// Clave de localStorage donde vamos a guardar el "carnet" (JWT) de sesión
export const SESSION_KEY = 'sofxia_session';


// En producción (Vercel), el frontend y las funciones /api van a vivir
// en el mismo dominio, así que esto será '' (vacío, rutas relativas).
// En desarrollo local, Live Server y nuestro servidor de pruebas usan
// puertos distintos, así que hay que ser explícitos.
// Antes: cuando se estaba en produccion haciendo pruebas locales se usaba esta URL, pero ahora que ya estamos en producción
// export const API_BASE_URL = 'http://127.0.0.1:3000';

// Después:
// src/views/utils/config.js
// Detecta automáticamente si estás en desarrollo local (Live Server,
// siempre en 127.0.0.1) o en producción (cualquier otro dominio real).
export const API_BASE_URL = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:3000'
  : '';