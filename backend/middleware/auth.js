const { verifyToken } = require('../utils/crypto');
const config = require('../config/env');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Acesso não autorizado. Token de autenticação não fornecido.'
    });
  }

  const payload = verifyToken(token, config.JWT_SECRET);
  if (!payload) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Sessão expirada ou token inválido. Faça login novamente.'
    });
  }

  req.user = payload;
  next();
}

/**
 * Middleware para autorização baseada em perfil (RBAC)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Usuário não autenticado.'
      });
    }

    // Administrador tem permissão geral
    if (req.user.tipo === 'admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.tipo)) {
      return res.status(403).json({
        sucesso: false,
        erro: `Acesso negado para o perfil '${req.user.tipo}'. Esta ação requer um dos seguintes perfis: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

// Middleware opcional (se logado, anexa usuário; se não, continua)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = verifyToken(token, config.JWT_SECRET);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

module.exports = {
  authenticate,
  requireRole,
  optionalAuth
};
