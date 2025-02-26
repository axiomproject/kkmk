const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create connection pool using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Log connection parameters (excluding password)
console.log('Database connection parameters:', {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.NODE_ENV === 'production'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // Add 'any' function to mimic pg-promise functionality
  any: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows || [];
  },
  
  // Add 'one' function to mimic pg-promise functionality
  one: async (text, params) => {
    const result = await pool.query(text, params);
    if (result.rows.length === 0) {
      throw new Error('No data returned from the query.');
    }
    return result.rows[0];
  },
  
  // Add 'none' function to mimic pg-promise functionality
  none: async (text, params) => {
    await pool.query(text, params);
    return null;
  },
  
  connect: async () => {
    // Get a client from the pool
    const client = await pool.connect();
    
    // Add done method to client for backward compatibility
    const clientWithDone = {
      ...client,
      done: () => client.release()
    };
    
    return clientWithDone;
  },
  
  // Expose pool for direct access if needed
  pool: pool
};
