const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// REGISTRAR ALTA HOSPITALAR
router.post('/', optionalAuth, auditLog('ALTA_HOSPITALAR_REGISTRADA'), (req, res) => {
  try {
    const { pacienteNome, paciente, motivo, orientacoes } = req.body;

    const nome = pacienteNome || paciente;
    if (!nome) {
      return res.status(400).json({ sucesso: false, erro: 'O nome do paciente é obrigatório para registrar a alta.' });
    }

    const alta = storage.createAlta({
      ...req.body,
      pacienteNome: nome,
      medicoResponsavel: req.user ? `${req.user.nome}` : (req.body.medicoResponsavel || 'Dr. Médico Responsável'),
      crm: req.user ? (req.user.crm_coren || 'CRM/SP 198452') : (req.body.crm || 'CRM/SP 198452')
    });

    res.status(201).json({
      sucesso: true,
      mensagem: `Alta hospitalar de ${alta.pacienteNome} concluída com sucesso! Leito liberado e prontuário atualizado.`,
      alta
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// LISTAR ALTAS
router.get('/', optionalAuth, (req, res) => {
  const altas = storage.getAltas();
  res.json(altas);
});

// CONSULTAR ALTA POR ID
router.get('/:id', optionalAuth, (req, res) => {
  const alta = storage.getAltaById(req.params.id);
  if (!alta) {
    return res.status(404).json({ sucesso: false, erro: 'Registro de alta não encontrado.' });
  }
  res.json({ sucesso: true, alta });
});

module.exports = router;
