// src/views/controllers/novedadesController.js
import { reportarNovedad, getNovedades } from '../models/novedadesModel.js';
import { mostrarToast } from './notificacionesController.js';

/** Se llama desde mi-calendario.html — engancha el modal de reporte. */
export function initModalNovedad() {
  const modal = document.getElementById('modal-novedad');
  const form = document.getElementById('form-novedad');
  if (!modal || !form) return;

  // Cualquier otro Controlador puede "pedir" que se abra este modal,
  // solo disparando este evento — sin conocer los detalles de adentro.
  document.addEventListener('novedad:abrir-modal', (evento) => {
    form.dataset.turnoId = evento.detail; // guardamos a qué turno pertenece
    modal.hidden = false;
  });

  document.getElementById('btn-cerrar-novedad')
    ?.addEventListener('click', () => { modal.hidden = true; });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    try {
      await reportarNovedad({
        turnoId: form.dataset.turnoId,
        tipoNovedad: form.querySelector('[name="tipo_novedad"]').value,
        descripcion: form.querySelector('[name="descripcion"]').value.trim()
      });
      mostrarToast('Novedad reportada correctamente ✓', 'exito');
      modal.hidden = true;
      form.reset();
    } catch {
      mostrarToast('Error al reportar la novedad.', 'error');
    }
  });
}

/** Se llama desde dashboard.html — pinta la tabla de novedades para el Admin. */
export async function cargarPanelNovedades() {
  const contenedor = document.getElementById('tabla-novedades');
  if (!contenedor) return;

  try {
    const novedades = await getNovedades();

    if (!novedades.length) {
      contenedor.innerHTML = '<p>No hay novedades registradas.</p>';
      return;
    }

    contenedor.innerHTML = novedades.map((n) => `
      <tr>
        <td>${n.tbl_turnos?.tbl_usuarios?.nombre_completo ?? '—'}</td>
        <td>${n.tipo_novedad}</td>
        <td>${n.descripcion}</td>
      </tr>
    `).join('');
  } catch (error) {
    // Ahora, en vez de quedarse en "Cargando..." para siempre, se ve
    // el problema real tanto en pantalla como en la consola.
    contenedor.innerHTML = '<p>Error al cargar las novedades.</p>';
    console.error('Error en cargarPanelNovedades:', error);
  }
}