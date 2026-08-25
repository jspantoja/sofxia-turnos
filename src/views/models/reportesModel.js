import { apiRpc } from '../utils/apiClient.js';

export async function calcularPrenomina(fechaInicio, fechaFin) {
  return apiRpc('fn_calcular_prenomina', {
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin
  });
}