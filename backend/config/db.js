const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = isProduction 
  ? process.env.PROD_DATABASE_URL 
  : process.env.DATABASE_URL;

// Debug log
console.log('Database Config:', {
  environment: process.env.NODE_ENV,
  hasConnectionString: !!connectionString,
  connectionStringStart: connectionString ? connectionString.substring(0, 20) + '...' : 'none'
});

const connectionConfig = {
  connectionString,
  ssl: {
    require: true,
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Database connection established');
});

console.log('Database connection pool created');

// Enhanced error handling
pool.on('error', (err) => {
  console.error('Postgres Pool Error:', err);
  if (err.code === 'ENOTFOUND') {
    console.error('DNS lookup failed. Check your database host configuration.');
  }
});

module.exports = {
  connect: async () => {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to database');
      return client;
    } catch (err) {
      console.error('Database Connection Error Details:', {
        error: err.message,
        code: err.code,
        stack: err.stack,
        connectionString: connectionString ? 'exists' : 'missing'
      });
      throw err;
    }
  },
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('Query Error:', err);
      throw err;
    }
  },
  pool
};
