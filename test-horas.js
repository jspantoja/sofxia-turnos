// test-horas.js — SOLO para probar, desechable
import { calcularDesgloseHoras } from './src/utils/horasCalculator.js';

const config = { maxHorasDiarias: 8, horaInicioNocturno: '21:00', horaFinNocturno: '06:00' };

console.log('Escenario A (normal, 8h):', calcularDesgloseHoras('08:00', '16:00', 0, config));
console.log('Escenario B (horas extra):', calcularDesgloseHoras('08:00', '18:00', 0, config));
console.log('Escenario C (recargo nocturno):', calcularDesgloseHoras('18:00', '23:00', 0, config));
console.log('Escenario D (cruza medianoche):', calcularDesgloseHoras('22:00', '04:00', 0, config));