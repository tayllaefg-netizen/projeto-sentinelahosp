/**
 * Constantes Globais do Sistema Hospitalar Amandinha
 */

const ROLES = {
  ADMIN: 'admin',
  MEDICO: 'medico',
  ENFERMEIRO: 'enfermeiro',
  TRIAGEM: 'triagem', // sinônimo de enfermagem para triagem
  RECEPCAO: 'atendimento', // recepção/cadastro
  FARMACIA: 'farmaceutico',
  ALMOXARIFADO: 'almoxarife'
};

const MANCHESTER = {
  VERMELHO: {
    cor: 'vermelho',
    nome: 'Emergência',
    tempoMaxMin: 0,
    descricao: 'Atendimento imediato'
  },
  LARANJA: {
    cor: 'laranja',
    nome: 'Muito Urgente',
    tempoMaxMin: 10,
    descricao: 'Atendimento em até 10 minutos'
  },
  AMARELO: {
    cor: 'amarelo',
    nome: 'Urgente',
    tempoMaxMin: 50,
    descricao: 'Atendimento em até 50 minutos'
  },
  VERDE: {
    cor: 'verde',
    nome: 'Pouco Urgente',
    tempoMaxMin: 120,
    descricao: 'Atendimento em até 120 minutos'
  },
  AZUL: {
    cor: 'azul',
    nome: 'Não Urgente',
    tempoMaxMin: 240,
    descricao: 'Atendimento em até 240 minutos'
  }
};

const STATUS_PACIENTE = {
  CADASTRADO: 'cadastrado',
  AGUARDANDO_TRIAGEM: 'triagem',
  AGUARDANDO_MEDICO: 'aguardando_medico',
  EM_CONSULTA: 'em_consulta',
  AGUARDANDO_INTERNACAO: 'aguardando_internacao',
  INTERNADO: 'internado',
  ALTA: 'alta',
  CANCELADO: 'cancelado'
};

const STATUS_LEITO = {
  LIVRE: 'Livre',
  OCUPADO: 'Ocupado',
  MANUTENCAO: 'Em manutenção',
  RESERVADO: 'Reservado'
};

const SETORES_HOSPITALARES = [
  'UTI Geral',
  'UTI Pediátrica',
  'Enfermaria Adulto Masculino',
  'Enfermaria Adulto Feminino',
  'Pediatria',
  'Maternidade',
  'Isolamento'
];

module.exports = {
  ROLES,
  MANCHESTER,
  STATUS_PACIENTE,
  STATUS_LEITO,
  SETORES_HOSPITALARES
};
