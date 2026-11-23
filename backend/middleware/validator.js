const { sanitizeObject } = require('../utils/xss');
const { validarCPF, cleanCPF } = require('../utils/cpfValidator');

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
}

function validatePatientBody(req, res, next) {
  const { nome, cpf } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    return res.status(400).json({
      sucesso: false,
      erro: 'O nome do paciente é obrigatório e deve ter pelo menos 2 caracteres.'
    });
  }

  if (!cpf) {
    return res.status(400).json({
      sucesso: false,
      erro: 'O CPF do paciente é obrigatório.'
    });
  }

  const cleanedCPF = cleanCPF(cpf);
  if (!validarCPF(cleanedCPF)) {
    return res.status(400).json({
      sucesso: false,
      erro: 'O CPF informado é inválido de acordo com o algoritmo da Receita Federal.'
    });
  }

  req.body.cpfLimpo = cleanedCPF;
  next();
}

module.exports = {
  sanitizeBody,
  validatePatientBody
};
