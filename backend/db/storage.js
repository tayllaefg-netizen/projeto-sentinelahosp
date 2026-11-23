const fs = require('fs');
const path = require('path');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { cleanCPF, formatCPF } = require('../utils/cpfValidator');
const { STATUS_LEITO, STATUS_PACIENTE } = require('../config/constants');

const DB_PATH = path.resolve(__dirname, '../db.json');

class Storage {
  constructor() {
    this.dbPath = DB_PATH;
    this.memoryDb = null;
    this.isWriting = false;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dbPath)) {
      this.memoryDb = this.getDefaultSchema();
      this.persist();
    } else {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.memoryDb = JSON.parse(raw);
        this.ensureSchemaIntegrity();
      } catch (err) {
        console.error('Erro ao ler db.json, restaurando backup padrão:', err.message);
        this.memoryDb = this.getDefaultSchema();
        this.persist();
      }
    }
  }

  getDefaultSchema() {
    return {
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
  }

  ensureSchemaIntegrity() {
    const defaultSchema = this.getDefaultSchema();
    let modified = false;

    for (const key of Object.keys(defaultSchema)) {
      if (this.memoryDb[key] === undefined) {
        this.memoryDb[key] = defaultSchema[key];
        modified = true;
      }
    }

    if (modified) {
      this.persist();
    }
  }

  read() {
    // Sempre lê cópia consistente
    if (!this.memoryDb) {
      this.init();
    }
    return this.memoryDb;
  }

  persist() {
    try {
      // Gravação atômica: escreve em arquivo temporário e renomeia
      const tempPath = `${this.dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.memoryDb, null, 2), 'utf8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (err) {
      console.error('Erro ao persistir banco de dados JSON:', err.message);
      // Fallback para gravação direta
      fs.writeFileSync(this.dbPath, JSON.stringify(this.memoryDb, null, 2), 'utf8');
    }
  }

  // ==========================================
  // USUÁRIOS & AUTENTICAÇÃO
  // ==========================================

  getUsers() {
    const db = this.read();
    return db.usuarios.map(u => {
      const copy = { ...u };
      delete copy.senha; // Nunca retorna o hash de senha
      return copy;
    });
  }

  getUserByUsername(username) {
    const db = this.read();
    return db.usuarios.find(u => u.usuario.toLowerCase() === String(username).toLowerCase().trim());
  }

  getUserById(id) {
    const db = this.read();
    const user = db.usuarios.find(u => String(u.id) === String(id));
    if (!user) return null;
    const copy = { ...user };
    delete copy.senha;
    return copy;
  }

  createUser(userData) {
    const db = this.read();
    const existing = db.usuarios.find(u => u.usuario.toLowerCase() === userData.usuario.toLowerCase().trim());
    if (existing) {
      throw new Error(`O usuário '${userData.usuario}' já existe no sistema.`);
    }

    const newUser = {
      id: Date.now().toString(),
      usuario: userData.usuario.trim(),
      senha: hashPassword(userData.senha),
      nome: userData.nome || userData.usuario,
      tipo: userData.tipo, // 'admin', 'medico', 'triagem', 'atendimento', 'farmaceutico', 'almoxarife'
      crm_coren: userData.crm_coren || '',
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    db.usuarios.push(newUser);
    this.persist();

    const safeUser = { ...newUser };
    delete safeUser.senha;
    return safeUser;
  }

  validateLogin(username, password) {
    const user = this.getUserByUsername(username);
    if (!user) return null;

    const isValid = verifyPassword(password, user.senha);
    if (!isValid) return null;

    // Se a senha ainda estava em texto puro (legada), atualiza para hash seguro
    if (!user.senha.startsWith('pbkdf2$')) {
      user.senha = hashPassword(password);
      this.persist();
    }

    const safeUser = { ...user };
    delete safeUser.senha;
    return safeUser;
  }

  // ==========================================
  // PACIENTES
  // ==========================================

  getPatients(filters = {}) {
    const db = this.read();
    let result = [...db.pacientes];

    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(p =>
        (p.nome && p.nome.toLowerCase().includes(term)) ||
        (p.cpf && p.cpf.includes(term)) ||
        (p.senhaAtendimento && p.senhaAtendimento.toLowerCase().includes(term))
      );
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getPatientById(id) {
    const db = this.read();
    return db.pacientes.find(p => String(p.id) === String(id)) || null;
  }

  getPatientByCPF(cpf) {
    const cleaned = cleanCPF(cpf);
    const db = this.read();
    return db.pacientes.find(p => cleanCPF(p.cpf) === cleaned) || null;
  }

  createPatient(patientData) {
    const db = this.read();
    const cleaned = cleanCPF(patientData.cpf);

    // Validação de duplicidade de CPF
    if (cleaned) {
      const existing = db.pacientes.find(p => cleanCPF(p.cpf) === cleaned);
      if (existing) {
        throw new Error(`Já existe um paciente cadastrado com o CPF ${formatCPF(cleaned)} (Paciente: ${existing.nome}).`);
      }
    }

    // Geração de senha de atendimento amigável (ex: A-01, P-02, E-03)
    const prefix = patientData.tipo === 'Particular' ? 'P' : (patientData.tipo === 'Emergência' ? 'E' : 'A');
    const seq = (db.pacientes.length % 99) + 1;
    const senhaAtendimento = `${prefix}-${String(seq).padStart(2, '0')}`;

    const newPatient = {
      id: Date.now(),
      nome: patientData.nome.trim(),
      cpf: formatCPF(cleaned),
      rg: patientData.rg || '',
      dataNascimento: patientData.dataNascimento || '',
      sexo: patientData.sexo || 'Não informado',
      telefone: patientData.telefone || '',
      email: patientData.email || '',
      endereco: patientData.endereco || {
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      },
      nomeMae: patientData.nomeMae || '',
      tipo: patientData.tipo || 'Particular',
      convenioNumero: patientData.convenioNumero || '',
      alergias: patientData.alergias || 'Nenhuma informada',
      status: STATUS_PACIENTE.AGUARDANDO_TRIAGEM,
      senhaAtendimento,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.pacientes.unshift(newPatient);
    this.persist();
    return newPatient;
  }

  updatePatient(id, updateData) {
    const db = this.read();
    const idx = db.pacientes.findIndex(p => String(p.id) === String(id));
    if (idx === -1) {
      throw new Error(`Paciente com ID ${id} não encontrado.`);
    }

    // Se alterou CPF, verifica duplicidade com outro paciente
    if (updateData.cpf) {
      const cleaned = cleanCPF(updateData.cpf);
      const conflict = db.pacientes.find(p => String(p.id) !== String(id) && cleanCPF(p.cpf) === cleaned);
      if (conflict) {
        throw new Error(`O CPF ${formatCPF(cleaned)} já está associado a outro paciente (${conflict.nome}).`);
      }
      updateData.cpf = formatCPF(cleaned);
    }

    db.pacientes[idx] = {
      ...db.pacientes[idx],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.persist();
    return db.pacientes[idx];
  }

  // ==========================================
  // TRIAGEM (CLASSIFICAÇÃO DE RISCO MANCHESTER)
  // ==========================================

  getTriagens(filters = {}) {
    const db = this.read();
    let result = [...db.triagens];

    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.risco) {
      result = result.filter(t => t.risco === filters.risco);
    }

    // Ordenação clínica por gravidade Manchester e depois horário de chegada
    const priorityOrder = { vermelho: 1, laranja: 2, amarelo: 3, verde: 4, azul: 5 };
    return result.sort((a, b) => {
      const pA = priorityOrder[a.risco] || 99;
      const pB = priorityOrder[b.risco] || 99;
      if (pA !== pB) return pA - pB;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  createTriagem(triagemData) {
    const db = this.read();

    const triagem = {
      id: Date.now(),
      pacienteId: triagemData.pacienteId || null,
      nome: triagemData.nome,
      cpf: triagemData.cpf || '',
      pressaoArterial: triagemData.pressaoArterial || triagemData.pa || '120/80',
      frequenciaCardiaca: triagemData.frequenciaCardiaca || triagemData.fc || 75,
      frequenciaRespiratoria: triagemData.frequenciaRespiratoria || triagemData.fr || 18,
      temperatura: Number(triagemData.temperatura) || 36.5,
      saturacaoO2: Number(triagemData.saturacaoO2) || 98,
      glicemia: triagemData.glicemia || '',
      escalaDor: Number(triagemData.escalaDor) || 0,
      sintoma: triagemData.sintoma || 'Geral',
      queixaPrincipal: triagemData.queixaPrincipal || triagemData.sintoma || '',
      alergia: triagemData.alergia || 'Nenhuma',
      comorbidades: triagemData.comorbidades || '',
      observacao: triagemData.observacao || '',
      risco: triagemData.risco || 'verde',
      responsavel: triagemData.responsavel || 'Equipe de Enfermagem',
      iaRecomendacao: triagemData.iaRecomendacao || null,
      iaValidadaPor: triagemData.iaValidadaPor || null,
      status: STATUS_PACIENTE.AGUARDANDO_MEDICO,
      createdAt: new Date().toISOString()
    };

    db.triagens.unshift(triagem);

    // Atualiza status do paciente correspondente
    if (triagemData.pacienteId) {
      const pIdx = db.pacientes.findIndex(p => String(p.id) === String(triagemData.pacienteId));
      if (pIdx !== -1) {
        db.pacientes[pIdx].status = STATUS_PACIENTE.AGUARDANDO_MEDICO;
        db.pacientes[pIdx].triagemId = triagem.id;
        db.pacientes[pIdx].risco = triagem.risco;
        db.pacientes[pIdx].updatedAt = new Date().toISOString();
      }
    } else if (triagemData.nome) {
      // Tenta associar por nome se pacienteId não veio
      const pIdx = db.pacientes.findIndex(p => p.nome.toLowerCase() === triagemData.nome.toLowerCase());
      if (pIdx !== -1) {
        db.pacientes[pIdx].status = STATUS_PACIENTE.AGUARDANDO_MEDICO;
        db.pacientes[pIdx].triagemId = triagem.id;
        db.pacientes[pIdx].risco = triagem.risco;
        triagem.pacienteId = db.pacientes[pIdx].id;
      }
    }

    this.persist();
    return triagem;
  }

  updateTriagem(id, updateData) {
    const db = this.read();
    const idx = db.triagens.findIndex(t => String(t.id) === String(id));
    if (idx === -1) {
      throw new Error(`Triagem ID ${id} não encontrada.`);
    }

    db.triagens[idx] = {
      ...db.triagens[idx],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.persist();
    return db.triagens[idx];
  }

  // ==========================================
  // CONSULTAS MÉDICAS & ATENDIMENTO
  // ==========================================

  getConsultas(filters = {}) {
    const db = this.read();
    let result = [...db.consultas];

    if (filters.pacienteId) {
      result = result.filter(c => String(c.pacienteId) === String(filters.pacienteId));
    }
    if (filters.medico) {
      result = result.filter(c => c.medicoNome && c.medicoNome.toLowerCase().includes(filters.medico.toLowerCase()));
    }

    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createConsulta(consultaData) {
    const db = this.read();

    const consulta = {
      id: Date.now(),
      pacienteId: consultaData.pacienteId || null,
      paciente: consultaData.paciente,
      triagemId: consultaData.triagemId || null,
      medicoId: consultaData.medicoId || null,
      medicoNome: consultaData.medicoNome || 'Dr. Médico Responsável',
      crm: consultaData.crm || 'CRM/SP 123456',
      queixa: consultaData.queixa || '',
      anamnese: consultaData.anamnese || '',
      exameFisico: consultaData.exameFisico || '',
      diagnostico: consultaData.diagnostico || '',
      cid10: consultaData.cid10 || '',
      conduta: consultaData.conduta || '',
      medicacao: consultaData.medicacao || '',
      prescricao: consultaData.prescricao || [],
      examesSolicitados: consultaData.examesSolicitados || [],
      decisaoClinica: consultaData.decisaoClinica || 'alta', // 'alta', 'internacao', 'observacao'
      obs: consultaData.obs || '',
      createdAt: new Date().toISOString()
    };

    db.consultas.unshift(consulta);

    // Atualiza status do paciente e da triagem
    let targetStatus = STATUS_PACIENTE.ALTA;
    if (consulta.decisaoClinica === 'internacao') {
      targetStatus = STATUS_PACIENTE.AGUARDANDO_INTERNACAO;
    }

    if (consulta.pacienteId) {
      const pIdx = db.pacientes.findIndex(p => String(p.id) === String(consulta.pacienteId));
      if (pIdx !== -1) {
        db.pacientes[pIdx].status = targetStatus;
        db.pacientes[pIdx].ultimaConsultaId = consulta.id;
        db.pacientes[pIdx].updatedAt = new Date().toISOString();
      }
    } else if (consulta.paciente) {
      const pIdx = db.pacientes.findIndex(p => p.nome.toLowerCase() === consulta.paciente.toLowerCase());
      if (pIdx !== -1) {
        db.pacientes[pIdx].status = targetStatus;
        db.pacientes[pIdx].ultimaConsultaId = consulta.id;
        consulta.pacienteId = db.pacientes[pIdx].id;
      }
    }

    if (consulta.triagemId) {
      const tIdx = db.triagens.findIndex(t => String(t.id) === String(consulta.triagemId));
      if (tIdx !== -1) {
        db.triagens[tIdx].status = 'atendido';
      }
    } else if (consulta.paciente) {
      const tIdx = db.triagens.findIndex(t => t.nome.toLowerCase() === consulta.paciente.toLowerCase() && t.status !== 'atendido');
      if (tIdx !== -1) {
        db.triagens[tIdx].status = 'atendido';
      }
    }

    this.persist();
    return consulta;
  }

  // ==========================================
  // GESTÃO DE LEITOS & INTERNAÇÕES
  // ==========================================

  getLeitos(filters = {}) {
    const db = this.read();
    let result = [...db.leitos];

    if (filters.setor) {
      result = result.filter(l => l.setor === filters.setor);
    }
    if (filters.status) {
      result = result.filter(l => l.status === filters.status);
    }

    return result.sort((a, b) => a.quarto.localeCompare(b.quarto) || a.numero.localeCompare(b.numero));
  }

  getLeitoById(id) {
    const db = this.read();
    return db.leitos.find(l => String(l.id) === String(id)) || null;
  }

  updateLeito(id, updateData) {
    const db = this.read();
    const idx = db.leitos.findIndex(l => String(l.id) === String(id));
    if (idx === -1) {
      throw new Error(`Leito ID ${id} não encontrado.`);
    }

    db.leitos[idx] = {
      ...db.leitos[idx],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    this.persist();
    return db.leitos[idx];
  }

  getInternacoes(filters = {}) {
    const db = this.read();
    let result = [...db.internacoes];

    if (filters.status) {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters.pacienteId) {
      result = result.filter(i => String(i.pacienteId) === String(filters.pacienteId));
    }

    return result.sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm));
  }

  getInternacaoById(id) {
    const db = this.read();
    return db.internacoes.find(i => String(i.id) === String(id)) || null;
  }

  createInternacao(data) {
    const db = this.read();

    // 1. Validação do Leito
    const leito = db.leitos.find(l => String(l.id) === String(data.leitoId));
    if (!leito) {
      throw new Error(`Leito selecionado (ID: ${data.leitoId}) não existe.`);
    }

    // Regra crítica: impede que 2 pacientes ocupem o mesmo leito!
    if (leito.status === STATUS_LEITO.OCUPADO) {
      throw new Error(`Conflito: O leito ${leito.quarto}-${leito.numero} já está ocupado por outro paciente (${leito.pacienteNome || 'Paciente Internado'}).`);
    }

    if (leito.status === STATUS_LEITO.MANUTENCAO) {
      throw new Error(`O leito ${leito.quarto}-${leito.numero} está em manutenção e não pode ser ocupado.`);
    }

    // 2. Validação de paciente já internado
    if (data.pacienteId) {
      const jaInternado = db.internacoes.find(i => String(i.pacienteId) === String(data.pacienteId) && i.status === 'internado');
      if (jaInternado) {
        throw new Error(`O paciente já possui uma internação ativa em andamento no leito ${jaInternado.quarto}-${jaInternado.leitoNumero}.`);
      }
    }

    // 3. Criação do registro de internação
    const internacao = {
      id: Date.now(),
      pacienteId: data.pacienteId || null,
      pacienteNome: data.pacienteNome || data.paciente,
      pacienteCpf: data.pacienteCpf || '',
      setor: leito.setor,
      quarto: leito.quarto,
      leitoId: leito.id,
      leitoNumero: leito.numero,
      medicoResponsavel: data.medicoResponsavel || 'Médico Assistente',
      dataEntrada: data.dataEntrada || new Date().toISOString(),
      motivo: data.motivo,
      diagnostico: data.diagnostico || '',
      dieta: data.dieta || 'Livre',
      isolamento: Boolean(data.isolamento),
      evolucao: [
        {
          data: new Date().toISOString(),
          profissional: data.medicoResponsavel || 'Médico Admissional',
          nota: `Admissão hospitalar no leito ${leito.quarto}-${leito.numero}. Motivo: ${data.motivo}`
        }
      ],
      status: 'internado',
      criadaEm: new Date().toISOString()
    };

    db.internacoes.unshift(internacao);

    // 4. Atualiza o status do leito para OCUPADO
    leito.status = STATUS_LEITO.OCUPADO;
    leito.pacienteId = internacao.pacienteId;
    leito.pacienteNome = internacao.pacienteNome;
    leito.internacaoId = internacao.id;
    leito.dataOcupacao = internacao.dataEntrada;
    leito.updatedAt = new Date().toISOString();

    // 5. Atualiza o paciente para INTERNADO
    if (data.pacienteId) {
      const pIdx = db.pacientes.findIndex(p => String(p.id) === String(data.pacienteId));
      if (pIdx !== -1) {
        db.pacientes[pIdx].status = STATUS_PACIENTE.INTERNADO;
        db.pacientes[pIdx].leitoId = leito.id;
        db.pacientes[pIdx].internacaoId = internacao.id;
        db.pacientes[pIdx].updatedAt = new Date().toISOString();
      }
    }

    this.persist();
    return internacao;
  }

  transferirLeito(internacaoId, novoLeitoId, motivo, responsavel) {
    const db = this.read();
    const internacao = db.internacoes.find(i => String(i.id) === String(internacaoId));
    if (!internacao || internacao.status !== 'internado') {
      throw new Error(`Internação ativa ID ${internacaoId} não encontrada.`);
    }

    const leitoOrigem = db.leitos.find(l => String(l.id) === String(internacao.leitoId));
    const leitoDestino = db.leitos.find(l => String(l.id) === String(novoLeitoId));

    if (!leitoDestino) {
      throw new Error(`Novo leito ID ${novoLeitoId} não encontrado.`);
    }

    if (leitoDestino.status !== STATUS_LEITO.LIVRE) {
      throw new Error(`O leito de destino ${leitoDestino.quarto}-${leitoDestino.numero} não está livre (status: ${leitoDestino.status}).`);
    }

    // Registra histórico de movimentação
    const movimentacao = {
      id: Date.now(),
      internacaoId: internacao.id,
      pacienteId: internacao.pacienteId,
      pacienteNome: internacao.pacienteNome,
      leitoOrigem: leitoOrigem ? `${leitoOrigem.quarto}-${leitoOrigem.numero}` : 'Indefinido',
      leitoDestino: `${leitoDestino.quarto}-${leitoDestino.numero}`,
      motivo: motivo || 'Transferência de setor/leito solicitada',
      responsavel: responsavel || 'Equipe Médica/Enfermagem',
      dataHora: new Date().toISOString()
    };
    db.movimentacoes_leito.unshift(movimentacao);

    // Libera leito de origem
    if (leitoOrigem) {
      leitoOrigem.status = STATUS_LEITO.LIVRE;
      leitoOrigem.pacienteId = null;
      leitoOrigem.pacienteNome = null;
      leitoOrigem.internacaoId = null;
      leitoOrigem.dataOcupacao = null;
      leitoOrigem.updatedAt = new Date().toISOString();
    }

    // Ocupa novo leito
    leitoDestino.status = STATUS_LEITO.OCUPADO;
    leitoDestino.pacienteId = internacao.pacienteId;
    leitoDestino.pacienteNome = internacao.pacienteNome;
    leitoDestino.internacaoId = internacao.id;
    leitoDestino.dataOcupacao = new Date().toISOString();
    leitoDestino.updatedAt = new Date().toISOString();

    // Atualiza internação
    internacao.setor = leitoDestino.setor;
    internacao.quarto = leitoDestino.quarto;
    internacao.leitoId = leitoDestino.id;
    internacao.leitoNumero = leitoDestino.numero;
    internacao.evolucao.unshift({
      data: new Date().toISOString(),
      profissional: responsavel || 'Enfermagem',
      nota: `Paciente transferido do leito ${movimentacao.leitoOrigem} para ${movimentacao.leitoDestino}. Motivo: ${motivo}`
    });

    this.persist();
    return { internacao, movimentacao };
  }

  adicionarEvolucaoInternacao(internacaoId, nota, profissional) {
    const db = this.read();
    const internacao = db.internacoes.find(i => String(i.id) === String(internacaoId));
    if (!internacao) {
      throw new Error(`Internação ID ${internacaoId} não encontrada.`);
    }

    const evolucaoEntry = {
      data: new Date().toISOString(),
      profissional: profissional || 'Profissional de Saúde',
      nota: nota
    };

    if (!Array.isArray(internacao.evolucao)) {
      internacao.evolucao = [];
    }
    internacao.evolucao.unshift(evolucaoEntry);

    this.persist();
    return evolucaoEntry;
  }

  // ==========================================
  // ALTA HOSPITALAR
  // ==========================================

  getAltas() {
    const db = this.read();
    return [...db.altas].sort((a, b) => new Date(b.criadaEm) - new Date(a.criadaEm));
  }

  getAltaById(id) {
    const db = this.read();
    return db.altas.find(a => String(a.id) === String(id)) || null;
  }

  createAlta(altaData) {
    const db = this.read();

    const alta = {
      id: Date.now(),
      pacienteId: altaData.pacienteId || null,
      pacienteNome: altaData.pacienteNome || altaData.paciente,
      pacienteCpf: altaData.pacienteCpf || '',
      internacaoId: altaData.internacaoId || null,
      consultaId: altaData.consultaId || null,
      medicoResponsavel: altaData.medicoResponsavel || 'Dr. Médico Responsável',
      crm: altaData.crm || 'CRM/SP 123456',
      dataAlta: altaData.dataAlta || new Date().toISOString().split('T')[0],
      horaAlta: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipoAlta: altaData.tipoAlta || 'Curado/Melhorado', // 'Curado/Melhorado', 'A pedido', 'Transferência Externa', 'Óbito'
      resumoAtendimento: altaData.resumoAtendimento || '',
      orientacoes: altaData.orientacoes || '',
      prescricaoDomiciliar: altaData.prescricaoDomiciliar || altaData.medicacao || '',
      retornoDias: altaData.retornoDias || 'Conforme necessidade ou em 7 dias',
      criadaEm: new Date().toISOString()
    };

    db.altas.unshift(alta);

    // 1. Se veio de internação ativa, finaliza a internação e LIBERA O LEITO
    if (alta.internacaoId) {
      const internacao = db.internacoes.find(i => String(i.id) === String(alta.internacaoId));
      if (internacao) {
        internacao.status = 'alta';
        internacao.finalizadaEm = new Date().toISOString();
        internacao.altaId = alta.id;

        // Libera o leito ocupado
        const leito = db.leitos.find(l => String(l.id) === String(internacao.leitoId));
        if (leito) {
          leito.status = STATUS_LEITO.LIVRE;
          leito.pacienteId = null;
          leito.pacienteNome = null;
          leito.internacaoId = null;
          leito.dataOcupacao = null;
          leito.updatedAt = new Date().toISOString();
        }
      }
    }

    // 2. Se o paciente estava internado em algum leito ativo, garante liberação
    if (alta.pacienteId) {
      const leitosOcupados = db.leitos.filter(l => String(l.pacienteId) === String(alta.pacienteId));
      for (const leito of leitosOcupados) {
        leito.status = STATUS_LEITO.LIVRE;
        leito.pacienteId = null;
        leito.pacienteNome = null;
        leito.internacaoId = null;
        leito.dataOcupacao = null;
        leito.updatedAt = new Date().toISOString();
      }

      // Atualiza status do paciente para 'alta'
      const pIdx = db.pacientes.findIndex(p => String(p.id) === String(alta.pacienteId));
      if (pIdx !== -1) {
        db.pacientes[pIdx].status = STATUS_PACIENTE.ALTA;
        db.pacientes[pIdx].altaId = alta.id;
        db.pacientes[pIdx].updatedAt = new Date().toISOString();
      }
    }

    this.persist();
    return alta;
  }

  // ==========================================
  // FARMÁCIA & CONTROLE DE MEDICAÇÕES
  // ==========================================

  getMedicamentos() {
    const db = this.read();
    return [...db.medicamentos].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  getMedicamentoById(id) {
    const db = this.read();
    return db.medicamentos.find(m => String(m.id) === String(id)) || null;
  }

  createMedicamento(data) {
    const db = this.read();

    const novo = {
      id: Date.now(),
      nome: data.nome.trim(),
      principioAtivo: data.principioAtivo || data.nome,
      apresentacao: data.apresentacao || 'Comprimido', // Ampola, Frasco, Comprimido, Pomada, Bolsa
      concentracao: data.concentracao || 'Padrão',
      lote: data.lote || `LT-${Math.floor(100000 + Math.random() * 900000)}`,
      validade: data.validade || '2027-12-31',
      quantidade: parseInt(data.quantidade, 10) || 0,
      estoqueMinimo: parseInt(data.estoqueMinimo, 10) || 10,
      unidade: data.unidade || 'un',
      localizacao: data.localizacao || 'Armário Central',
      criadoEm: new Date().toISOString()
    };

    db.medicamentos.push(novo);
    this.persist();
    return novo;
  }

  movimentarEstoqueMedicamento(medicamentoId, tipo, quantidade, motivo, responsavel, extra = {}) {
    const db = this.read();
    const med = db.medicamentos.find(m => String(m.id) === String(medicamentoId));
    if (!med) {
      throw new Error(`Medicamento ID ${medicamentoId} não encontrado.`);
    }

    const qtd = parseInt(quantidade, 10);
    if (isNaN(qtd) || qtd <= 0) {
      throw new Error('Quantidade inválida para movimentação.');
    }

    if (tipo === 'saida' || tipo === 'dispensacao' || tipo === 'perda') {
      if (med.quantidade < qtd) {
        throw new Error(`Estoque insuficiente de ${med.nome}. Disponível: ${med.quantidade}, Solicitado: ${qtd}.`);
      }
      med.quantidade -= qtd;
    } else if (tipo === 'entrada') {
      med.quantidade += qtd;
    } else {
      throw new Error(`Tipo de movimentação inválido: ${tipo}`);
    }

    const movimentacao = {
      id: Date.now(),
      medicamentoId: med.id,
      medicamentoNome: med.nome,
      tipo,
      quantidade: qtd,
      motivo: motivo || 'Movimentação operacional',
      responsavel: responsavel || 'Farmacêutico',
      pacienteId: extra.pacienteId || null,
      pacienteNome: extra.pacienteNome || null,
      prescricaoId: extra.prescricaoId || null,
      saldoRestante: med.quantidade,
      dataHora: new Date().toISOString()
    };

    db.movimentacoes_farmacia.unshift(movimentacao);
    this.persist();

    return { medicamento: med, movimentacao };
  }

  getMovimentacoesFarmacia() {
    const db = this.read();
    return [...db.movimentacoes_farmacia].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }

  // ==========================================
  // ALMOXARIFADO & MATERIAIS
  // ==========================================

  getMateriais() {
    const db = this.read();
    return [...db.materiais].sort((a, b) => a.nome.localeCompare(b.nome));
  }

  getMaterialById(id) {
    const db = this.read();
    return db.materiais.find(m => String(m.id) === String(id)) || null;
  }

  createMaterial(data) {
    const db = this.read();

    const novo = {
      id: Date.now(),
      nome: data.nome.trim(),
      categoria: data.categoria || 'Insumos Médicos', // 'Insumos Médicos', 'Higiene e Desinfecção', 'Equipamentos', 'Descartáveis', 'Escritório'
      quantidade: parseInt(data.quantidade, 10) || 0,
      estoqueMinimo: parseInt(data.estoqueMinimo, 10) || 10,
      unidade: data.unidade || 'unidade',
      localizacao: data.localizacao || 'Almoxarifado Principal',
      lote: data.lote || `ALM-${Math.floor(1000 + Math.random() * 9000)}`,
      criadoEm: new Date().toISOString()
    };

    db.materiais.push(novo);
    this.persist();
    return novo;
  }

  movimentarEstoqueMaterial(materialId, tipo, quantidade, setorDestino, motivo, responsavel, extra = {}) {
    const db = this.read();
    const mat = db.materiais.find(m => String(m.id) === String(materialId));
    if (!mat) {
      throw new Error(`Material ID ${materialId} não encontrado.`);
    }

    const qtd = parseInt(quantidade, 10);
    if (isNaN(qtd) || qtd <= 0) {
      throw new Error('Quantidade informada é inválida.');
    }

    if (tipo === 'saida') {
      if (mat.quantidade < qtd) {
        throw new Error(`Estoque insuficiente do material ${mat.nome}. Saldo disponível: ${mat.quantidade}, Requisitado: ${qtd}.`);
      }
      mat.quantidade -= qtd;
    } else if (tipo === 'entrada') {
      mat.quantidade += qtd;
    } else {
      throw new Error(`Tipo de movimentação inválido: ${tipo}`);
    }

    const movimentacao = {
      id: Date.now(),
      materialId: mat.id,
      materialNome: mat.nome,
      tipo,
      quantidade: qtd,
      setorDestino: setorDestino || 'Geral',
      motivo: motivo || 'Requisição setorial',
      responsavel: responsavel || 'Almoxarife',
      fornecedor: extra.fornecedor || '',
      notaFiscal: extra.notaFiscal || '',
      saldoRestante: mat.quantidade,
      dataHora: new Date().toISOString()
    };

    db.movimentacoes_almoxarifado.unshift(movimentacao);
    this.persist();

    return { material: mat, movimentacao };
  }

  getMovimentacoesAlmoxarifado() {
    const db = this.read();
    return [...db.movimentacoes_almoxarifado].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));
  }

  // ==========================================
  // TV & CHAMADAS INDOOR
  // ==========================================

  chamarNaTv(dadosChamada) {
    const db = this.read();

    const chamada = {
      id: Date.now().toString(),
      localTipo: dadosChamada.localTipo || 'CONSULTÓRIO', // 'GUICHÊ', 'CONSULTÓRIO', 'SALA DE TRIAGEM'
      localNumero: String(dadosChamada.localNumero || '01'),
      paciente: dadosChamada.paciente,
      senha: dadosChamada.senha || 'A-01',
      medico: dadosChamada.medico || '',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    db.tv_chamada = chamada;

    if (!Array.isArray(db.tv_historico)) {
      db.tv_historico = [];
    }

    db.tv_historico.unshift(chamada);
    if (db.tv_historico.length > 10) {
      db.tv_historico.pop();
    }

    this.persist();
    return chamada;
  }

  getTvChamada() {
    const db = this.read();
    return {
      chamada: db.tv_chamada,
      historico: db.tv_historico || []
    };
  }

  // ==========================================
  // AUDITORIA
  // ==========================================

  logAudit(auditEntry) {
    const db = this.read();
    const entry = {
      id: Date.now(),
      ...auditEntry,
      criadoEm: auditEntry.criadoEm || new Date().toISOString()
    };

    if (!Array.isArray(db.logs_auditoria)) {
      db.logs_auditoria = [];
    }

    db.logs_auditoria.unshift(entry);
    // Limita logs no JSON a 500 para performance
    if (db.logs_auditoria.length > 500) {
      db.logs_auditoria.pop();
    }

    this.persist();
    return entry;
  }

  getAuditLogs(limit = 100) {
    const db = this.read();
    return (db.logs_auditoria || []).slice(0, limit);
  }

  // ==========================================
  // DASHBOARD & MÉTRICAS REAIS
  // ==========================================

  getDashboardMetrics() {
    const db = this.read();

    const hoje = new Date().toISOString().split('T')[0];

    const totalPacientes = db.pacientes.length;

    // Atendimentos / Consultas do dia
    const atendimentosHoje = db.consultas.filter(c => c.createdAt && c.createdAt.startsWith(hoje)).length;

    // Pacientes aguardando triagem
    const aguardandoTriagem = db.pacientes.filter(p => p.status === STATUS_PACIENTE.AGUARDANDO_TRIAGEM).length;

    // Pacientes aguardando médico
    const aguardandoMedico = db.triagens.filter(t => t.status === STATUS_PACIENTE.AGUARDANDO_MEDICO).length;

    // Risco Manchester dos pacientes aguardando médico
    const manchesterFila = {
      vermelho: db.triagens.filter(t => t.status === STATUS_PACIENTE.AGUARDANDO_MEDICO && t.risco === 'vermelho').length,
      laranja: db.triagens.filter(t => t.status === STATUS_PACIENTE.AGUARDANDO_MEDICO && t.risco === 'laranja').length,
      amarelo: db.triagens.filter(t => t.status === STATUS_PACIENTE.AGUARDANDO_MEDICO && t.risco === 'amarelo').length,
      verde: db.triagens.filter(t => t.status === STATUS_PACIENTE.AGUARDANDO_MEDICO && t.risco === 'verde').length,
      azul: db.triagens.filter(t => t.status === STATUS_PACIENTE.AGUARDANDO_MEDICO && t.risco === 'azul').length
    };

    // Leitos
    const totalLeitos = db.leitos.length;
    const leitosOcupados = db.leitos.filter(l => l.status === STATUS_LEITO.OCUPADO).length;
    const leitosLivres = db.leitos.filter(l => l.status === STATUS_LEITO.LIVRE).length;
    const leitosManutencao = db.leitos.filter(l => l.status === STATUS_LEITO.MANUTENCAO).length;
    const taxaOcupacao = totalLeitos > 0 ? Math.round((leitosOcupados / totalLeitos) * 100) : 0;

    // Internações ativas
    const internacoesAtivas = db.internacoes.filter(i => i.status === 'internado').length;

    // Alertas Farmácia (Estoque Baixo)
    const alertasFarmacia = db.medicamentos.filter(m => m.quantidade <= m.estoqueMinimo);

    // Alertas Almoxarifado (Estoque Baixo ou Zerado)
    const alertasAlmoxarifado = db.materiais.filter(m => m.quantidade <= m.estoqueMinimo);

    return {
      totalPacientes,
      atendimentosHoje,
      aguardandoTriagem,
      aguardandoMedico,
      manchesterFila,
      leitos: {
        total: totalLeitos,
        ocupados: leitosOcupados,
        livres: leitosLivres,
        manutencao: leitosManutencao,
        taxaOcupacao
      },
      internacoesAtivas,
      alertas: {
        farmaciaEstoqueBaixo: alertasFarmacia.length,
        almoxarifadoEstoqueBaixo: alertasAlmoxarifado.length,
        itensFarmaciaAlerta: alertasFarmacia.slice(0, 5),
        itensAlmoxarifadoAlerta: alertasAlmoxarifado.slice(0, 5)
      }
    };
  }
}

// Instância Singleton
const storage = new Storage();
module.exports = storage;
