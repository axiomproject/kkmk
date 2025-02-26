const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'kkmk_db',
  host: process.env.DB_HOST || 'dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com',
  database: process.env.DB_NAME || 'kkmk',
  password: process.env.DB_PASSWORD || 'c3dv1H1UcmugVinLWsxd1J4ozszIyK3C',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
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
