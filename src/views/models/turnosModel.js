// src/models/turnosModel.js
import { apiFetch, apiRpc } from '../utils/apiClient.js';

/**
 * Trae los turnos dentro de un rango de fechas.
 * Nota el "select" con paréntesis: eso le pide a PostgREST que, de una vez,
 * incluya los datos de la sede y del usuario relacionados — así no
 * necesitamos hacer una segunda consulta aparte para saber el nombre
 * de la sede, por ejemplo.
 */
export async function getTurnosPorRango(fechaInicio, fechaFin, usuarioId = null) {
  const params = [
    ['select', '*, tbl_puntos_trabajo(nombre_sede, direccion), tbl_usuarios(nombre_completo), tbl_actividades(id,descripcion,completada)'],
    ['fecha', `gte.${fechaInicio}`],
    ['fecha', `lte.${fechaFin}`],   // misma clave que la de arriba — por eso necesitábamos la lista, no un objeto
    ['order', 'fecha.asc,hora_inicio.asc']
  ];
  // El operario NO necesita pasar su propio usuario_id: la política RLS
  // que ya probamos en el Checkpoint 2 filtra solo, según quién esté
  // haciendo la petición. Este parámetro solo sirve si el Admin quiere
  // ver los turnos de un operario específico.
  if (usuarioId) params.push(['usuario_id', `eq.${usuarioId}`]);

  return apiFetch('/rest/v1/tbl_turnos', { params });
}

/** Verifica cruces de horario — llama a fn_verificar_disponibilidad (Checkpoint 3). */
export async function verificarDisponibilidad({ usuarioId, fecha, horaInicio, horaFin, turnoIdExcluir = null }) {
  return apiRpc('fn_verificar_disponibilidad', {
    p_usuario_id: usuarioId,
    p_fecha: fecha,
    p_hora_inicio: horaInicio,
    p_hora_fin: horaFin,
    p_turno_id_excluir: turnoIdExcluir
  });
}

/** Consulta horas acumuladas — llama a fn_horas_acumuladas_dia (Checkpoint 3). */
export async function getHorasAcumuladasDia(usuarioId, fecha, excluirId = null) {
  const resultado = await apiRpc('fn_horas_acumuladas_dia', {
    p_usuario_id: usuarioId,
    p_fecha: fecha,
    p_excluir_id: excluirId
  });
  return Number(resultado); // Postgres devuelve el número como texto; lo convertimos
}

// ── De aquí en adelante, el mismo patrón se repite con pequeñas variaciones ──

export async function getTurnosHoy(usuarioId) {
  // Antes: const hoy = new Date().toISOString().slice(0, 10);
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

  return apiFetch('/rest/v1/tbl_turnos', {
    params: {
      select: '*, tbl_puntos_trabajo(nombre_sede, direccion), tbl_actividades(id,descripcion,completada)',
      usuario_id: `eq.${usuarioId}`,
      fecha: `eq.${hoy}`,
      estado_turno: 'neq.Cancelado',
      order: 'hora_inicio.asc'
    }
  });
}

export async function crearTurno(payload) {
  return apiFetch('/rest/v1/tbl_turnos', { method: 'POST', body: payload });
}

export async function editarTurno(turnoId, cambios) {
  return apiFetch('/rest/v1/tbl_turnos', {
    method: 'PATCH',
    params: { id: `eq.${turnoId}` },
    body: cambios
  });
}

export async function cancelarTurno(turnoId) {
  return editarTurno(turnoId, { estado_turno: 'Cancelado' });
}

export async function eliminarTurno(turnoId) {
  return apiFetch('/rest/v1/tbl_turnos', {
    method: 'DELETE',
    params: { id: `eq.${turnoId}` }
  });
}

/** Trae un turno por su ID, incluyendo datos de la sede, usuario y actividades. */
export async function getTurnoPorId(turnoId) {
  const resultado = await apiFetch('/rest/v1/tbl_turnos', {
    params: {
      id: `eq.${turnoId}`,
      select: '*, tbl_puntos_trabajo(nombre_sede,direccion), tbl_usuarios(nombre_completo), tbl_actividades(id,descripcion,completada), hora_entrada_real,hora_salida_real'
    }
  });
  return resultado?.[0] ?? null;
}

/** Trae las actividades de un turno por su ID. */
export async function marcarEntrada(turnoId) {
  return apiRpc('fn_marcar_entrada', { p_turno_id: turnoId });
}
export async function marcarSalida(turnoId) {
  return apiRpc('fn_marcar_salida', { p_turno_id: turnoId });
}


export async function actualizarEstadoTurno(turnoId, datosNuevos) {
  // Imprimimos los datos que viajan para estar seguros
  console.log("Enviando a Supabase ID:", turnoId, "Datos:", datosNuevos);

  const respuesta = await apiFetch(`/rest/v1/tbl_turnos?id=eq.${turnoId}`, {
    method: 'PATCH',
    headers: {
      'Prefer': 'return=representation',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(datosNuevos)
  });
  
  return respuesta;
}