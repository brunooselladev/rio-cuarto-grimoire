import User from '../models/User.js';

let adminSeeded = false;

export async function seedLocationsIfEmpty() {
  // No hace nada - las locaciones se crean dinámicamente vía API
  return;
}

export async function seedAdminIfMissing() {
  if (adminSeeded) return;
  
  const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

  const existing = await User.findOne({ username: ADMIN_USERNAME }).lean();
  if (!existing) {
    await User.create({ 
      username: ADMIN_USERNAME, 
      password: ADMIN_PASSWORD, 
      role: 'admin' 
    });
    console.log(`[seed] ✅ Usuario admin creado: "${ADMIN_USERNAME}"`);
  }
  
  adminSeeded = true;
}