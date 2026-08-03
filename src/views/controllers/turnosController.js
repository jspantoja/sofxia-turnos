// src/views/controllers/turnosController.js
import {
  verificarDisponibilidad,
  getHorasAcumuladasDia,
  crearTurno
} from '../models/turnosModel.js';
import { calcularDesgloseHoras } from '../utils/horasCalculator.js';
import { apiFetch } from '../utils/apiClient.js';
import { mostrarToast } from './notificacionesController.js';

// Guarda temporalmente los datos del formulario cuando hay que preguntar
// "¿forzar de todas formas?" — así, si el Admin confirma, no hace falta
// que vuelva a llenar el formulario desde cero.
let _pendientePayload = null;

/** Se llama desde dashboard.html, una sola vez, al cargar la página. */
export function initFormTurno() {
  const form = document.getElementById('form-turno');
  if (!form) return; // si esta vista no tiene el formulario, no hace nada

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    await procesarFormTurno(form, false); // false = todavía no ha forzado nada
  });

  document.getElementById('btn-forzar-asignacion')
    ?.addEventListener('click', () => forzarAsignacion());
}

async function procesarFormTurno(form, forzarCruce) {
  const datos = {
    usuario_id: form.querySelector('[name="usuario_id"]').value,
    punto_id: Number(form.querySelector('[name="punto_id"]').value),
    fecha: form.querySelector('[name="fecha"]').value,
    hora_inicio: form.querySelector('[name="hora_inicio"]').value,
    hora_fin: form.querySelector('[name="hora_fin"]').value
  };

  try {
    // ── PASO 1: ¿hay cruce? ──────────────────────────────────
    const conflictos = await verificarDisponibilidad({
      usuarioId: datos.usuario_id,
      fecha: datos.fecha,
      horaInicio: datos.hora_inicio,
      horaFin: datos.hora_fin
    });

    if (conflictos.length > 0 && !forzarCruce) {
      // Hay cruce, y el Admin todavía no dijo "de todas formas" — nos
      // detenemos aquí, sin guardar nada, y avisamos.
      const turnoConflicto = conflictos[0];
      mostrarToast(
        `Cruce con turno existente (${turnoConflicto.hora_inicio}-${turnoConflicto.hora_fin}) en ${turnoConflicto.nombre_sede}`,
        'advertencia'
      );
      document.getElementById('modal-cruce').hidden = false;
      _pendientePayload = datos; // lo guardamos para reusarlo si confirma
      return;
    }

    // ── PASO 2: calcular el desglose de horas ────────────────
    const config = await obtenerConfig();
    const horasAcumuladas = await getHorasAcumuladasDia(datos.usuario_id, datos.fecha);
    const desglose = calcularDesgloseHoras(datos.hora_inicio, datos.hora_fin, horasAcumuladas, config);

    // ── PASO 3: guardar el turno ──────────────────────────────
    await crearTurno({
      ...datos,
      horas_ordinarias: desglose.horasOrdinarias,
      horas_extra: desglose.horasExtra,
      horas_recargo_nocturno: desglose.horasRecargoNocturno,
      horas_calculadas: desglose.horasTotales,
      estado_turno: 'Programado',
      cruce_forzado: forzarCruce && conflictos.length > 0
    });

    document.getElementById('modal-cruce').hidden = true;
    _pendientePayload = null;
    form.reset();
    mostrarToast('Turno asignado correctamente ✓', 'exito');
    document.dispatchEvent(new CustomEvent('turno:creado')); // avisa a otros Controladores

  } catch (error) {
    mostrarToast(`Error: ${error.detalle?.message ?? 'Error inesperado'}`, 'error');
  }
}

/** Se llama cuando el Admin hace clic en "Asignar de todas formas" del modal. */
async function forzarAsignacion() {
  if (!_pendientePayload) return;
  const form = document.getElementById('form-turno');
  await procesarFormTurno(form, true); // true = esta vez SÍ fuerza
}

/** Lee los parámetros configurables (los mismos 4 valores que ya viste varias veces). */
async function obtenerConfig() {
  const rows = await apiFetch('/rest/v1/tbl_configuracion', { params: { select: 'clave,valor' } });
  const mapa = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
  return {
    maxHorasDiarias: Number(mapa['max_horas_diarias']),
    horaInicioNocturno: mapa['hora_inicio_nocturno'],
    horaFinNocturno: mapa['hora_fin_nocturno']
  };
}