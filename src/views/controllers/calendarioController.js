// src/views/controllers/calendarioController.js
import { getTurnosPorRango, getTurnosHoy } from '../models/turnosModel.js';
import { marcarCompletada } from '../models/actividadesModel.js';
import { mostrarToast } from './notificacionesController.js';

let _mesActual = new Date().getMonth();
let _anioActual = new Date().getFullYear();

// ── Estado del calendario del Admin ──────────────────────────
let _vistaAdmin = 'mes'; // 'mes' | 'semana'
let _fechaSemanaAdmin = new Date();

// Colores distintos por sede, para diferenciarlas de un vistazo en la cuadrícula
const PALETA = ['#4F6BED', '#E8693A', '#2ECC71', '#9B59B6', '#F1C40F', '#1ABC9C'];
function colorPorPunto(puntoId) {
  return PALETA[puntoId % PALETA.length];
}

/** Se llama desde dashboard.html. Pinta la cuadrícula mensual del Admin. */
export async function initCalendarioAdmin() {
  document.getElementById('btn-mes-anterior')?.addEventListener('click', () => navegarAdmin(-1));
  document.getElementById('btn-mes-siguiente')?.addEventListener('click', () => navegarAdmin(1));
  document.getElementById('btn-ver-mes')?.addEventListener('click', () => cambiarVistaAdmin('mes'));
  document.getElementById('btn-ver-semana')?.addEventListener('click', () => cambiarVistaAdmin('semana'));
  document.addEventListener('turno:creado', () => recargarVistaAdmin());
  await recargarVistaAdmin();
}

function cambiarVistaAdmin(tipo) {
  _vistaAdmin = tipo;
  document.getElementById('btn-ver-mes')?.classList.toggle('activo', tipo === 'mes');
  document.getElementById('btn-ver-semana')?.classList.toggle('activo', tipo === 'semana');
  recargarVistaAdmin();
}

async function navegarAdmin(delta) {
  if (_vistaAdmin === 'mes') {
    _mesActual += delta;
    if (_mesActual > 11) { _mesActual = 0; _anioActual++; }
    if (_mesActual < 0) { _mesActual = 11; _anioActual--; }
  } else {
    _fechaSemanaAdmin.setDate(_fechaSemanaAdmin.getDate() + delta * 7);
  }
  await recargarVistaAdmin();
}

async function recargarVistaAdmin() {
  if (_vistaAdmin === 'mes') await cargarMes();
  else await cargarSemana(_fechaSemanaAdmin, 'calendario-grid', null, 'label-mes-anio');
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
      html += `<div class="cal-evento" data-turno-id="${t.id}" style="border-left:3px solid ${colorPorPunto(t.punto_id)}">
  ${cruce}${nombre}<br><small>${t.hora_inicio.slice(0,5)}-${t.hora_fin.slice(0,5)}</small>
</div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  contenedor.innerHTML = html;

  /*  Engancha cada evento de turno para que, al hacer clic, se dispare un
      evento que turnosController.js escucha y abre el modal de detalle. */
  contenedor.querySelectorAll('[data-turno-id]').forEach((el) => {
  el.style.cursor = 'pointer';
  el.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('turno:ver-detalle', { detail: el.dataset.turnoId }));
  });
});


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



/** Genérica: sirve tanto para el Admin (usuarioId=null=todos) como para el Operario (usuarioId=el suyo). */
async function cargarSemana(fechaBase, contenedorId, usuarioId, labelId) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const inicio = new Date(fechaBase);
  inicio.setDate(inicio.getDate() - inicio.getDay()); // retrocede hasta el domingo
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);

  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const label = document.getElementById(labelId);
  if (label) {
    label.textContent = `${inicio.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – ${fin.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  const turnos = await getTurnosPorRango(fmt(inicio), fmt(fin), usuarioId);
  renderizarSemana(contenedor, inicio, turnos);
}

function renderizarSemana(contenedor, inicioSemana, turnos) {
  const turnosPorFecha = {};
  for (const t of turnos) (turnosPorFecha[t.fecha] ??= []).push(t);

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  let html = '<div class="semana-grid">';
  for (let i = 0; i < 7; i++) {
    const dia = new Date(inicioSemana);
    dia.setDate(dia.getDate() + i);
    const fecha = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
    const turnosDia = turnosPorFecha[fecha] ?? [];
    const esHoy = fecha === hoyStr;

    html += `<div class="semana-columna ${esHoy ? 'semana-columna--hoy' : ''}">
      <div class="semana-dia-header">
        <span>${dia.toLocaleDateString('es-CO', { weekday: 'short' })}</span> <strong>${dia.getDate()}</strong>
      </div>
      <div class="semana-turnos">
        ${turnosDia.map((t) => `
          <div class="cal-evento" data-turno-id="${t.id}" style="border-left:3px solid ${colorPorPunto(t.punto_id)}">
            ${t.cruce_forzado ? '⚠️ ' : ''}${t.tbl_usuarios?.nombre_completo?.split(' ')[0] ?? t.tbl_puntos_trabajo?.nombre_sede ?? ''}
            <br><small>${t.hora_inicio.slice(0,5)}-${t.hora_fin.slice(0,5)}</small>
          </div>`).join('') || '<p class="semana-vacio">—</p>'}
      </div>
    </div>`;
  }
  html += '</div>';
  contenedor.innerHTML = html;

  contenedor.querySelectorAll('[data-turno-id]').forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('turno:ver-detalle', { detail: el.dataset.turnoId }));
    });
  });
}

/** Calendario real para el Operario — semana o mes, con toggle. */
export async function initCalendarioOperario(usuarioId) {
  let vista = 'semana';
  const fechaRef = new Date();

  document.getElementById('btn-op-ver-semana')?.addEventListener('click', () => { vista = 'semana'; render(); });
  document.getElementById('btn-op-ver-mes')?.addEventListener('click', () => { vista = 'mes'; render(); });
  document.getElementById('btn-op-anterior')?.addEventListener('click', () => { mover(-1); });
  document.getElementById('btn-op-siguiente')?.addEventListener('click', () => { mover(1); });
  document.addEventListener('turno:creado', () => render());

  function mover(delta) {
    if (vista === 'semana') fechaRef.setDate(fechaRef.getDate() + delta * 7);
    else fechaRef.setMonth(fechaRef.getMonth() + delta);
    render();
  }

  async function render() {
    document.getElementById('btn-op-ver-semana')?.classList.toggle('activo', vista === 'semana');
    document.getElementById('btn-op-ver-mes')?.classList.toggle('activo', vista === 'mes');
    if (vista === 'semana') {
      await cargarSemana(fechaRef, 'calendario-operario-grid', usuarioId, 'label-mes-operario');
    } else {
      const label = document.getElementById('label-mes-operario');
      if (label) label.textContent = fechaRef.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      const anio = fechaRef.getFullYear(), mes = fechaRef.getMonth();
      const primerDia = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
      const ultimoDia = new Date(anio, mes + 1, 0).toISOString().slice(0, 10);
      const turnos = await getTurnosPorRango(primerDia, ultimoDia, usuarioId);
      renderizarCuadricula(document.getElementById('calendario-operario-grid'), anio, mes, turnos);
    }
  }

  await render();
}