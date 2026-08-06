// src/views/controllers/calendarioController.js
import { getTurnosPorRango, getTurnosHoy } from '../models/turnosModel.js';
import { marcarCompletada } from '../models/actividadesModel.js';
import { mostrarToast } from './notificacionesController.js';

let _mesActual = new Date().getMonth();
let _anioActual = new Date().getFullYear();

// Colores distintos por sede, para diferenciarlas de un vistazo en la cuadrícula
const PALETA = ['#4F6BED', '#E8693A', '#2ECC71', '#9B59B6', '#F1C40F', '#1ABC9C'];
function colorPorPunto(puntoId) {
  return PALETA[puntoId % PALETA.length];
}

/** Se llama desde dashboard.html. Pinta la cuadrícula mensual del Admin. */
export async function initCalendarioAdmin() {
  document.getElementById('btn-mes-anterior')?.addEventListener('click', () => navegarMes(-1));
  document.getElementById('btn-mes-siguiente')?.addEventListener('click', () => navegarMes(1));

  // Aquí es donde escuchamos el aviso que manda turnosController.js
  document.addEventListener('turno:creado', () => cargarMes());

  await cargarMes();
}

async function navegarMes(delta) {
  _mesActual += delta;
  if (_mesActual > 11) { _mesActual = 0; _anioActual++; }
  if (_mesActual < 0) { _mesActual = 11; _anioActual--; }
  await cargarMes();
}

async function cargarMes() {
  const contenedor = document.getElementById('calendario-grid');
  if (!contenedor) return;

  document.getElementById('label-mes-anio').textContent =
    new Date(_anioActual, _mesActual, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const primerDia = `${_anioActual}-${String(_mesActual + 1).padStart(2, '0')}-01`;
  const ultimoDia = new Date(_anioActual, _mesActual + 1, 0).toISOString().slice(0, 10);

  // Solo pedimos el rango del mes visible — no todos los turnos que existan
  const turnos = await getTurnosPorRango(primerDia, ultimoDia);
  renderizarCuadricula(contenedor, _anioActual, _mesActual, turnos);
}

function renderizarCuadricula(contenedor, anio, mes, turnos) {
  const primerDiaSemana = new Date(anio, mes, 1).getDay(); // 0=domingo
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  // Agrupamos los turnos por fecha, para saber qué mostrar en cada celda
  const turnosPorFecha = {};
  for (const t of turnos) {
    (turnosPorFecha[t.fecha] ??= []).push(t);
    // ??= es "asigna solo si todavía no existe" — si es la primera vez
    // que vemos esa fecha, crea el arreglo vacío antes de meterle el turno
  }

  let html = '<div class="cal-cabecera">';
  for (const dia of ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']) {
    html += `<div class="cal-dia-nombre">${dia}</div>`;
  }
  html += '</div><div class="cal-cuerpo">';

  for (let i = 0; i < primerDiaSemana; i++) html += '<div class="cal-celda cal-celda--vacia"></div>';

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const turnosDia = turnosPorFecha[fecha] ?? [];

    html += `<div class="cal-celda"><span class="cal-numero">${d}</span>`;
    for (const t of turnosDia) {
      const nombre = t.tbl_usuarios?.nombre_completo?.split(' ')[0] ?? '—';
      const cruce = t.cruce_forzado ? '⚠️ ' : '';
      html += `<div class="cal-evento" style="border-left:3px solid ${colorPorPunto(t.punto_id)}">
        ${cruce}${nombre}<br><small>${t.hora_inicio.slice(0,5)}-${t.hora_fin.slice(0,5)}</small>
      </div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  contenedor.innerHTML = html;
}

/** Se llama desde mi-calendario.html. Pinta la agenda del Operario. */
export async function initAgendaOperario(usuarioId) {
  const contenedor = document.getElementById('lista-turnos');
  if (!contenedor) return;

  const turnos = await getTurnosHoy(usuarioId);

  if (!turnos.length) {
    contenedor.innerHTML = '<p>No tienes turnos hoy.</p>';
    return;
  }

  contenedor.innerHTML = turnos.map((t) => `
    <article class="tarjeta-turno">
      <p class="tarjeta-turno__sede">📍 ${t.tbl_puntos_trabajo?.nombre_sede ?? '—'}</p>
      <p class="tarjeta-turno__horario">🕐 ${t.hora_inicio.slice(0,5)} – ${t.hora_fin.slice(0,5)} (${t.horas_calculadas}h)</p>
      ${renderChecklist(t.tbl_actividades)}
      <button class="btn btn--tabla" style="margin-top:.75rem;" data-turno-id="${t.id}" data-accion="reportar-novedad">
        Reportar novedad
      </button>
    </article>
  `).join('');

  // Engancha cada checkbox de actividad — recuerda que marcarCompletada()
  // usa el RPC fn_marcar_actividad, no un PATCH directo (Checkpoint 4,
  // sub-paso 4.5: el Operario solo puede tocar "completada", nunca el texto)
  contenedor.querySelectorAll('[data-actividad-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      await marcarCompletada(Number(checkbox.dataset.actividadId), checkbox.checked);
    });
  });

  // Cada botón "Reportar novedad" avisa con un evento — lo escucha
  // novedadesController.js, sin que este archivo necesite conocerlo
  contenedor.querySelectorAll('[data-accion="reportar-novedad"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('novedad:abrir-modal', { detail: btn.dataset.turnoId }));
    });
  });
}

function renderChecklist(actividades) {
  if (!actividades || actividades.length === 0) return '';
  const items = actividades.map((a) => `
    <li>
      <input type="checkbox" data-actividad-id="${a.id}" ${a.completada ? 'checked' : ''} />
      <span>${a.descripcion}</span>
    </li>
  `).join('');
  return `<ul class="lista-actividades">${items}</ul>`;
}