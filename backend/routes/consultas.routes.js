const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

// REGISTRAR CONSULTA MÉDICA
router.post('/', optionalAuth, auditLog('CONSULTA_MEDICA_REALIZADA'), (req, res) => {
  try {
    const { paciente, diagnostico, medicacao } = req.body;

    if (!paciente || !paciente.trim()) {
      return res.status(400).json({ sucesso: false, erro: 'O nome do paciente é obrigatório.' });
    }

    const consulta = storage.createConsulta({
      ...req.body,
      medicoNome: req.user ? req.user.nome : (req.body.medicoNome || 'Dr. Médico Plantonista'),
      crm: req.user ? req.user.crm_coren : (req.body.crm || 'CRM/SP 198452')
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Consulta médica e conduta registradas com sucesso no prontuário!',
      ...consulta
    });
  } catch (err) {
    res.status(400).json({ sucesso: false, erro: err.message });
  }
});

// LISTAR CONSULTAS
router.get('/', optionalAuth, (req, res) => {
  const { pacienteId, medico } = req.query;
  const consultas = storage.getConsultas({ pacienteId, medico });
  res.json(consultas);
});

// LISTA DE MEDICAÇÕES CADASTRADAS NO ESTOQUE DA FARMÁCIA
router.get('/lista-medicacoes', (req, res) => {
  const medicamentos = storage.getMedicamentos();
  // Se houver medicamentos no estoque, retorna seus nomes, ou fallback para lista clínica básica
  if (medicamentos.length > 0) {
    return res.json(medicamentos.map(m => m.nome));
  }

  res.json([
    'Dipirona Monoidratada 500mg/mL Ampola',
    'Paracetamol 500mg Comprimido',
    'Amoxicilina + Clavulanato 500/125mg',
    'Ceftriaxona 1g Frasco-ampola IV',
    'Ondansetrona 8mg/4mL Ampola',
    'Omeprazol 40mg Frasco-ampola',
    'Soro Fisiológico 0.9% 500mL Bolsa',
    'Soro Glicosado 5% 500mL Bolsa',
    'Buscopan Composto Ampola',
    'Loratadina 10mg Comprimido',
    'Morfina 10mg/mL Ampola'
  ]);
});

// CONSULTA POR ID
router.get('/:id', optionalAuth, (req, res) => {
  const db = storage.read();
  const consulta = db.consultas.find(c => String(c.id) === String(req.params.id));
  if (!consulta) {
    return res.status(404).json({ sucesso: false, erro: 'Consulta não encontrada.' });
  }
  res.json({
    sucesso: true,
    consulta
  });
});

module.exports = router;
