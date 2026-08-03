globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

import { getOperarios } from './src/models/operariosModel.js';
import { getPuntosActivos } from './src/models/puntosTrabajoModel.js';

const operarios = await getOperarios();
console.log('Operarios activos:', operarios);

const sedes = await getPuntosActivos();
console.log('Sedes activas:', sedes);