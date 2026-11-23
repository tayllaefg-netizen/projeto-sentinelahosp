const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeBody } = require('./middleware/validator');

// Rotas Modulares
const authRoutes = require('./routes/auth.routes');
const pacientesRoutes = require('./routes/pacientes.routes');
const triagemRoutes = require('./routes/triagem.routes');
const consultasRoutes = require('./routes/consultas.routes');
const leitosRoutes = require('./routes/leitos.routes');
const internacoesRoutes = require('./routes/internacoes.routes');
const altasRoutes = require('./routes/altas.routes');
const farmaciaRoutes = require('./routes/farmacia.routes');
const almoxarifadoRoutes = require('./routes/almoxarifado.routes');
const tvRoutes = require('./routes/tv.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');

const app = express();

// =========================================================================
// MIDDLEWARES DE SEGURANÇA E PARSING
// =========================================================================

// Configuração robusta de CORS
app.use(cors({
  origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Headers de segurança HTTP
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody);

// =========================================================================
// ROTA DE SAÚDE / HEALTHCHECK
// =========================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    hospital: config.HOSPITAL_NAME,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version
  });
});

// =========================================================================
// COMPATIBILIDADE DE ROTAS E REDIRECIONAMENTOS DE ARQUIVOS
// Trata o caractere especial 'ç' de 'internaçao.html'
// =========================================================================
const frontendDir = path.resolve(__dirname, '../frontend');

app.get(['/interna%C3%A7ao.html', '/interna%C3%A7%C3%A3o.html', '/interna\u00e7ao.html', '/internaçao.html'], (req, res) => {
  res.sendFile('internacao.html', { root: frontendDir });
});

// =========================================================================
// ARQUIVOS ESTÁTICOS DO FRONTEND
// =========================================================================
app.use(express.static(frontendDir));

// =========================================================================
// ROTAS DA API MODULAR (PREFIXO /api)
// =========================================================================
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/triagem', triagemRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/leitos', leitosRoutes);
app.use('/api/internacoes', internacoesRoutes);
app.use('/api/altas', altasRoutes);
app.use('/api/farmacia', farmaciaRoutes);
app.use('/api/almoxarifado', almoxarifadoRoutes);
app.use('/api/tv', tvRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// =========================================================================
// ROTAS LEGADAS (COMPATIBILIDADE 100% COM A VERSÃO ANTERIOR)
// Permite que chamadas antigas sem o prefixo /api continuem funcionando perfeitamente
// =========================================================================
app.use('/login', authRoutes);
app.use('/atendimento', pacientesRoutes);
app.use('/pacientes', pacientesRoutes);
app.use('/triagem', triagemRoutes);
app.use('/triagens', triagemRoutes);
app.use('/consulta', consultasRoutes);
app.use('/consultas', consultasRoutes);
app.use('/medicacoes', (req, res, next) => {
  // Se for POST ou rota de consulta, delega a consultas, senão delega a consultas
  consultasRoutes(req, res, next);
});
app.use('/lista-medicacoes', (req, res, next) => {
  consultasRoutes(req, res, next);
});
app.use('/tv', tvRoutes);
app.use('/internacoes', internacoesRoutes);
app.use('/leitos', leitosRoutes);
app.use('/altas', altasRoutes);

// Fallback amigável para páginas HTML da SPA / MPA
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Tratamento de erro 404 para rotas de API não mapeadas
app.use('/api', (req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: `Rota de API '${req.method} ${req.originalUrl}' não encontrada.`
  });
});

// Middleware Central de Erros
app.use(errorHandler);

// Inicialização do servidor se executado diretamente
if (require.main === module) {
  const PORT = config.PORT;
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏥 ${config.HOSPITAL_NAME}`);
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`🔒 Modo seguro ativo | Banco de dados: JSON Transacional`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
