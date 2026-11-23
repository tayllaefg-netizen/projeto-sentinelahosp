const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth, authenticate, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// LISTAR TODOS OS LEITOS E STATUS
router.get('/', optionalAuth, (req, res) => {
  const { setor, status } = req.query;
  const leitos = storage.getLeitos({ setor, status });
  res.json({
    sucesso: true,
    total: leitos.length,
    livres: leitos.filter(l => l.status === 'Livre').length,
    ocupados: leitos.filter(l => l.status === 'Ocupado').length,
    manutencao: leitos.filter(l => l.status === 'Em manutenção').length,
    leitos
  });
});

// CONSULTAR LEITO POR ID
router.get('/:id', optionalAuth, (req, res) => {
  const leito = storage.getLeitoById(req.params.id);
  if (!leito) {
    return res.status(404).json({ sucesso: false, erro: 'Leito não encontrado.' });
  }
  res.json({ sucesso: true, leito });
});

// ATUALIZAR STATUS DE LEITO (Ex: Colocar em manutenção ou liberar)
router.put('/:id/status', optionalAuth, auditLog('ALTERAR_STATUS_LEITO'), (req, res) => {
  try {
    const { status, motivo } = req.body;
    if (!status) {
      return res.status(400).json({ sucesso: false, erro: 'Status do leito é obrigatório.' });
    }

    const leito = storage.getLeitoById(req.params.id);
    if (!leito) {
      return res.status(404).json({ sucesso: false, erro: 'Leito não encontrado.' });
    }

    // Se estiver ocupado por paciente ativo, não permite marcar como livre sem alta médica
    if (leito.status === 'Ocupado' && status === 'Livre' && leito.pacienteId) {
      return res.status(400).json({
        sucesso: false,
        erro: `O leito está ocupado pelo paciente ${leito.pacienteNome}. Para desocupá-lo, realize o procedimento de Alta Médica ou Transferência.`
      });
    }

    const atualizado = storage.updateLeito(req.params.id, { status });
    res.json({
      sucesso: true,
      mensagem: `Status do leito ${atualizado.quarto}-${atualizado.numero} alterado para '${status}'.`,
      leito: atualizado
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// ADICIONAR NOVO LEITO (ADMIN)
router.post('/', authenticate, requireRole('admin'), auditLog('CRIAR_LEITO'), (req, res) => {
  try {
    const { setor, quarto, numero } = req.body;
    if (!setor || !quarto || !numero) {
      return res.status(400).json({ sucesso: false, erro: 'Setor, quarto e número do leito são obrigatórios.' });
    }

    const db = storage.read();
    const existe = db.leitos.find(l => l.quarto === quarto && l.numero === numero);
    if (existe) {
      return res.status(400).json({ sucesso: false, erro: `O leito ${numero} no quarto ${quarto} já existe.` });
    }

    const novoLeito = {
      id: Date.now().toString(),
      setor,
      quarto,
      numero,
      status: 'Livre',
      pacienteId: null,
      pacienteNome: null,
      dataOcupacao: null,
      updatedAt: new Date().toISOString()
    };

    db.leitos.push(novoLeito);
    storage.persist();

    res.status(201).json({
      sucesso: true,
      mensagem: 'Novo leito cadastrado com sucesso!',
      leito: novoLeito
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

module.exports = router;
