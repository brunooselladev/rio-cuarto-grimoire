import bcrypt from 'bcryptjs';

/**
 * Verifica si una contraseña en texto plano coincide con el hash guardado.
 * @param {string} password - Contraseña ingresada por el usuario.
 * @param {string} hashedPassword - Contraseña hasheada en la base de datos.
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  try {
    return await bcrypt.compare(password, hashedPassword);
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
