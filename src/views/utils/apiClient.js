// src/utils/apiClient.js
// El único lugar del proyecto que sabe CÓMO hacer una petición a Supabase
// (headers, manejo de errores). Cada Modelo lo va a usar en vez de llamar
// fetch() directamente — así, si algo del formato de la petición cambia,
// se corrige en un solo lugar, no en 8 archivos distintos.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getToken } from './auth-guard.js';

export async function apiFetch(path, { method = 'GET', body, params } = {}) {
  const token = getToken(); // null si nadie ha iniciado sesión todavía

  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    // Si hay sesión, mandamos el JWT del usuario (para que RLS sepa quién
    // es). Si no hay sesión, mandamos la anon key — Supabase la trata
    // como "visitante sin identificar", y solo las políticas RLS marcadas
    // como públicas (como tbl_configuracion) le responden algo.
    Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`
  };

  if (method === 'POST') headers['Prefer'] = 'return=representation';


// Antes:
/* const qs = params
    ? '?' + Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : ''; */

// Ahora: acepta un objeto {clave: valor} O una lista [[clave, valor], ...]
// La segunda forma es la única manera de repetir una misma clave.
const entradas = Array.isArray(params) ? params : Object.entries(params ?? {});
const qs = entradas.length
    ? '?' + entradas.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    : '';



  const respuesta = await fetch(`${SUPABASE_URL}${path}${qs}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });

  if (respuesta.status === 409) {
    const detalle = await respuesta.json().catch(() => ({}));
    throw { tipo: 'CONFLICTO', status: 409, detalle };
  }
  if (respuesta.status === 401 || respuesta.status === 403) {
    throw { tipo: 'NO_AUTORIZADO', status: respuesta.status };
  }
  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => ({}));
    throw { tipo: 'ERROR_HTTP', status: respuesta.status, detalle };
  }

  return respuesta.status === 204 ? null : respuesta.json();
}

/** Llama a un procedimiento almacenado (RPC) — las funciones que creaste en el Checkpoint 3. */
export async function apiRpc(nombre, args = {}) {
  return apiFetch(`/rest/v1/rpc/${nombre}`, { method: 'POST', body: args });
}