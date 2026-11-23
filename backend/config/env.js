const fs = require('fs');
const path = require('path');

// Carrega .env do diretório raiz se existir
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        // Remove aspas se houver
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.warn('Aviso: falha ao processar .env:', err.message);
  }
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'amandinha-super-secret-hospital-key-change-in-prod-2026',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  DB_CLIENT: process.env.DB_CLIENT || 'json', // 'json' ou 'postgres'
  DATABASE_URL: process.env.DATABASE_URL || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  HOSPITAL_NAME: 'Amandinha — Sistema de Gestão Hospitalar',
  TV_CALL_TIMEOUT_SEC: 15
};

module.exports = config;
