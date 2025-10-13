import crypto from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });
  return `scrypt:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password, encoded) {
  try {
    const [algo, Nstr, rstr, pstr, saltHex, hashHex] = encoded.split(':');
    if (algo !== 'scrypt') return false;
    const N = parseInt(Nstr, 10);
    const r = parseInt(rstr, 10);
    const p = parseInt(pstr, 10);
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(password, salt, expected.length, { N, r, p });
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}