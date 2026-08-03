// src/models/novedadesModel.js
import { apiFetch } from '../utils/apiClient.js';

/** Trae novedades. El Admin ve todas; el Operario, según RLS, solo las de sus propios turnos. */
export async function getNovedades({ turnoId = null } = {}) {
  const params = {
    select: '*, tbl_turnos(fecha, hora_inicio, hora_fin, tbl_usuarios(nombre_completo), tbl_puntos_trabajo(nombre_sede))',
    order: 'fecha_reporte.desc'
  };
  if (turnoId) params['turno_id'] = `eq.${turnoId}`;
  return apiFetch('/rest/v1/tbl_novedades', { params });
}

/** El Operario reporta una novedad de un turno propio (RLS lo verifica). */
export async function reportarNovedad({ turnoId, tipoNovedad, descripcion }) {
  return apiFetch('/rest/v1/tbl_novedades', {
    method: 'POST',
    body: { turno_id: turnoId, tipo_novedad: tipoNovedad, descripcion }
  });
}