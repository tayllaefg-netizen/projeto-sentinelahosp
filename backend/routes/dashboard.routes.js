const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth } = require('../middleware/auth');

// MÉTRICAS E INDICADORES EM TEMPO REAL PARA O DASHBOARD ADMINISTRATIVO
router.get('/metricas', optionalAuth, (req, res) => {
  const metricas = storage.getDashboardMetrics();
  res.json({
    sucesso: true,
    timestamp: new Date().toISOString(),
    ...metricas
  });
});

module.exports = router;
