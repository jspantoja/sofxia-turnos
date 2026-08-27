import { apiFetch } from '../utils/apiClient.js';
import { mostrarToast } from './notificacionesController.js';

export async function cargarPanelConfiguracion() {
  try {
    const rows = await apiFetch('/rest/v1/tbl_configuracion', { params: { select: 'clave,valor' } });
    if (!rows) return;
    const mapa = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));

    // Aseguramos que los inputs existan antes de asignarles valor
    if (document.getElementById('cfg-tarifa-base')) document.getElementById('cfg-tarifa-base').value = mapa['tarifa_hora_base'] || '';
    if (document.getElementById('cfg-max-horas')) document.getElementById('cfg-max-horas').value = mapa['max_horas_diarias'] || '';
    if (document.getElementById('cfg-porc-ext')) document.getElementById('cfg-porc-ext').value = mapa['porcentaje_hora_extra'] || '';
    if (document.getElementById('cfg-porc-noc')) document.getElementById('cfg-porc-noc').value = mapa['porcentaje_recargo_nocturno'] || '';
  } catch (error) {
    console.error("Error cargando configuración:", error);
    mostrarToast('Error al cargar la configuración.', 'error');
  }
}

export function initFormConfiguracion() {
  const form = document.getElementById('form-configuracion');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const tarifa = document.getElementById('cfg-tarifa-base').value;
    const maxHoras = document.getElementById('cfg-max-horas').value;
    const pExt = document.getElementById('cfg-porc-ext').value;
    const pNoc = document.getElementById('cfg-porc-noc').value;

    console.log("Intentando guardar:", { tarifa, maxHoras, pExt, pNoc });

    try {
      const cambios = [
        { clave: 'tarifa_hora_base', valor: String(tarifa) },
        { clave: 'max_horas_diarias', valor: String(maxHoras) },
        { clave: 'porcentaje_hora_extra', valor: String(pExt) },
        { clave: 'porcentaje_recargo_nocturno', valor: String(pNoc) }
      ];

      for (const item of cambios) {
        // Usamos apiFetch con el método PATCH tal como lo usan tus otros controladores
        await apiFetch(`/rest/v1/tbl_configuracion?clave=eq.${item.clave}`, {
          method: 'PATCH',
          body: { valor: item.valor }
        });
      }

      mostrarToast('¡Configuración actualizada con éxito! 🚀', 'exito');
      await cargarPanelConfiguracion();
    } catch (error) {
      console.error("Error detallado al guardar:", error);
      mostrarToast('Error al guardar los cambios.', 'error');
    }
  };
}