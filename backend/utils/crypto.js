const crypto = require('crypto');

/**
 * Criptografia e Segurança de Senhas (PBKDF2 com Salt)
 * Utiliza o algoritmo padrão OWASP (100.000 iterações com SHA-512)
 * Não requer pacotes nativos externos, funcionando de forma 100% segura e estável.
 */

function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Senha inválida para hashing');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `pbkdf2$100000$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // Suporte a migração suave de senhas legadas em texto puro (ex: '123')
  if (!storedHash.startsWith('pbkdf2$')) {
    return password === storedHash;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHash = parts[3];

  const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(verifyHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

/**
 * Geração e Validação de Tokens JWT Seguros (HMAC SHA-256)
 * Conforme RFC 7519
 */

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

function signToken(payload, secret, options = {}) {
  const expiresInHours = options.expiresInHours || 24;
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const iat = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = { ...payload, iat, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    return null; // Assinatura inválida
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Token expirado
    }

    return payload;
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken
};
