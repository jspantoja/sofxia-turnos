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
      contenedor.innerHTML = '<p class="mensaje-vacio">No hay novedades registradas.</p>';
      return;
    }

    contenedor.innerHTML = `
      <table class="tabla-datos">
        <thead>
          <tr><th>Fecha</th><th>Operario</th><th>Sede</th><th>Tipo</th><th>Descripción</th></tr>
        </thead>
        <tbody>
          ${novedades.map((n) => `
            <tr>
              <td>${new Date(n.fecha_reporte).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td>${n.tbl_turnos?.tbl_usuarios?.nombre_completo ?? '—'}</td>
              <td>${n.tbl_turnos?.tbl_puntos_trabajo?.nombre_sede ?? '—'}</td>
              <td><span class="tag-novedad tag-novedad--${n.tipo_novedad.toLowerCase()}">${n.tipo_novedad}</span></td>
              <td>${n.descripcion}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (error) {
    contenedor.innerHTML = '<p class="mensaje-vacio">Error al cargar las novedades.</p>';
    console.error(error);
  }
}