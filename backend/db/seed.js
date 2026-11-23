const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../utils/crypto');
const { STATUS_LEITO, STATUS_PACIENTE } = require('../config/constants');

const DB_PATH = path.resolve(__dirname, '../db.json');

function seedDatabase(forceReset = false) {
  let db = {
    usuarios: [],
    pacientes: [],
    triagens: [],
    consultas: [],
    leitos: [],
    internacoes: [],
    movimentacoes_leito: [],
    altas: [],
    medicamentos: [],
    movimentacoes_farmacia: [],
    materiais: [],
    movimentacoes_almoxarifado: [],
    tv_chamada: null,
    tv_historico: [],
    logs_auditoria: []
  };

  if (!forceReset && fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
      console.warn('Recriando db.json corrupto...');
    }
  }

  // 1. USUÁRIOS
  // Suporte aos usuários originais (triagem, medico, atendimento com senhas '123' ou 'admin123')
  const defaultUsers = [
    {
      id: 'usr_admin',
      usuario: 'admin',
      senha: hashPassword('admin123'),
      nome: 'Dra. Amanda Valente (Administradora)',
      tipo: 'admin',
      crm_coren: 'CRM/SP 999999',
      ativo: true,
      criadoEm: new Date().toISOString()
    },
    {
      id: 'usr_medico',
      usuario: 'medico',
      senha: hashPassword('123'), // compatível com senha original '123'
      nome: 'Dr. Roberto Santos',
      tipo: 'medico',
      crm_coren: 'CRM/SP 198452',
      ativo: true,
      criadoEm: new Date().toISOString()
    },
    {
      id: 'usr_triagem',
      usuario: 'triagem',
      senha: hashPassword('123'), // compatível com senha original '123'
      nome: 'Enfª. Amanda Silveira',
      tipo: 'triagem',
      crm_coren: 'COREN/SP 43210-ENF',
      ativo: true,
      criadoEm: new Date().toISOString()
    },
    {
      id: 'usr_atendimento',
      usuario: 'atendimento',
      senha: hashPassword('123'), // compatível com senha original '123'
      nome: 'Fernanda Lima (Recepção)',
      tipo: 'atendimento',
      crm_coren: '',
      ativo: true,
      criadoEm: new Date().toISOString()
    },
    {
      id: 'usr_farmacia',
      usuario: 'farmacia',
      senha: hashPassword('123'),
      nome: 'Drª. Patrícia Mendes (Farmacêutica)',
      tipo: 'farmaceutico',
      crm_coren: 'CRF/SP 78945',
      ativo: true,
      criadoEm: new Date().toISOString()
    },
    {
      id: 'usr_almoxarifado',
      usuario: 'almoxarifado',
      senha: hashPassword('123'),
      nome: 'Carlos Eduardo (Almoxarife)',
      tipo: 'almoxarife',
      crm_coren: '',
      ativo: true,
      criadoEm: new Date().toISOString()
    }
  ];

  // Garante que todos os usuários default existam
  if (!Array.isArray(db.usuarios) || db.usuarios.length === 0) {
    db.usuarios = defaultUsers;
  } else {
    for (const defU of defaultUsers) {
      const idx = db.usuarios.findIndex(u => u.usuario === defU.usuario);
      if (idx === -1) {
        db.usuarios.push(defU);
      } else if (!db.usuarios[idx].senha.startsWith('pbkdf2$')) {
        // Atualiza senha em texto puro para hash
        db.usuarios[idx].senha = hashPassword(db.usuarios[idx].senha);
      }
    }
  }

  // 2. LEITOS HOSPITALARES
  if (!Array.isArray(db.leitos) || db.leitos.length === 0) {
    db.leitos = [
      { id: '101', setor: 'UTI Geral', quarto: 'UTI-01', numero: 'L-01', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '102', setor: 'UTI Geral', quarto: 'UTI-01', numero: 'L-02', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '103', setor: 'UTI Geral', quarto: 'UTI-02', numero: 'L-03', status: STATUS_LEITO.MANUTENCAO, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '104', setor: 'UTI Pediátrica', quarto: 'UTIP-01', numero: 'L-01', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '201', setor: 'Enfermaria Adulto Feminino', quarto: 'Q-201', numero: 'L-01', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '202', setor: 'Enfermaria Adulto Feminino', quarto: 'Q-201', numero: 'L-02', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '203', setor: 'Enfermaria Adulto Feminino', quarto: 'Q-202', numero: 'L-03', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '301', setor: 'Enfermaria Adulto Masculino', quarto: 'Q-301', numero: 'L-01', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '302', setor: 'Enfermaria Adulto Masculino', quarto: 'Q-301', numero: 'L-02', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '401', setor: 'Pediatria', quarto: 'Q-401', numero: 'L-01', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '402', setor: 'Pediatria', quarto: 'Q-401', numero: 'L-02', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() },
      { id: '501', setor: 'Isolamento', quarto: 'ISO-01', numero: 'L-01', status: STATUS_LEITO.LIVRE, pacienteId: null, pacienteNome: null, dataOcupacao: null, updatedAt: new Date().toISOString() }
    ];
  }

  // 3. MEDICAMENTOS (FARMÁCIA)
  if (!Array.isArray(db.medicamentos) || db.medicamentos.length === 0) {
    db.medicamentos = [
      { id: 1, nome: 'Dipirona Monoidratada', principioAtivo: 'Dipirona', apresentacao: 'Ampola 500mg/mL (2mL)', concentracao: '500mg/mL', lote: 'LT-2026A1', validade: '2027-08-30', quantidade: 180, estoqueMinimo: 30, unidade: 'ampola', localizacao: 'Armário A1' },
      { id: 2, nome: 'Paracetamol Comprimido', principioAtivo: 'Paracetamol', apresentacao: 'Comprimido 500mg', concentracao: '500mg', lote: 'LT-2026B3', validade: '2027-11-15', quantidade: 250, estoqueMinimo: 50, unidade: 'comprimido', localizacao: 'Prateleira B2' },
      { id: 3, nome: 'Amoxicilina + Clavulanato', principioAtivo: 'Amoxicilina / Clavulanato de Potássio', apresentacao: 'Comprimido 500/125mg', concentracao: '500mg + 125mg', lote: 'LT-2026C4', validade: '2027-05-20', quantidade: 60, estoqueMinimo: 20, unidade: 'comprimido', localizacao: 'Armário Antibióticos' },
      { id: 4, nome: 'Ceftriaxona Dissódica', principioAtivo: 'Ceftriaxona', apresentacao: 'Frasco-ampola 1g IV', concentracao: '1g', lote: 'LT-2026D7', validade: '2027-09-10', quantidade: 45, estoqueMinimo: 15, unidade: 'frasco-ampola', localizacao: 'Armário Antibióticos' },
      { id: 5, nome: 'Ondansetrona Cloridrato', principioAtivo: 'Ondansetrona', apresentacao: 'Ampola 8mg/4mL', concentracao: '2mg/mL', lote: 'LT-2026E2', validade: '2027-07-01', quantidade: 85, estoqueMinimo: 25, unidade: 'ampola', localizacao: 'Gaveta Injetáveis' },
      { id: 6, nome: 'Omeprazol Sódico', principioAtivo: 'Omeprazol', apresentacao: 'Frasco-ampola 40mg IV', concentracao: '40mg', lote: 'LT-2026F9', validade: '2027-04-18', quantidade: 70, estoqueMinimo: 20, unidade: 'frasco-ampola', localizacao: 'Prateleira C1' },
      { id: 7, nome: 'Soro Fisiológico 0.9%', principioAtivo: 'Cloreto de Sódio 0.9%', apresentacao: 'Bolsa Sistema Fechado 500mL', concentracao: '0.9%', lote: 'LT-2026G5', validade: '2028-01-30', quantidade: 320, estoqueMinimo: 60, unidade: 'bolsa', localizacao: 'Pallet Soluções' },
      { id: 8, nome: 'Soro Glicosado 5%', principioAtivo: 'Glicose 5%', apresentacao: 'Bolsa 500mL', concentracao: '5%', lote: 'LT-2026H1', validade: '2028-02-15', quantidade: 140, estoqueMinimo: 40, unidade: 'bolsa', localizacao: 'Pallet Soluções' },
      { id: 9, nome: 'Morfina Sulfato', principioAtivo: 'Morfina', apresentacao: 'Ampola 10mg/mL (1mL)', concentracao: '10mg/mL', lote: 'LT-2026CTRL', validade: '2027-10-25', quantidade: 8, estoqueMinimo: 10, unidade: 'ampola', localizacao: 'Cofre Medicamentos Controlados' }, // Alerta de estoque baixo!
      { id: 10, nome: 'Fentanila Citrato', principioAtivo: 'Fentanila', apresentacao: 'Ampola 50mcg/mL (5mL)', concentracao: '0.05mg/mL', lote: 'LT-2026FEN', validade: '2026-12-15', quantidade: 5, estoqueMinimo: 10, unidade: 'ampola', localizacao: 'Cofre Medicamentos Controlados' }, // Alerta validade e estoque baixo
      { id: 11, nome: 'Loratadina Xarope', principioAtivo: 'Loratadina', apresentacao: 'Frasco 100mL (1mg/mL)', concentracao: '1mg/mL', lote: 'LT-2026L1', validade: '2027-06-30', quantidade: 40, estoqueMinimo: 15, unidade: 'frasco', localizacao: 'Prateleira Líquidos' },
      { id: 12, nome: 'Buscopan Composto', principioAtivo: 'Butilbrometo de Escopolamina + Dipirona', apresentacao: 'Ampola 5mL', concentracao: '4mg + 500mg/mL', lote: 'LT-2026BC', validade: '2027-12-01', quantidade: 95, estoqueMinimo: 25, unidade: 'ampola', localizacao: 'Gaveta Injetáveis' }
    ];
  }

  // 4. MATERIAIS HOSPITALARES (ALMOXARIFADO)
  if (!Array.isArray(db.materiais) || db.materiais.length === 0) {
    db.materiais = [
      { id: 1, nome: 'Luvas de Procedimento Não Cirúrgica M', categoria: 'Descartáveis', quantidade: 85, estoqueMinimo: 20, unidade: 'caixa c/ 100', localizacao: 'Corredor 1 - Estante A', lote: 'ALM-101' },
      { id: 2, nome: 'Seringa Descartável 10mL c/ Agulha 25x7', categoria: 'Insumos Médicos', quantidade: 140, estoqueMinimo: 30, unidade: 'caixa c/ 50', localizacao: 'Corredor 1 - Estante B', lote: 'ALM-102' },
      { id: 3, nome: 'Cateter Intravenoso Periférico 20G (Jelco)', categoria: 'Insumos Médicos', quantidade: 6, estoqueMinimo: 15, unidade: 'caixa c/ 50', localizacao: 'Corredor 2 - Estante A', lote: 'ALM-103' }, // Estoque baixo!
      { id: 4, nome: 'Equipo de Infusão Macrogotas c/ Injetor', categoria: 'Insumos Médicos', quantidade: 95, estoqueMinimo: 25, unidade: 'unidade', localizacao: 'Corredor 2 - Estante B', lote: 'ALM-104' },
      { id: 5, nome: 'Máscara Cirúrgica Tripla c/ Elástico', categoria: 'Descartáveis', quantidade: 110, estoqueMinimo: 20, unidade: 'caixa c/ 50', localizacao: 'Corredor 3 - Estante A', lote: 'ALM-105' },
      { id: 6, nome: 'Álcool Etílico em Gel 70% 1 Litro', categoria: 'Higiene e Desinfecção', quantidade: 48, estoqueMinimo: 15, unidade: 'frasco 1L', localizacao: 'Corredor 3 - Estante C', lote: 'ALM-106' },
      { id: 7, nome: 'Gaze Estéril 7.5cm x 7.5cm 11 Fios', categoria: 'Insumos Médicos', quantidade: 0, estoqueMinimo: 50, unidade: 'pacote c/ 10', localizacao: 'Corredor 1 - Estante C', lote: 'ALM-107' }, // Zerado!
      { id: 8, nome: 'Fita Microporosa 50mm x 10m Hospitalar', categoria: 'Insumos Médicos', quantidade: 32, estoqueMinimo: 10, unidade: 'rolo', localizacao: 'Corredor 2 - Estante C', lote: 'ALM-108' },
      { id: 9, nome: 'Avental Descartável Gramatura 30', categoria: 'Descartáveis', quantidade: 75, estoqueMinimo: 20, unidade: 'pacote c/ 10', localizacao: 'Corredor 3 - Estante B', lote: 'ALM-109' },
      { id: 10, nome: 'Termômetro Digital Clínico Axilar', categoria: 'Equipamentos', quantidade: 18, estoqueMinimo: 5, unidade: 'unidade', localizacao: 'Armário Equipamentos', lote: 'ALM-110' }
    ];
  }

  // 5. PACIENTES INICIAIS DE DEMONSTRAÇÃO
  if (!Array.isArray(db.pacientes) || db.pacientes.length === 0) {
    db.pacientes = [
      {
        id: 1700000001,
        nome: 'Mariana Souza Santos',
        cpf: '123.456.789-09',
        rg: '45.123.890-X',
        dataNascimento: '1992-04-14',
        sexo: 'Feminino',
        telefone: '(11) 98765-4321',
        email: 'mariana.souza@email.com',
        endereco: { rua: 'Rua das Flores', numero: '120', bairro: 'Jardins', cidade: 'São Paulo', estado: 'SP', cep: '01415-000' },
        tipo: 'Particular',
        alergias: 'Penicilina e Dipirona',
        status: STATUS_PACIENTE.AGUARDANDO_TRIAGEM,
        senhaAtendimento: 'P-01',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 1700000002,
        nome: 'Carlos Alberto Ferreira',
        cpf: '789.012.345-67',
        rg: '33.456.789-1',
        dataNascimento: '1968-11-23',
        sexo: 'Masculino',
        telefone: '(11) 97654-3210',
        email: 'carlos.ferreira@email.com',
        endereco: { rua: 'Av. Paulista', numero: '1500', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', cep: '01310-200' },
        tipo: 'Convenio',
        convenioNumero: 'UNIMED-884512-SP',
        alergias: 'Nenhuma',
        status: STATUS_PACIENTE.AGUARDANDO_MEDICO,
        senhaAtendimento: 'A-02',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 5400000).toISOString()
      }
    ];

    db.triagens = [
      {
        id: 170000000201,
        pacienteId: 1700000002,
        nome: 'Carlos Alberto Ferreira',
        cpf: '789.012.345-67',
        pressaoArterial: '150/95',
        frequenciaCardiaca: 98,
        frequenciaRespiratoria: 22,
        temperatura: 38.6,
        saturacaoO2: 95,
        glicemia: '142',
        escalaDor: 6,
        sintoma: 'febre_dor_peito',
        queixaPrincipal: 'Febre alta há 2 dias, tosse produtiva e dor torácica ao respirar fundo.',
        alergia: 'Nenhuma conhecida',
        comorbidades: 'Hipertensão Arterial Sistêmica',
        observacao: 'Paciente taquipneico, febril e queixando-se de cansaço aos médios esforços.',
        risco: 'amarelo',
        responsavel: 'Enfª. Amanda Silveira (COREN/SP 43210-ENF)',
        status: STATUS_PACIENTE.AGUARDANDO_MEDICO,
        createdAt: new Date(Date.now() - 5400000).toISOString()
      }
    ];
  }

  // Grava arquivo
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log('✅ Banco de dados JSON inicializado e populado com sucesso em:', DB_PATH);
  return db;
}

if (require.main === module) {
  seedDatabase(false);
}

module.exports = {
  seedDatabase
};
