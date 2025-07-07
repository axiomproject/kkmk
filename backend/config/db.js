const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
  connectionString: isProduction ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL,
  ssl: isProduction ? {
    require: true,
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
};

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Database connection established');
});

console.log('Database connection pool created');

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  connect: () => pool.connect(),
  query: (text, params) => pool.query(text, params),
  pool
};
