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
  } : false,
  // Add connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close and replace a connection after it has been used 7500 times
});

// Log connection attempts
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Don't exit the process, just log the error
  if (!err.client) {
    console.error('Client disconnected unexpectedly');
  }
});

// Wrapper for database queries with better error handling and connection management
const query = async (text, params) => {
  let client;
  try {
    client = await pool.connect();
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
    if (client) {
      client.release(true); // Release with error parameter to ensure proper cleanup
    }
  }
};

// Test database connection with retry mechanism
const testConnection = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection test successful');
      return true;
    } catch (err) {
      console.error(`Database connection test failed (attempt ${i + 1}/${retries}):`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
};

module.exports = {
  query,
  pool,
  testConnection,
  connect: () => pool.connect()
};
