globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

import { getActividadesPorTurno } from './src/models/actividadesModel.js';
import { getNovedades } from './src/models/novedadesModel.js';

const actividades = await getActividadesPorTurno(2); // el turno_id que ya tienes
console.log('Actividades del turno:', actividades);

const novedades = await getNovedades();
console.log('Novedades:', novedades);