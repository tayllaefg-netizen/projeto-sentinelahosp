const express = require('express');
const router = express.Router();
const storage = require('../db/storage');
const { optionalAuth, authenticate, requireRole } = require('../middleware/auth');

// CONSULTAR LOGS DE AUDITORIA
router.get('/logs', optionalAuth, (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const logs = storage.getAuditLogs(limit);
  res.json({
    sucesso: true,
    total: logs.length,
    logs
  });
});

module.exports = router;
