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

const pool = new Pool({
  connectionString,
  ssl: isProduction ? {
    rejectUnauthorized: false
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('Database connection established');
});

console.log('Database connection pool created');

// Enhanced error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test the connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

module.exports = {
  connect: () => pool.connect(),
  query: (text, params) => pool.query(text, params),
  testConnection,
  pool
};
