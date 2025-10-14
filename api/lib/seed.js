import Location from '../models/Location.js';
import User from '../models/User.js';

let seeded = false;
let adminSeeded = false;

const initialLocations = [
  {
    name: 'La Terminal Vieja',
    type: 'power',
    lat: -33.1301,
    lng: -64.3499,
    description: 'Antigua terminal de ómnibus, abandonada. Las paredes vibran con ecos de despedidas nunca dichas.',
    sphere: 'Entropía/Tiempo',
    visible: true,
    narration: 'Los relojes se detienen aquí. El pasado sangra en el presente.',
  },
  {
    name: 'Café del Boulevard',
    type: 'refuge',
    lat: -33.1234,
    lng: -64.3478,
    description: 'Refugio de la Curandera. Veladores rojos, cartas del tarot, y secretos murmurados entre el humo.',
    sphere: 'Vida/Espíritu',
    visible: true,
    narration: 'Un lugar fuera del tiempo. Aquí, la paradoja no puede tocarte... por ahora.',
  },
  {
    name: 'Universidad Nacional RC',
    type: 'mission',
    lat: -33.1189,
    lng: -64.3142,
    description: 'Laboratorios del tecnócrata. Entre computadoras viejas y cables, la magia se codifica en binario.',
    sphere: 'Fuerzas/Materia',
    visible: true,
    narration: 'Los tecnócratas vigilan. Cada experimento es un ritual, cada ecuación es un hechizo.',
  },
  {
    name: 'El Puente Carretero',
    type: 'danger',
    lat: -33.1156,
    lng: -64.3523,
    description: 'Cruce sobre el río. Aquí, entre dos mundos, la paradoja se manifiesta con violencia.',
    sphere: 'Primordio/Correspondencia',
    visible: true,
    narration: 'No cruces solo de noche. Las sombras tienen hambre, y la realidad se desgarra.',
  },
  {
    name: 'Grafiti del Niño Punky',
    type: 'mission',
    lat: -33.1278,
    lng: -64.3556,
    description: 'Un mural en la pared: símbolos caóticos que cambian cada noche. Arte vivo, magia callejera.',
    sphere: 'Caos/Primordio',
    visible: true,
    narration: 'Los tags hablan. Si sabes leer entre las líneas, revelan verdades que la razón rechaza.',
  },
];

export async function seedLocationsIfEmpty() {
  if (seeded) return;
  const count = await Location.countDocuments();
  if (count === 0) {
    await Location.insertMany(initialLocations);
    // eslint-disable-next-line no-console
    console.log(`[seed] Inserted ${initialLocations.length} locations`);
  }
  seeded = true;
}

export async function seedAdminIfMissing() {
  if (adminSeeded) return;
  const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

  const existing = await User.findOne({ username: ADMIN_USERNAME }).lean();
  if (!existing) {
    await User.create({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD, role: 'admin' });
    // eslint-disable-next-line no-console
    console.log(`[seed] Created admin user \"${ADMIN_USERNAME}\"`);
  }
  adminSeeded = true;
}
