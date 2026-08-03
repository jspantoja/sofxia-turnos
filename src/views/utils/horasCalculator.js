// src/utils/horasCalculator.js
// Calcula el desglose de horas de un turno: ordinarias, extra y recargo nocturno.

/** Convierte "HH:MM" a minutos desde las 00:00. Ej: "01:30" → 90 */
function aMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos de solapamiento entre dos intervalos [aIni,aFin) y [bIni,bFin). */
function solape(aIni, aFin, bIni, bFin) {
  return Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni));
}

/**
 * @param {string} horaInicio  "HH:MM"
 * @param {string} horaFin     "HH:MM"
 * @param {number} horasYaAcumuladasEseDia  horas de OTROS turnos del mismo
 *        operario, ese mismo día (0 si es el primer turno del día)
 * @param {object} config  { maxHorasDiarias, horaInicioNocturno, horaFinNocturno }
 */
export function calcularDesgloseHoras(horaInicio, horaFin, horasYaAcumuladasEseDia, config = {}) {
  const maxDiariasMin = (config.maxHorasDiarias ?? 8) * 60;
  const nocheIni = aMinutos(config.horaInicioNocturno ?? '21:00');
  const nocheFin = aMinutos(config.horaFinNocturno ?? '06:00') + 1440; // +1440 = "del día siguiente"

  let ini = aMinutos(horaInicio);
  let fin = aMinutos(horaFin);

  // 🔑 La corrección clave (Bitácora 11): si "fin" parece ser menor que "ini",
  // es porque el turno cruza la medianoche — le sumamos un día completo (1440 min)
  // para que la resta de más abajo dé un número positivo y correcto.
  if (fin <= ini) fin += 1440;

  const duracionMin = fin - ini;

  // ── Horas extra: la "cola" del turno que excede el acumulado del día ──
  const yaAcumuladosMin = horasYaAcumuladasEseDia * 60;
  const excedente = Math.max(0, yaAcumuladosMin + duracionMin - maxDiariasMin);
  const extraMin = Math.min(excedente, duracionMin);
  const finTramoOrdinario = fin - extraMin;

  // ── Recargo nocturno: solapamiento con la ventana 21:00→06:00(+1 día) ──
  let nocturnoMin = 0;
  for (const desplazamiento of [-1440, 0, 1440]) {
    nocturnoMin += solape(ini + desplazamiento, finTramoOrdinario + desplazamiento, nocheIni, nocheFin);
  }

  const horasOrdinarias = (duracionMin - extraMin - nocturnoMin) / 60;

  return {
    horasOrdinarias: +horasOrdinarias.toFixed(2),
    horasExtra: +(extraMin / 60).toFixed(2),
    horasRecargoNocturno: +(nocturnoMin / 60).toFixed(2),
    horasTotales: +(duracionMin / 60).toFixed(2)
  };
}