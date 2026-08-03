// test-apiclient.js — SOLO para probar, desechable.
// Le damos a Node una versión "de mentira" de localStorage, solo para
// esta prueba — el código real (auth-guard.js) nunca se modifica.
// getItem() devuelve null a propósito: simula "todavía no hay sesión".
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

import { apiFetch } from './src/utils/apiClient.js';

const config = await apiFetch('/rest/v1/tbl_configuracion', {
  params: { select: 'clave,valor' }
});

console.log('Configuración leída desde Supabase:', config);