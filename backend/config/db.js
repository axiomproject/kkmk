const { Pool } = require('pg');
require('dotenv').config();

// Get database configuration from environment variables
const isProduction = process.env.NODE_ENV === 'production';

// Create connection configuration with proper SSL handling for production
const connectionConfig = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'test',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'kkmk',
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
};

// Log configuration (without sensitive data)
console.log('Database connection config:', {
  host: connectionConfig.host,
  port: connectionConfig.port,
  database: connectionConfig.database,
  ssl: !!connectionConfig.ssl,
  environment: process.env.NODE_ENV || 'development'
});

// Create pool
const pool = new Pool(connectionConfig);

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Export the pool directly
module.exports = pool;
