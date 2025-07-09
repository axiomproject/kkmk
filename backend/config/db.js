const { Pool } = require('pg');
require('dotenv').config();

// Validate database URL
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Log connection attempts
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Wrapper for database queries with better error handling
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error:', {
      error: err.message,
      query: text,
      params
    });
    throw err;
  } finally {
    client.release();
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('Database connection test successful');
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err.message);
    return false;
  }
};

module.exports = {
  query,
  pool,
  testConnection,
  connect: () => pool.connect()
};
