const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth, authenticate, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// LISTAR MEDICAMENTOS (CATÁLOGO & ESTOQUE)
router.get('/medicamentos', optionalAuth, (req, res) => {
  const medicamentos = storage.getMedicamentos();
  res.json({
    sucesso: true,
    total: medicamentos.length,
    medicamentos
  });
});

// CADASTRAR NOVO MEDICAMENTO
router.post('/medicamentos', optionalAuth, auditLog('CADASTRO_MEDICAMENTO'), (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ sucesso: false, erro: 'Nome do medicamento é obrigatório.' });
    }

    const novo = storage.createMedicamento(req.body);
    res.status(201).json({
      sucesso: true,
      mensagem: 'Medicamento cadastrado com sucesso!',
      medicamento: novo
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// REGISTRAR MOVIMENTAÇÃO DE ESTOQUE (ENTRADA / SAÍDA / PERDA)
router.post('/movimentacoes', optionalAuth, auditLog('MOVIMENTACAO_ESTOQUE_FARMACIA'), (req, res) => {
  try {
    const { medicamentoId, tipo, quantidade, motivo } = req.body;
    if (!medicamentoId || !tipo || !quantidade) {
      return res.status(400).json({ sucesso: false, erro: 'Medicamento, tipo de movimentação e quantidade são obrigatórios.' });
    }

    const responsavel = req.user ? req.user.nome : (req.body.responsavel || 'Farmacêutico(a)');
    const resultado = storage.movimentarEstoqueMedicamento(medicamentoId, tipo, quantidade, motivo, responsavel, req.body);

    res.json({
      sucesso: true,
      mensagem: `Movimentação de ${tipo} de ${quantidade} un realizada com sucesso!`,
      ...resultado
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// DISPENSAR MEDICAÇÃO PARA PACIENTE
router.post('/dispensar', optionalAuth, auditLog('DISPENSACAO_MEDICAMENTO'), (req, res) => {
  try {
    const { medicamentoId, quantidade, pacienteNome, pacienteId, prescricaoId } = req.body;

    if (!medicamentoId || !quantidade) {
      return res.status(400).json({ sucesso: false, erro: 'Medicamento e quantidade a dispensar são obrigatórios.' });
    }

    const responsavel = req.user ? req.user.nome : 'Farmácia Hospitalar';
    const resultado = storage.movimentarEstoqueMedicamento(
      medicamentoId,
      'dispensacao',
      quantidade,
      `Dispensação para paciente: ${pacienteNome || 'Não informado'}`,
      responsavel,
      { pacienteId, pacienteNome, prescricaoId }
    );

    res.json({
      sucesso: true,
      mensagem: `Medicação ${resultado.medicamento.nome} (${quantidade} un) dispensada com sucesso para ${pacienteNome || 'paciente'}!`,
      ...resultado
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// HISTÓRICO DE MOVIMENTAÇÕES
router.get('/movimentacoes', optionalAuth, (req, res) => {
  const movs = storage.getMovimentacoesFarmacia();
  res.json(movs);
});

// ALERTAS DE ESTOQUE E VALIDADE
router.get('/alertas', optionalAuth, (req, res) => {
  const medicamentos = storage.getMedicamentos();
  const hoje = new Date();
  const em60Dias = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000);

  const estoqueBaixo = medicamentos.filter(m => m.quantidade <= m.estoqueMinimo);
  const vencimentoProximo = medicamentos.filter(m => {
    if (!m.validade) return false;
    const dtVal = new Date(m.validade);
    return dtVal <= em60Dias;
  });

  res.json({
    sucesso: true,
    estoqueBaixo,
    vencimentoProximo
  });
});

module.exports = router;
