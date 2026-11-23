const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth, authenticate, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { validatePatientBody } = require('../middleware/validator');

// CADASTRAR PACIENTE (RECEPÇÃO / ATENDIMENTO)
router.post(
  ['/', '/atendimento'],
  optionalAuth,
  validatePatientBody,
  auditLog('CADASTRO_PACIENTE', req => ({ nome: req.body.nome, cpf: req.body.cpfLimpo })),
  (req, res) => {
    try {
      const paciente = storage.createPatient(req.body);
      res.status(201).json({
        sucesso: true,
        mensagem: 'Paciente cadastrado e encaminhado para a triagem!',
        ...paciente
      });
    } catch (err) {
      res.status(400).json({
        sucesso: false,
        erro: err.message
      });
    }
  }
);

// LISTAR PACIENTES
router.get('/', optionalAuth, (req, res) => {
  const { status, search } = req.query;
  const pacientes = storage.getPatients({ status, search });
  res.json(pacientes);
});

// CONSULTAR PACIENTE POR ID
router.get('/:id', optionalAuth, (req, res) => {
  const paciente = storage.getPatientById(req.params.id);
  if (!paciente) {
    return res.status(404).json({ sucesso: false, erro: 'Paciente não encontrado.' });
  }
  res.json({
    sucesso: true,
    paciente
  });
});

// HISTÓRICO COMPLETO DO PACIENTE (PRONTUÁRIO INTEGRADO)
router.get('/:id/historico', optionalAuth, (req, res) => {
  const paciente = storage.getPatientById(req.params.id);
  if (!paciente) {
    return res.status(404).json({ sucesso: false, erro: 'Paciente não encontrado.' });
  }

  const db = storage.read();
  const triagens = db.triagens.filter(t => String(t.pacienteId) === String(paciente.id) || t.nome.toLowerCase() === paciente.nome.toLowerCase());
  const consultas = db.consultas.filter(c => String(c.pacienteId) === String(paciente.id) || (c.paciente && c.paciente.toLowerCase() === paciente.nome.toLowerCase()));
  const internacoes = db.internacoes.filter(i => String(i.pacienteId) === String(paciente.id) || (i.pacienteNome && i.pacienteNome.toLowerCase() === paciente.nome.toLowerCase()));
  const altas = db.altas.filter(a => String(a.pacienteId) === String(paciente.id) || (a.pacienteNome && a.pacienteNome.toLowerCase() === paciente.nome.toLowerCase()));

  res.json({
    sucesso: true,
    paciente,
    historico: {
      triagens,
      consultas,
      internacoes,
      altas
    }
  });
});

// ATUALIZAR PACIENTE
router.put('/:id', optionalAuth, auditLog('ATUALIZAR_PACIENTE'), (req, res) => {
  try {
    const atualizado = storage.updatePatient(req.params.id, req.body);
    res.json({
      sucesso: true,
      mensagem: 'Cadastro do paciente atualizado com sucesso!',
      paciente: atualizado
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
