import bcrypt from 'bcryptjs';

/**
 * Detecta si un string es un hash bcrypt (empieza con $2a$, $2b$ o $2y$ y tiene 60 chars).
 */
function isBcryptHash(str) {
  return typeof str === 'string' && str.length === 60 && /^\$2[aby]\$/.test(str);
}

/**
 * Verifica si una contraseña en texto plano coincide con el hash guardado.
 * Soporta tanto contraseñas hasheadas con bcrypt como contraseñas legacy en texto plano.
 * @param {string} password - Contraseña ingresada por el usuario.
 * @param {string} storedPassword - Contraseña guardada en la base de datos.
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedPassword) {
  if (!password || !storedPassword) return false;
  try {
    if (isBcryptHash(storedPassword)) {
      return await bcrypt.compare(password, storedPassword);
    }
    // Legacy: plain text comparison
    return password === storedPassword;
  } catch {
    return false;
  }
}

/**
 * Genera un hash seguro a partir de una contraseña en texto plano.
 * @param {string} password - Contraseña a hashear.
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
