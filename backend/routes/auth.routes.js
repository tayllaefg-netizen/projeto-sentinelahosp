const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { signToken } = require('../utils/crypto');
const config = require('../config/env');
const { authenticate, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// LOGIN
router.post('/login', (req, res) => {
  const { usuario, senha } = req.body || {};

  if (!usuario || !senha) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Usuário e senha são obrigatórios.'
    });
  }

  const user = storage.validateLogin(usuario, senha);
  if (!user) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Credenciais inválidas. Verifique o usuário e a senha informados.'
    });
  }

  // Gera token JWT seguro
  const token = signToken(
    {
      id: user.id,
      usuario: user.usuario,
      nome: user.nome,
      tipo: user.tipo,
      crm_coren: user.crm_coren
    },
    config.JWT_SECRET,
    { expiresInHours: 24 }
  );

  // Registra log de auditoria
  storage.logAudit({
    action: 'LOGIN_SUCESSO',
    usuario: user.usuario,
    perfil: user.tipo,
    ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
    metodo: 'POST',
    rota: '/login',
    detalhes: { nome: user.nome, tipo: user.tipo }
  });

  // Retorna formato compatível com o sistema original + novo padrão seguro
  res.json({
    sucesso: true,
    token,
    usuario: user.usuario,
    nome: user.nome,
    tipo: user.tipo,
    crm_coren: user.crm_coren,
    // campos originais para compatibilidade
    id: user.id
  });
});

// OBTER USUÁRIO ATUAL
router.get('/me', authenticate, (req, res) => {
  const user = storage.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ sucesso: false, erro: 'Usuário não encontrado.' });
  }
  res.json({
    sucesso: true,
    usuario: user
  });
});

// LISTAR USUÁRIOS (Somente Administrador)
router.get('/usuarios', authenticate, requireRole('admin'), (req, res) => {
  const users = storage.getUsers();
  res.json({
    sucesso: true,
    total: users.length,
    usuarios: users
  });
});

// CADASTRAR NOVO USUÁRIO (Somente Administrador)
router.post('/usuarios', authenticate, requireRole('admin'), auditLog('CRIAR_USUARIO'), (req, res) => {
  try {
    const { usuario, senha, nome, tipo, crm_coren } = req.body;
    if (!usuario || !senha || !tipo) {
      return res.status(400).json({ sucesso: false, erro: 'Usuário, senha e perfil (tipo) são obrigatórios.' });
    }

    const newUser = storage.createUser({ usuario, senha, nome, tipo, crm_coren });
    res.status(201).json({
      sucesso: true,
      mensagem: 'Usuário cadastrado com sucesso!',
      usuario: newUser
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
