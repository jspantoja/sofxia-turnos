globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

import { getTurnosPorRango, verificarDisponibilidad, getHorasAcumuladasDia } from './src/models/turnosModel.js';

// Reemplaza con el UUID real de tu operario de prueba (el mismo del Checkpoint 3)
const usuarioId = '3b265420-1c61-4962-82db-f05015703d62';

const turnos = await getTurnosPorRango('2026-08-01', '2026-08-31');
console.log('1. Turnos de agosto:', turnos);

const conflictos = await verificarDisponibilidad({
  usuarioId, fecha: '2026-08-20', horaInicio: '10:00', horaFin: '14:00'
});
console.log('2. Conflictos (debería encontrar el turno 08:00-12:00):', conflictos);

const horas = await getHorasAcumuladasDia(usuarioId, '2026-08-20');
console.log('3. Horas ya acumuladas ese día:', horas);