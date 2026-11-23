const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const app = require('../backend/server');
const storage = require('../backend/db/storage');
const { seedDatabase } = require('../backend/db/seed');
const { validarCPF } = require('../backend/utils/cpfValidator');

const testResults = [];

function recordTest(name, passed, message = '') {
  testResults.push({ name, passed, message });
  const icon = passed ? '✅ PASSOU' : '❌ FALHOU';
  console.log(`${icon}: ${name} ${message ? `(${message})` : ''}`);
}

function callApp(options) {
  return new Promise((resolve) => {
    const socket = new EventEmitter();
    socket.encrypted = false;
    socket.remoteAddress = '127.0.0.1';

    const req = new http.IncomingMessage(socket);
    req.method = options.method || 'GET';
    req.url = options.url || '/';
    req.headers = Object.assign({
      'host': 'localhost',
      'content-type': 'application/json'
    }, options.headers || {});

    if (options.token) {
      req.headers['authorization'] = `Bearer ${options.token}`;
    }

    if (options.body) {
      req.body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      req.headers['content-length'] = Buffer.byteLength(JSON.stringify(req.body)).toString();
    }

    const res = new http.ServerResponse(req);
    let output = '';
    res.write = function(chunk) {
      if (chunk) output += chunk.toString();
      return true;
    };
    const originalEnd = res.end.bind(res);
    res.end = function(chunk) {
      if (chunk) output += chunk.toString();
      originalEnd();
      let parsed = output;
      try {
        parsed = JSON.parse(output);
      } catch (e) {}
      resolve({
        status: res.statusCode,
        headers: res.getHeaders ? res.getHeaders() : {},
        body: parsed,
        text: output
      });
    };

    app(req, res);
  });
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🧪 INICIANDO SUÍTE DE TESTES OBRIGATÓRIOS DO SISTEMA AMANDINHA');
  console.log('================================================================\n');

  // Inicializa banco de dados com estado limpo para testes idempotentes
  seedDatabase(true);
  storage.init();

  let adminToken = '';
  let medicoToken = '';
  let triagemToken = '';
  let atendimentoToken = '';

  try {
    // 1. INICIALIZAÇÃO DO SERVIDOR E ROTA DE HEALTHCHECK
    const health = await callApp({ method: 'GET', url: '/health' });
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'online');
    assert.ok(health.body.hospital.includes('Amandinha'));
    recordTest('1. Inicialização do servidor e rota de healthcheck', true);

    // 2. LOGIN E AUTENTICAÇÃO COM HASH SEGURO (PBKDF2)
    const loginFail = await callApp({
      method: 'POST',
      url: '/api/auth/login',
      body: { usuario: 'admin', senha: 'wrongpassword' }
    });
    assert.strictEqual(loginFail.status, 401, 'Deve rejeitar senha incorreta');

    const loginAdmin = await callApp({
      method: 'POST',
      url: '/api/auth/login',
      body: { usuario: 'admin', senha: 'admin123' }
    });
    assert.strictEqual(loginAdmin.status, 200);
    assert.ok(loginAdmin.body.token, 'Token JWT deve ser gerado');
    assert.strictEqual(loginAdmin.body.tipo, 'admin');
    adminToken = loginAdmin.body.token;

    // Login com senha legada compatível ('123')
    const loginMedico = await callApp({
      method: 'POST',
      url: '/api/auth/login',
      body: { usuario: 'medico', senha: '123' }
    });
    assert.strictEqual(loginMedico.status, 200);
    medicoToken = loginMedico.body.token;

    const loginTriagem = await callApp({
      method: 'POST',
      url: '/api/auth/login',
      body: { usuario: 'triagem', senha: '123' }
    });
    assert.strictEqual(loginTriagem.status, 200);
    triagemToken = loginTriagem.body.token;

    const loginAtendimento = await callApp({
      method: 'POST',
      url: '/api/auth/login',
      body: { usuario: 'atendimento', senha: '123' }
    });
    assert.strictEqual(loginAtendimento.status, 200);
    atendimentoToken = loginAtendimento.body.token;

    recordTest('2. Login com verificação de hash seguro e tokens JWT', true);

    // 3. CONTROLE DE ACESSO POR PERFIL (RBAC)
    const semToken = await callApp({ method: 'GET', url: '/api/auth/usuarios' });
    assert.strictEqual(semToken.status, 401, 'Deve rejeitar acesso sem token');

    const perfilMedicoTentandoAdmin = await callApp({
      method: 'GET',
      url: '/api/auth/usuarios',
      token: medicoToken
    });
    assert.strictEqual(perfilMedicoTentandoAdmin.status, 403, 'Médico não pode gerenciar usuários admin');

    const perfilAdminAcessando = await callApp({
      method: 'GET',
      url: '/api/auth/usuarios',
      token: adminToken
    });
    assert.strictEqual(perfilAdminAcessando.status, 200);
    assert.ok(perfilAdminAcessando.body.usuarios.length > 0);
    recordTest('3. Controle de acesso por perfil (RBAC)', true);

    // 4. VALIDAÇÃO DE CPF (Algoritmo Oficial da Receita Federal)
    const cpfInvalido = '111.111.111-11';
    assert.strictEqual(validarCPF(cpfInvalido), false);
    const respCpfInvalido = await callApp({
      method: 'POST',
      url: '/api/pacientes',
      body: { nome: 'Paciente Teste Inválido', cpf: cpfInvalido, tipo: 'Particular' },
      token: atendimentoToken
    });
    assert.strictEqual(respCpfInvalido.status, 400);
    recordTest('4. Validação de CPF (Rejeição de dígitos inválidos)', true);

    // 5. CADASTRO DE PACIENTE COM DADOS COMPLETOS
    const cpfValido = '529.982.247-25';
    assert.strictEqual(validarCPF(cpfValido), true);

    const novoPaciente = await callApp({
      method: 'POST',
      url: '/api/pacientes',
      body: {
        nome: 'Beatriz Vasconcelos',
        cpf: cpfValido,
        rg: '22.333.444-5',
        dataNascimento: '1995-07-20',
        sexo: 'Feminino',
        telefone: '(11) 98888-7777',
        email: 'beatriz.v@email.com',
        tipo: 'Particular',
        alergias: 'Dipirona'
      },
      token: atendimentoToken
    });

    assert.strictEqual(novoPaciente.status, 201);
    assert.ok(novoPaciente.body.id);
    assert.strictEqual(novoPaciente.body.status, 'triagem');
    const pacienteId = novoPaciente.body.id;
    recordTest('5. Cadastro de paciente com dados cadastrais completos', true);

    // 6. PREVENÇÃO DE DUPLICIDADE DE CPF
    const duplicado = await callApp({
      method: 'POST',
      url: '/api/pacientes',
      body: { nome: 'Outro Paciente com Mesmo CPF', cpf: cpfValido, tipo: 'SUS' },
      token: atendimentoToken
    });
    assert.strictEqual(duplicado.status, 400, 'Deve rejeitar CPF duplicado');
    assert.ok(duplicado.body.erro.includes('Já existe um paciente cadastrado'));
    recordTest('6. Prevenção de duplicidade de CPF', true);

    // 7. CRIAÇÃO DE TRIAGEM COM CLASSIFICAÇÃO MANCHESTER
    const triagemResp = await callApp({
      method: 'POST',
      url: '/api/triagem',
      body: {
        pacienteId: pacienteId,
        nome: 'Beatriz Vasconcelos',
        pressaoArterial: '130/85',
        frequenciaCardiaca: 88,
        frequenciaRespiratoria: 20,
        temperatura: 39.2, // Febre alta -> Laranja ou Amarelo
        saturacaoO2: 96,
        sintoma: 'febre_alta',
        queixaPrincipal: 'Febre de 39.2°C persistente há 24h associada a cefaleia',
        alergia: 'Dipirona'
      },
      token: triagemToken
    });

    assert.strictEqual(triagemResp.status, 201);
    assert.ok(triagemResp.body.id);
    const triagemId = triagemResp.body.id;
    assert.ok(['amarelo', 'laranja', 'vermelho'].includes(triagemResp.body.risco));
    recordTest('7. Criação de triagem e classificação de risco Manchester', true);

    // 8. ATUALIZAÇÃO E PERSISTÊNCIA DO STATUS DO PACIENTE
    const pacienteAtualizado = await callApp({ method: 'GET', url: `/api/pacientes/${pacienteId}` });
    assert.strictEqual(pacienteAtualizado.body.paciente.status, 'aguardando_medico', 'Status deve progredir para aguardando_medico');
    recordTest('8. Atualização e persistência do fluxo de status do paciente', true);

    // 9. ATENDIMENTO MÉDICO, PRESCRIÇÃO E CONDUTA
    const consultaResp = await callApp({
      method: 'POST',
      url: '/api/consultas',
      body: {
        pacienteId: pacienteId,
        paciente: 'Beatriz Vasconcelos',
        triagemId: triagemId,
        diagnostico: 'Gastroenterite Aguda com Desidratação Leve',
        cid10: 'A09',
        conduta: 'Hidratação venosa e prescrição de antiemético. Encaminhamento para internação para monitorização.',
        medicacao: 'Ondansetrona 8mg IV + Soro Fisiológico 500mL',
        decisaoClinica: 'internacao'
      },
      token: medicoToken
    });

    assert.strictEqual(consultaResp.status, 201);
    assert.ok(consultaResp.body.id);
    recordTest('9. Atendimento médico, diagnóstico e prescrição', true);

    // 10. GESTÃO DE LEITOS: VERIFICAÇÃO DE DISPONIBILIDADE
    const leitosResp = await callApp({ method: 'GET', url: '/api/leitos' });
    assert.strictEqual(leitosResp.status, 200);
    const leitoLivre = leitosResp.body.leitos.find(l => l.status === 'Livre' && l.setor.includes('Feminino'));
    assert.ok(leitoLivre, 'Deve haver leito livre disponível');
    const leitoId = leitoLivre.id;
    recordTest('10. Consulta de leitos livres e ocupados', true);

    // 11. INTERNAÇÃO COM PERSISTÊNCIA REAL NO BACKEND
    const internacaoResp = await callApp({
      method: 'POST',
      url: '/api/internacoes',
      body: {
        pacienteId: pacienteId,
        pacienteNome: 'Beatriz Vasconcelos',
        leitoId: leitoId,
        motivo: 'Hidratação venosa contínua e compensação de gastroenterite aguda',
        diagnostico: 'A09 - Gastroenterite Aguda',
        dieta: 'Pastosa branda'
      },
      token: medicoToken
    });

    assert.strictEqual(internacaoResp.status, 201);
    const internacaoId = internacaoResp.body.internacao.id;
    recordTest('11. Cadastro de internação hospitalar persistida no backend', true);

    // 12. BLOQUEIO DE LEITO OCUPADO (PREVENÇÃO DE DUPLA OCUPAÇÃO)
    const tentativaConflito = await callApp({
      method: 'POST',
      url: '/api/internacoes',
      body: {
        pacienteId: 999999,
        pacienteNome: 'Outro Paciente',
        leitoId: leitoId, // Mesmo leito que acabou de ser ocupado!
        motivo: 'Tentativa de ocupar leito já alocado'
      },
      token: medicoToken
    });

    assert.strictEqual(tentativaConflito.status, 400, 'Deve rejeitar ocupação de leito já ocupado');
    assert.ok(tentativaConflito.body.erro.includes('já está ocupado'), 'Erro deve detalhar conflito');
    recordTest('12. Bloqueio no backend de alocação de leito já ocupado', true);

    // 13. ALTA HOSPITALAR E LIBERAÇÃO AUTOMÁTICA DO LEITO
    const altaResp = await callApp({
      method: 'POST',
      url: '/api/altas',
      body: {
        pacienteId: pacienteId,
        pacienteNome: 'Beatriz Vasconcelos',
        internacaoId: internacaoId,
        tipoAlta: 'Curado/Melhorado',
        resumoAtendimento: 'Paciente evoluiu afebril, hidratada e com tolerância oral restabelecida.',
        orientacoes: 'Repouso, hidratação oral abundante (2L/dia) e retorno se febre.',
        prescricaoDomiciliar: 'Paracetamol 500mg VO de 6/6h se dor ou febre.'
      },
      token: medicoToken
    });

    assert.strictEqual(altaResp.status, 201);
    const leitoAposAlta = await callApp({ method: 'GET', url: `/api/leitos/${leitoId}` });
    assert.strictEqual(leitoAposAlta.body.leito.status, 'Livre', 'Leito deve ser automaticamente liberado');
    assert.strictEqual(leitoAposAlta.body.leito.pacienteId, null, 'ID do paciente no leito deve ser nulo');
    recordTest('13. Alta hospitalar e liberação automática do leito no banco', true);

    // 14. FARMÁCIA: MOVIMENTAÇÃO DE ESTOQUE E DISPENSAÇÃO
    const medicamentos = await callApp({ method: 'GET', url: '/api/farmacia/medicamentos' });
    assert.strictEqual(medicamentos.status, 200);
    const medDipirona = medicamentos.body.medicamentos.find(m => m.nome.includes('Dipirona'));
    assert.ok(medDipirona);
    const qtdInicial = medDipirona.quantidade;

    const dispensacao = await callApp({
      method: 'POST',
      url: '/api/farmacia/dispensar',
      body: {
        medicamentoId: medDipirona.id,
        quantidade: 5,
        pacienteNome: 'Beatriz Vasconcelos',
        pacienteId: pacienteId
      },
      token: adminToken
    });
    assert.strictEqual(dispensacao.status, 200);
    assert.strictEqual(dispensacao.body.medicamento.quantidade, qtdInicial - 5);

    const saldoInsuficiente = await callApp({
      method: 'POST',
      url: '/api/farmacia/dispensar',
      body: {
        medicamentoId: medDipirona.id,
        quantidade: 999999,
        pacienteNome: 'Paciente'
      },
      token: adminToken
    });
    assert.strictEqual(saldoInsuficiente.status, 400, 'Deve bloquear estoque negativo');
    recordTest('14. Farmácia: controle de estoque, dispensação e bloqueio de saldo negativo', true);

    // 15. ALMOXARIFADO: ENTRADA, SAÍDA E HISTÓRICO
    const materiais = await callApp({ method: 'GET', url: '/api/almoxarifado/materiais' });
    assert.strictEqual(materiais.status, 200);
    const luva = materiais.body.materiais.find(m => m.nome.includes('Luvas'));
    assert.ok(luva);
    const qtdLuvaInicial = luva.quantidade;

    const saidaAlmox = await callApp({
      method: 'POST',
      url: '/api/almoxarifado/movimentacoes',
      body: {
        materialId: luva.id,
        tipo: 'saida',
        quantidade: 5,
        setorDestino: 'UTI Geral',
        motivo: 'Reposição semanal de EPI'
      },
      token: adminToken
    });
    assert.strictEqual(saidaAlmox.status, 200);
    assert.strictEqual(saidaAlmox.body.material.quantidade, qtdLuvaInicial - 5);

    const statsAlmox = await callApp({ method: 'GET', url: '/api/almoxarifado/stats' });
    assert.strictEqual(statsAlmox.status, 200);
    assert.ok(statsAlmox.body.total > 0);
    recordTest('15. Almoxarifado: requisição setorial, atualização de estoque e estatísticas', true);

    // 16. PAINEL DE TV: CHAMADA E HISTÓRICO EM TEMPO REAL
    const chamadaTv = await callApp({
      method: 'POST',
      url: '/api/tv/chamar',
      body: {
        localTipo: 'CONSULTÓRIO',
        localNumero: '03',
        paciente: 'Beatriz Vasconcelos',
        senha: 'P-01'
      },
      token: medicoToken
    });
    assert.strictEqual(chamadaTv.status, 200);

    const painelTv = await callApp({ method: 'GET', url: '/api/tv/chamada' });
    assert.strictEqual(painelTv.status, 200);
    assert.strictEqual(painelTv.body.chamada.paciente, 'Beatriz Vasconcelos');
    assert.strictEqual(painelTv.body.chamada.localNumero, '03');
    recordTest('16. Painel de TV: emissão de chamada e consulta em tempo real', true);

    // 17. DASHBOARD ADMINISTRATIVO COM DADOS REAIS
    const dashboard = await callApp({ method: 'GET', url: '/api/dashboard/metricas', token: adminToken });
    assert.strictEqual(dashboard.status, 200);
    assert.ok(dashboard.body.totalPacientes > 0);
    assert.ok(dashboard.body.leitos.total > 0);
    recordTest('17. Dashboard Administrativo com métricas reais agregadas', true);

    // 18. TESTE DE ROTAS ESTÁTICAS E PÁGINAS DO FRONTEND (INCLUINDO ALIAS DE ACENTO)
    const pages = [
      'index.html',
      'dashboard.html',
      'atendimento.html',
      'triagem.html',
      'medico.html',
      'internacao.html',
      'internaçao.html',
      'alta.html',
      'medicacoes.html',
      'almoxarifado.html',
      'tv.html'
    ];

    for (const page of pages) {
      const resp = await callApp({ method: 'GET', url: `/${encodeURI(page)}` });
      assert.strictEqual(resp.status, 200, `Página ${page} deve responder com status 200`);
    }
    recordTest('18. Entrega e navegação entre todas as páginas HTML do frontend', true);

    // 19. TRILHA DE AUDITORIA
    const auditResp = await callApp({ method: 'GET', url: '/api/auditoria/logs?limit=50', token: adminToken });
    assert.strictEqual(auditResp.status, 200);
    assert.ok(auditResp.body.logs.length > 0, 'Deve conter registros de auditoria gerados pelos testes');
    recordTest('19. Trilha de auditoria das operações clínicas gravadas', true);

  } catch (err) {
    console.error('ERRO NO TESTE:', err);
    recordTest('Erro fatal de execução', false, err.message);
  }

  console.log('\n================================================================');
  console.log('📊 RESUMO DA EXECUÇÃO DOS TESTES:');
  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;
  console.log(`Total: ${totalCount} | Passaram: ${passedCount} | Falharam: ${totalCount - passedCount}`);
  console.log('================================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
