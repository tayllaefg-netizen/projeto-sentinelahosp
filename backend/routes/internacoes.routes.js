const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// REGISTRAR NOVA INTERNAÇÃO HOSPITALAR
router.post('/', optionalAuth, auditLog('INTERNACAO_CRIADA'), (req, res) => {
  try {
    const { leitoId, motivo, paciente, pacienteId, pacienteNome } = req.body;

    if (!leitoId) {
      return res.status(400).json({ sucesso: false, erro: 'A seleção de um leito hospitalar é obrigatória.' });
    }

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ sucesso: false, erro: 'O motivo clínico da internação é obrigatório.' });
    }

    const internacao = storage.createInternacao({
      ...req.body,
      pacienteNome: pacienteNome || paciente,
      medicoResponsavel: req.user ? `${req.user.nome} (${req.user.crm_coren || 'Médico'})` : (req.body.medicoResponsavel || 'Dr. Médico Assistente')
    });

    res.status(201).json({
      sucesso: true,
      mensagem: `Paciente ${internacao.pacienteNome} internado(a) com sucesso no leito ${internacao.quarto}-${internacao.leitoNumero}!`,
      internacao
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// LISTAR INTERNAÇÕES
router.get('/', optionalAuth, (req, res) => {
  const { status, pacienteId } = req.query;
  const internacoes = storage.getInternacoes({ status, pacienteId });
  res.json(internacoes);
});

// CONSULTAR INTERNAÇÃO POR ID
router.get('/:id', optionalAuth, (req, res) => {
  const internacao = storage.getInternacaoById(req.params.id);
  if (!internacao) {
    return res.status(404).json({ sucesso: false, erro: 'Internação não encontrada.' });
  }
  res.json({ sucesso: true, internacao });
});

// TRANSFERÊNCIA DE LEITO
router.post('/:id/transferir', optionalAuth, auditLog('TRANSFERENCIA_LEITO'), (req, res) => {
  try {
    const { novoLeitoId, motivo } = req.body;
    if (!novoLeitoId) {
      return res.status(400).json({ sucesso: false, erro: 'O novo leito de destino é obrigatório.' });
    }

    const responsavel = req.user ? req.user.nome : (req.body.responsavel || 'Equipe Médica/Enfermagem');
    const resultado = storage.transferirLeito(req.params.id, novoLeitoId, motivo, responsavel);

    res.json({
      sucesso: true,
      mensagem: 'Transferência de leito realizada e registrada com sucesso!',
      ...resultado
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// ADICIONAR EVOLUÇÃO CLÍNICA DIÁRIA
router.post('/:id/evolucao', optionalAuth, auditLog('EVOLUCAO_CLINICA_ADICIONADA'), (req, res) => {
  try {
    const { nota } = req.body;
    if (!nota || !nota.trim()) {
      return res.status(400).json({ sucesso: false, erro: 'O texto da evolução clínica é obrigatório.' });
    }

    const profissional = req.user ? `${req.user.nome} (${req.user.crm_coren || req.user.tipo})` : (req.body.profissional || 'Profissional de Saúde');
    const evolucao = storage.adicionarEvolucaoInternacao(req.params.id, nota, profissional);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Evolução clínica registrada no prontuário da internação!',
      evolucao
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
