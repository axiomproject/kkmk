const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = isProduction ? process.env.PROD_DATABASE_URL : process.env.DATABASE_URL;

console.log('Database environment:', process.env.NODE_ENV);
console.log('Using connection string:', connectionString ? 'Connection string exists' : 'No connection string');

const connectionConfig = {
  connectionString,
  ssl: isProduction ? {
    require: true,
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(connectionConfig);

pool.on('connect', () => {
  console.log('Database connection established');
});

console.log('Database connection pool created');

// Add error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

module.exports = {
  connect: async () => {
    try {
      const client = await pool.connect();
      console.log('Database connected successfully');
      return client;
    } catch (err) {
      console.error('Database connection error:', err);
      throw err;
    }
  },
  query: (text, params) => pool.query(text, params),
  pool
};
