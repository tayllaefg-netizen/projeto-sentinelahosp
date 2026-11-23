const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// CHAMAR PACIENTE NA TV
router.post('/chamar', optionalAuth, auditLog('CHAMADA_TV'), (req, res) => {
  const { localTipo, localNumero, paciente, senha, medico } = req.body;

  if (!paciente && !senha) {
    return res.status(400).json({ sucesso: false, erro: 'Informe o paciente ou a senha para a chamada de TV.' });
  }

  const chamada = storage.chamarNaTv({
    localTipo: localTipo || 'CONSULTÓRIO',
    localNumero: localNumero || '01',
    paciente: paciente || 'Paciente',
    senha: senha || 'A-01',
    medico: medico || (req.user ? req.user.nome : '')
  });

  res.json({
    sucesso: true,
    mensagem: 'Chamada transmitida para o painel de TV!',
    ...chamada
  });
});

// CONSULTAR CHAMADA ATUAL E HISTÓRICO
router.get('/chamada', (req, res) => {
  const dados = storage.getTvChamada();
  res.json(dados);
});

// HISTÓRICO DAS ÚLTIMAS CHAMADAS
router.get('/historico', (req, res) => {
  const dados = storage.getTvChamada();
  res.json(dados.historico || []);
});

module.exports = router;
