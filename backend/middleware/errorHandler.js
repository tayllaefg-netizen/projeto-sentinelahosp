const config = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error(`[ERRO INTERNO] ${req.method} ${req.url}:`, err);

  const statusCode = err.statusCode || 500;
  const response = {
    sucesso: false,
    erro: err.message || 'Ocorreu um erro interno no servidor.'
  };

  if (config.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  errorHandler
};
