const config = require('../config/env');

/**
 * Adaptador de Banco de Dados PostgreSQL
 * Ativado quando DB_CLIENT=postgres e DATABASE_URL estiver configurada.
 */

let pool = null;

function isPostgresConfigured() {
  return config.DB_CLIENT === 'postgres' && Boolean(config.DATABASE_URL);
}

function getPostgresPool() {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (!pool) {
    try {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: config.DATABASE_URL,
        ssl: config.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      pool.on('error', (err) => {
        console.error('Erro inesperado no pool do PostgreSQL:', err.message);
      });

      console.log('🐘 Pool de conexões PostgreSQL inicializado com sucesso.');
    } catch (err) {
      console.warn('⚠️ Módulo "pg" não instalado ou erro ao conectar PostgreSQL. O sistema utilizará o repositório JSON transacional.');
      return null;
    }
  }

  return pool;
}

async function query(text, params) {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL não configurado ou driver "pg" indisponível.');
  }
  const start = Date.now();
  const res = await p.query(text, params);
  const duration = Date.now() - start;
  if (config.NODE_ENV === 'development') {
    console.log(`[SQL] Executado em ${duration}ms:`, text.substring(0, 80));
  }
  return res;
}

module.exports = {
  isPostgresConfigured,
  getPostgresPool,
  query
};
