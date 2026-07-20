const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  database: {
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || '192.168.0.105',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
    poolMax: Number(process.env.DB_POOL_MAX || 10),
  },
};

function assertDatabasePassword() {
  if (!env.database.url && !env.database.password) required('DB_PASSWORD');
}

module.exports = { env, assertDatabasePassword };
