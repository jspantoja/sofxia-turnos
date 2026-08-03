// src/models/operariosModel.js
import { apiFetch } from '../utils/apiClient.js';

/** Lista operarios activos (o todos, si soloActivos = false). */
export async function getOperarios(soloActivos = true) {
  const params = {
    select: 'id, email, nombre_completo, rol_id, estado, tbl_roles(nombre_rol)',
    order: 'nombre_completo.asc'
  };
  // Recuerda el patrón de "borrado lógico" del Checkpoint 1: nunca
  // eliminamos filas, solo marcamos estado = false — por eso el filtro
  // por defecto es "solo activos", para que un operario dado de baja
  // no aparezca en el selector de un turno nuevo.
  if (soloActivos) params['estado'] = 'eq.true';
  return apiFetch('/rest/v1/tbl_usuarios', { params });
}

export async function getOperarioPorId(id) {
  const resultado = await apiFetch('/rest/v1/tbl_usuarios', {
    params: { id: `eq.${id}`, select: 'id, email, nombre_completo, rol_id, estado' }
  });
  return resultado?.[0] ?? null; // el array siempre trae 0 o 1 elemento aquí
}

export async function actualizarOperario(id, cambios) {
  return apiFetch('/rest/v1/tbl_usuarios', {
    method: 'PATCH',
    params: { id: `eq.${id}` },
    body: cambios
  });
}

/** Borrado lógico — nunca DELETE. */
export async function darDeBajaOperario(id) {
  return actualizarOperario(id, { estado: false });
}

export async function reactivarOperario(id) {
  return actualizarOperario(id, { estado: true });
}
