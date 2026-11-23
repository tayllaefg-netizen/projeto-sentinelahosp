const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// LISTAR MATERIAIS
router.get('/materiais', optionalAuth, (req, res) => {
  const materiais = storage.getMateriais();
  res.json({
    sucesso: true,
    total: materiais.length,
    materiais
  });
});

// CADASTRAR NOVO MATERIAL
router.post('/materiais', optionalAuth, auditLog('CADASTRO_MATERIAL_ALMOXARIFADO'), (req, res) => {
  try {
    const { nome, categoria } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ sucesso: false, erro: 'Nome do material é obrigatório.' });
    }

    const novo = storage.createMaterial(req.body);
    res.status(201).json({
      sucesso: true,
      mensagem: 'Material cadastrado com sucesso no Almoxarifado!',
      material: novo
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// REGISTRAR ENTRADA OU SAÍDA (REQUISIÇÃO POR SETOR)
router.post('/movimentacoes', optionalAuth, auditLog('MOVIMENTACAO_ALMOXARIFADO'), (req, res) => {
  try {
    const { materialId, tipo, quantidade, setorDestino, motivo } = req.body;
    if (!materialId || !tipo || !quantidade) {
      return res.status(400).json({ sucesso: false, erro: 'Material, tipo e quantidade são obrigatórios.' });
    }

    const responsavel = req.user ? req.user.nome : (req.body.responsavel || 'Almoxarife');
    const resultado = storage.movimentarEstoqueMaterial(
      materialId,
      tipo,
      quantidade,
      setorDestino,
      motivo,
      responsavel,
      req.body
    );

    res.json({
      sucesso: true,
      mensagem: `Movimentação de ${tipo} de ${quantidade} registrada com sucesso para o setor ${setorDestino || 'Geral'}!`,
      ...resultado
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// HISTÓRICO DE MOVIMENTAÇÕES
router.get('/movimentacoes', optionalAuth, (req, res) => {
  const movs = storage.getMovimentacoesAlmoxarifado();
  res.json(movs);
});

// ESTATÍSTICAS E INDICADORES DO ALMOXARIFADO
router.get('/stats', optionalAuth, (req, res) => {
  const materiais = storage.getMateriais();
  const total = materiais.length;
  const zerados = materiais.filter(m => m.quantidade === 0).length;
  const baixos = materiais.filter(m => m.quantidade > 0 && m.quantidade <= m.estoqueMinimo).length;
  const normais = materiais.filter(m => m.quantidade > m.estoqueMinimo).length;

  res.json({
    sucesso: true,
    total,
    zerados,
    baixos,
    normais,
    alertas: materiais.filter(m => m.quantidade <= m.estoqueMinimo)
  });
});

module.exports = router;
