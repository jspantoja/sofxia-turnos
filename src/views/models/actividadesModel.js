// src/models/actividadesModel.js
import { apiFetch, apiRpc } from '../utils/apiClient.js';

export async function getActividadesPorTurno(turnoId) {
  return apiFetch('/rest/v1/tbl_actividades', {
    params: [['turno_id', `eq.${turnoId}`], ['order', 'id.asc']]
  });
}

/** Solo el Admin puede crear actividades (RLS lo restringe). */
export async function crearActividad(turnoId, descripcion) {
  return apiFetch('/rest/v1/tbl_actividades', {
    method: 'POST',
    body: { turno_id: turnoId, descripcion }
  });
}

/**
 * ¿Por qué un RPC y no un PATCH directo? Porque queremos que el Operario
 * SOLO pueda cambiar si la tarea está marcada o no (completada), pero
 * jamás pueda editar el texto de la tarea (descripcion) — eso es trabajo
 * exclusivo del Admin. RLS protege filas completas, no columnas
 * individuales; por eso la única puerta que dejamos abierta para el
 * Operario es esta función, que solo toca esa una columna por dentro.
 */
export async function marcarCompletada(actividadId, completada) {
  return apiRpc('fn_marcar_actividad', {
    p_actividad_id: actividadId,
    p_completada: completada
  });
}

export async function eliminarActividad(actividadId) {
  return apiFetch('/rest/v1/tbl_actividades', {
    method: 'DELETE',
    params: [['id', `eq.${actividadId}`]]
  });
}