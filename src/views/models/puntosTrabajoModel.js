// src/models/puntosTrabajoModel.js
import { apiFetch } from '../utils/apiClient.js';

export async function getPuntosActivos() {
  return apiFetch('/rest/v1/tbl_puntos_trabajo', {
    params: { estado: 'eq.true', order: 'nombre_sede.asc', select: '*' }
  });
}

export async function getTodosPuntos() {
  return apiFetch('/rest/v1/tbl_puntos_trabajo', {
    params: { order: 'nombre_sede.asc', select: '*' }
  });
}

export async function crearPunto(datos) {
  return apiFetch('/rest/v1/tbl_puntos_trabajo', { method: 'POST', body: datos });
}

export async function actualizarPunto(id, cambios) {
  return apiFetch('/rest/v1/tbl_puntos_trabajo', {
    method: 'PATCH',
    params: { id: `eq.${id}` },
    body: cambios
  });
}

export async function desactivarPunto(id) {
  return actualizarPunto(id, { estado: false });
}

export async function reactivarPunto(id) {
  return actualizarPunto(id, { estado: true });
}