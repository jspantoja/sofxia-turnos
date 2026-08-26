// src/views/controllers/turnosController.js
import {
  verificarDisponibilidad,
  getHorasAcumuladasDia,
  crearTurno,
  getTurnosPorRango // Gemini: Importamos esta función para consultar los turnos del día
} from '../models/turnosModel.js';
import { calcularDesgloseHoras } from '../utils/horasCalculator.js';
import { apiFetch } from '../utils/apiClient.js';
import { mostrarToast } from './notificacionesController.js';
import { crearActividad } from '../models/actividadesModel.js';
import { actualizarEstadoTurno } from '../models/turnosModel.js';

// Guarda temporalmente los datos del formulario cuando hay que preguntar
// "¿forzar de todas formas?" — así, si el Admin confirma, no hace falta
// que vuelva a llenar el formulario desde cero.
let _pendientePayload = null;


//---------------------------------------------------------------------------------------------------------------------

// Gemini: Helper para convertir "HH:MM" a minutos y facilitar cálculos
function aMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

//---------------------------------------------------------------------------------------------------------------------


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


    //---------------------------------------------------------------------------------------------------------------------

    // GEMINI: PASO 1.5: PAQUETE E - Validar margen de desplazamiento (RN-02)
    let advertenciaDesplazamiento = null;
    const MINUTOS_MARGEN = 60; // Configurable: 1 hora de margen mínimo

    if (conflictos.length === 0) { 
      // Solo evaluamos el viaje si no hay un cruce directo
      const turnosDelDia = await getTurnosPorRango(datos.fecha, datos.fecha, datos.usuario_id);

    for (const t of turnosDelDia) {
        if (t.punto_id !== datos.punto_id && t.estado_turno !== 'Cancelado') {
          const iniNuevo = aMinutos(datos.hora_inicio);
          const finNuevo = aMinutos(datos.hora_fin);
          const iniExist = aMinutos(t.hora_inicio);
          const finExist = aMinutos(t.hora_fin);

          // Si el nuevo empieza después del existente, evaluamos la diferencia
          if (iniNuevo >= finExist && (iniNuevo - finExist) < MINUTOS_MARGEN) {
            advertenciaDesplazamiento = `El operario termina un turno a las ${t.hora_fin} en "${t.tbl_puntos_trabajo.nombre_sede}". Solo tendría ${iniNuevo - finExist} mins de desplazamiento.`;
            break;
          }
          // Si el nuevo termina antes del existente, evaluamos la diferencia
          if (iniExist >= finNuevo && (iniExist - finNuevo) < MINUTOS_MARGEN) {
            advertenciaDesplazamiento = `El operario empieza otro turno a las ${t.hora_inicio} en "${t.tbl_puntos_trabajo.nombre_sede}". Solo tendría ${iniExist - finNuevo} mins de desplazamiento.`;
            break;
         }
        }
      }
    }
  
//---------------------------------------------------------------------------------------------------------------------

    // if (conflictos.length > 0 && !forzarCruce) {
    //   // Hay cruce, y el Admin todavía no dijo "de todas formas" — nos
    //   // detenemos aquí, sin guardar nada, y avisamos.
    //   const turnoConflicto = conflictos[0];
    //   mostrarToast(
    //     `Cruce con turno existente (${turnoConflicto.hora_inicio}-${turnoConflicto.hora_fin}) en ${turnoConflicto.nombre_sede}`,
    //     'advertencia'
    //   );


    //GEMINI ---------------------------------------------------------------------------------------------------------------------
    if ((conflictos.length > 0 || advertenciaDesplazamiento) && !forzarCruce) {
      const turnoConflicto = conflictos[0];
      const mensaje = conflictos.length > 0
        ? `Cruce con turno existente (${turnoConflicto.hora_inicio}-${turnoConflicto.hora_fin}) en ${turnoConflicto.nombre_sede}`
        : advertenciaDesplazamiento;

      mostrarToast(mensaje, 'advertencia');

      document.getElementById('detalle-cruce').textContent = mensaje;
    //GEMINI ---------------------------------------------------------------------------------------------------------------------

      document.getElementById('modal-cruce').hidden = false;
      _pendientePayload = datos; // lo guardamos para reusarlo si confirma
      return;
    }

    // ── PASO 2: calcular el desglose de horas ────────────────
    const config = await obtenerConfig();
    const horasAcumuladas = await getHorasAcumuladasDia(datos.usuario_id, datos.fecha);
    const desglose = calcularDesgloseHoras(datos.hora_inicio, datos.hora_fin, horasAcumuladas, config);

    // ── PASO 3: guardar el turno ──────────────────────────────
   /*  await crearTurno({
      ...datos,
      horas_ordinarias: desglose.horasOrdinarias,
      horas_extra: desglose.horasExtra,
      horas_recargo_nocturno: desglose.horasRecargoNocturno,
      horas_calculadas: desglose.horasTotales,
      estado_turno: 'Programado',
      cruce_forzado: forzarCruce && conflictos.length > 0
    });
 */
    const turnoCreado = await crearTurno({
  ...datos,
  horas_ordinarias: desglose.horasOrdinarias,
  horas_extra: desglose.horasExtra,
  horas_recargo_nocturno: desglose.horasRecargoNocturno,
  horas_calculadas: desglose.horasTotales,
  estado_turno: 'Programado',
  cruce_forzado: forzarCruce && conflictos.length > 0
});

// NUEVO: crea una actividad por cada línea no vacía del textarea
const turnoId = turnoCreado?.[0]?.id;
const campoActividades = form.querySelector('[name="actividades"]');

if (turnoId && campoActividades?.value.trim()) {
const tareas = campoActividades.value.split(',').map((l) => l.trim()).filter(Boolean);
  for (const descripcion of tareas) {
    try { await crearActividad(turnoId, descripcion); } catch { /* no bloquea si una falla */ }
  }
}
    // Limpieza y notificaciones de éxito
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

/** Lee los parámetros configurables */
async function obtenerConfig() {
  const rows = await apiFetch('/rest/v1/tbl_configuracion', { params: { select: 'clave,valor' } });
  const mapa = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
  return {
    maxHorasDiarias: Number(mapa['max_horas_diarias']),
    horaInicioNocturno: mapa['hora_inicio_nocturno'],
    horaFinNocturno: mapa['hora_fin_nocturno']
  };
}


/** Se llama desde mi-calendario.html — pinta la lista de turnos para el Operario. */
import {
  getTurnoPorId, cancelarTurno, eliminarTurno
} from '../models/turnosModel.js';

let _turnoDetalleActualId = null;

/** Se llama una sola vez desde dashboard.html, junto a initFormTurno(). */
export function initDetalleTurno() {
  const modal = document.getElementById('modal-detalle-turno');
  if (!modal) return;

  document.addEventListener('turno:ver-detalle', async (evento) => {
    _turnoDetalleActualId = evento.detail;
    await cargarDetalleTurno();
    modal.hidden = false;
  });






  document.getElementById('btn-marcar-descanso')?.addEventListener('click', async () => {
  if (!confirm('¿Deseas marcar este día como Descanso?')) return;
  
  try {
    // 1. Ejecutamos la actualización
    await actualizarEstadoTurno(_turnoDetalleActualId, {
      estado_turno: 'Cancelado',
      horas_ordinarias: 0,
      horas_extra: 0,
      horas_recargo_nocturno: 0,
      horas_calculadas: 0
    });

    // 2. Comprobación de seguridad: Consultamos el turno otra vez para ver si cambió
    const turnoVerificado = await getTurnoPorId(_turnoDetalleActualId);
    console.log("Turno después de actualizar:", turnoVerificado);

    if (turnoVerificado && turnoVerificado.estado_turno === 'Cancelado') {
      mostrarToast('Marcado como Descanso correctamente.', 'exito');
      document.getElementById('modal-detalle-turno').hidden = true;
      document.dispatchEvent(new CustomEvent('turno:creado'));
    } else {
      // Si entra aquí, Supabase bloqueó el cambio por RLS
      alert('La base de datos rechazó el cambio. Revisa las políticas RLS de Supabase.');
    }

  } catch (error) {
    console.error('Error detallado al actualizar:', error);
    mostrarToast('Error al cambiar el estado.', 'error');
  }
});






  document.getElementById('btn-cerrar-detalle-turno')?.addEventListener('click', () => { modal.hidden = true; });

  document.getElementById('btn-agregar-actividad')?.addEventListener('click', async () => {
    const input = document.getElementById('txt-nueva-actividad');
    const tareas = input.value.split(',').map((t) => t.trim()).filter(Boolean);
    if (!tareas.length) return;
    for (const descripcion of tareas) {
      try { await crearActividad(_turnoDetalleActualId, descripcion); } catch { /* continúa con las demás */ }
    }
    input.value = '';
    await cargarDetalleTurno(); // refresca la lista dentro del mismo modal
  });

  document.getElementById('btn-cancelar-turno-detalle')?.addEventListener('click', async () => {
    if (!confirm('¿Cancelar este turno? Queda marcado como Cancelado, sin borrar su historial.')) return;
    await cancelarTurno(_turnoDetalleActualId);
    mostrarToast('Turno cancelado.', 'advertencia');
    modal.hidden = true;
    document.dispatchEvent(new CustomEvent('turno:creado')); // reutiliza el evento que ya refresca el calendario
  });

  document.getElementById('btn-eliminar-turno-detalle')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar este turno de forma DEFINITIVA? Se borrarán también sus actividades y novedades. Esta acción no se puede deshacer.')) return;
    try {
      await eliminarTurno(_turnoDetalleActualId);
      mostrarToast('Turno eliminado.', 'exito');
      modal.hidden = true;
      document.dispatchEvent(new CustomEvent('turno:creado'));
    } catch {
      mostrarToast('Error al eliminar el turno.', 'error');
    }
  });
}

async function cargarDetalleTurno() {
  const turno = await getTurnoPorId(_turnoDetalleActualId);
  if (!turno) return;

  // Formatear las horas reales si existen
  const entradaReal = turno.hora_entrada_real 
    ? new Date(turno.hora_entrada_real).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) 
    : '<span style="color:var(--color-texto-suave);">No ha marcado</span>';

  const salidaReal = turno.hora_salida_real 
    ? new Date(turno.hora_salida_real).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) 
    : '<span style="color:var(--color-texto-suave);">No ha marcado</span>';

  document.getElementById('detalle-turno-info').innerHTML = `
    <p><strong>${turno.tbl_usuarios?.nombre_completo ?? ' '}</strong> — ${turno.tbl_puntos_trabajo?.nombre_sede ?? ' '}</p>
    <p>📅 ${turno.fecha} &nbsp; &nbsp; 🕒 Programado: ${turno.hora_inicio.slice(0,5)} - ${turno.hora_fin.slice(0,5)}</p>
    
    <div style="background:var(--color-fondo); padding:.75rem; border-radius:var(--radio); margin:.75rem 0;">
      <p>🟢 <strong>Entrada real:</strong> ${entradaReal}</p>
      <p>🔴 <strong>Salida real:</strong> ${salidaReal}</p>
    </div>

    <p>Ordinarias: <strong>${turno.horas_ordinarias}h</strong> &nbsp; &nbsp; Extra: <strong>${turno.horas_extra}h</strong> &nbsp; &nbsp; Nocturnas: <strong>${turno.horas_recargo_nocturno}h</strong></p>
    ${turno.cruce_forzado ? '<p style="color:#F39C12; margin-top:.5rem;">⚠️ Asignado con cruce de horario confirmado.</p>' : ''}
    <p style="margin-top:.5rem;"><strong>Estado del turno:</strong> ${turno.estado_turno}</p>
    
    <p style="margin-top:.75rem;"><strong>Actividades:</strong></p>
    ${turno.tbl_actividades?.length
      ? `<ul class="lista-actividades">${turno.tbl_actividades.map((a) =>
          `<li><input type="checkbox" disabled ${a.completada ? 'checked' : ''}/> <span>${a.descripcion}</span></li>`
        ).join('')}</ul>`
      : '<p class="mensaje-vacio" style="padding:.5rem 0;">Sin actividades asignadas todavía.</p>'}
  `;
}