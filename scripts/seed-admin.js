import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../api/lib/db.js';
import User from '../api/models/User.js';

// Simple .env loader (no deps)
function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
loadDotEnv(path.join(__dirname, '..', '.env'));

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Please set it in .env or env and retry.');
    process.exit(1);
  }
  await connectDB();
  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'admin';

  const existing = await User.findOne({ username }).lean();
  if (existing) {
    console.log(`Admin user "${username}" already exists.`);
  } else {
    await User.create({ username, password, role: 'admin' });
    console.log(`Created admin user "${username}"`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});