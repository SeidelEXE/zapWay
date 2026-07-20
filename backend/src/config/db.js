const { Pool } = require('pg');
const { env, assertDatabasePassword } = require('./env');

assertDatabasePassword();

const poolConfig = env.database.url
  ? { connectionString: env.database.url }
  : {
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
    };

const pool = new Pool({
  ...poolConfig,
  max: env.database.poolMax,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('Erro inesperado no pool PostgreSQL:', error);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function checkConnection() {
  await pool.query('SELECT 1 AS ok');
  return true;
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, checkConnection, close };
