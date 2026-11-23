/**
 * Validador Oficial de CPF (Algoritmo da Receita Federal do Brasil)
 */

function cleanCPF(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

function formatCPF(cpf) {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function validarCPF(cpf) {
  const cleaned = cleanCPF(cpf);

  if (cleaned.length !== 11) {
    return false;
  }

  // CPFs com todos os dígitos iguais são inválidos
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleaned.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(9), 10)) {
    return false;
  }

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleaned.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(10), 10)) {
    return false;
  }

  return true;
}

module.exports = {
  cleanCPF,
  formatCPF,
  validarCPF
};
