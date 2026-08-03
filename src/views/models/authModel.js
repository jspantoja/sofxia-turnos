// src/models/authModel.js
import { setSession, clearSession } from '../utils/auth-guard.js';
import { API_BASE_URL } from '../utils/config.js';

/**
 * Inicia sesión llamando a nuestro propio endpoint (no a Supabase directo).
 */
export async function login(email, password) {
  const respuesta = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!respuesta.ok) {
    const data = await respuesta.json().catch(() => ({}));
    throw new Error(data.error ?? 'Error de autenticación');
  }

  const datos = await respuesta.json();
  setSession(datos);  // guarda el token en localStorage — de aquí en
                       // adelante, requireAuth() ya puede reconocer la sesión
  return datos;
}

export function logout() {
  clearSession();
}

/** Solo un Admin con sesión puede llamar esto (register.js lo verifica). */
export async function registrarUsuario(datos, adminToken) {
  const respuesta = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(datos)
  });

  if (!respuesta.ok) {
    const body = await respuesta.json().catch(() => ({}));
    const err = new Error(body.error ?? 'Error al registrar usuario');
    err.status = respuesta.status;
    throw err;
  }

  return respuesta.json();
}