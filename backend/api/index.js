// Ponto de entrada Serverless da Vercel
// Conecta a função serverless diretamente ao aplicativo Express unificado
const app = require('../backend/server');
module.exports = app;
