const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { inferirProtocoloManchester, analisarTriagemComIA } = require('../services/aiTriageService');

// CRIAR TRIAGEM
router.post('/', optionalAuth, auditLog('TRIAGEM_CRIADA'), (req, res) => {
  try {
    const { nome, sintoma, temperatura, alergia, observacao } = req.body;

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ sucesso: false, erro: 'O nome do paciente é obrigatório para a triagem.' });
    }

    // Calcula risco se não foi explicitamente fornecido
    let risco = req.body.risco;
    if (!risco) {
      const calculo = inferirProtocoloManchester(req.body);
      risco = calculo.risco;
    }

    const triagem = storage.createTriagem({
      ...req.body,
      risco,
      responsavel: req.user ? `${req.user.nome} (${req.user.crm_coren || 'Enfermagem'})` : req.body.responsavel
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Triagem realizada e classificada com sucesso!',
      ...triagem
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// LISTAR TRIAGENS (ORDENADAS POR PROTOCOLO MANCHESTER)
router.get('/', optionalAuth, (req, res) => {
  const { status, risco } = req.query;
  const triagens = storage.getTriagens({ status, risco });
  res.json(triagens);
});

// CONSULTAR ASSISTENTE IA DE TRIAGEM
router.post('/analise-ia', optionalAuth, async (req, res) => {
  try {
    const recomendacao = await analisarTriagemComIA(req.body);
    res.json({
      sucesso: true,
      recomendacao
    });
  } catch (err) {
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao processar análise de IA da triagem.',
      detalhes: err.message
    });
  }
});

// CHAMAR PACIENTE NA TV A PARTIR DA TRIAGEM
router.post('/:id/chamar-tv', optionalAuth, (req, res) => {
  const triagem = storage.read().triagens.find(t => String(t.id) === String(req.params.id));
  if (!triagem) {
    return res.status(404).json({ sucesso: false, erro: 'Triagem não encontrada.' });
  }

  const chamada = storage.chamarNaTv({
    localTipo: req.body.localTipo || 'GUICHÊ DE TRIAGEM',
    localNumero: req.body.localNumero || '01',
    paciente: triagem.nome,
    senha: req.body.senha || 'TRIAGEM'
  });

  res.json({
    sucesso: true,
    mensagem: `${triagem.nome} foi chamado(a) no painel de TV!`,
    chamada
  });
});

module.exports = router;
