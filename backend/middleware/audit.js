const storage = require('../db/storage');

function auditLog(action, getDetails) {
  return (req, res, next) => {
    // Escuta finalização da resposta para registrar sucesso
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const user = req.user ? req.user.usuario : 'anônimo';
          const role = req.user ? req.user.tipo : 'público';
          let details = {};

          if (typeof getDetails === 'function') {
            details = getDetails(req, res);
          } else if (typeof getDetails === 'string') {
            details = { info: getDetails };
          } else if (req.body) {
            // Remove senhas antes de registrar detalhes
            const bodyCopy = { ...req.body };
            delete bodyCopy.senha;
            delete bodyCopy.password;
            details = bodyCopy;
          }

          storage.logAudit({
            action,
            usuario: user,
            perfil: role,
            ip: req.ip || req.connection.remoteAddress || '127.0.0.1',
            metodo: req.method,
            rota: req.originalUrl || req.url,
            detalhes: details,
            criadoEm: new Date().toISOString()
          });
        } catch (err) {
          console.error('Falha ao gravar log de auditoria:', err.message);
        }
      }
    });

    next();
  };
}

module.exports = {
  auditLog
};
