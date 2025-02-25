const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    // Read and execute schema.sql
    const schema = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'schema.sql'),
      'utf8'
    );
    
    await db.none(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase();
