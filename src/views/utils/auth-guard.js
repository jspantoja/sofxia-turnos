// src/utils/auth-guard.js
// Maneja la sesión guardada en el navegador (localStorage) y protege
// rutas. Importante: esto es solo EXPERIENCIA DE USUARIO, no seguridad
// real — la seguridad real ya la pusimos en las políticas RLS. Si alguien
// edita este archivo en su propio navegador para saltarse la protección,
// RLS lo sigue bloqueando del lado del servidor, sin importar qué haga aquí.

import { SESSION_KEY } from './config.js';

/** Lee el "contenido" de un JWT sin verificar su firma (eso ya lo verificó el servidor). */
function decodePayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Devuelve la sesión completa { token, rol_id, nombre_completo } o null si no hay ninguna. */
export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    const payload = decodePayload(session.token);
    // Si el token ya venció (recuerda: expiresIn: '12h' en login.js), la
    // borramos y actuamos como si no hubiera sesión.
    if (!payload || payload.exp * 1000 < Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function getRolId() {
  return getSession()?.rol_id ?? null;
}

/** Se llama justo después de un login exitoso, para "recordar" la sesión. */
export function setSession({ token, rol_id, nombre_completo }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, rol_id, nombre_completo }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Protege una vista: si no hay sesión, redirige al login.
 * Si rolRequerido no coincide, redirige a donde SÍ le corresponde a ese rol.
 */
export function requireAuth(rolRequerido = null) {
  const session = getSession();

  if (!session) {
    window.location.href = '/index.html';
    return false;
  }

  if (rolRequerido !== null && session.rol_id !== rolRequerido) {
    window.location.href = session.rol_id === 1 ? '/dashboard.html' : '/mi-calendario.html';
    return false;
  }

  return true;
}

export function logout() {
  clearSession();
  window.location.href = '/index.html';
}


/** Extrae el usuario_id (el "sub" del JWT) de la sesión actual, o null si no hay sesión. */
export function getUsuarioId() {
  const session = getSession();
  if (!session) return null;
  try {
    const base64 = session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)).sub;
  } catch {
    return null;
  }
}