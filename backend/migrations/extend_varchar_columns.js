/**
 * Migration to increase VARCHAR column lengths in the database
 */
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log('Starting migration to extend VARCHAR column lengths');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Begin transaction
      await client.query('BEGIN');
      
      console.log('Altering columns in users table...');
      
      // Alter users table columns
      const userColumns = [
        { name: 'status', type: 'VARCHAR(20)' },
        { name: 'role', type: 'VARCHAR(20)' },
        { name: 'gender', type: 'VARCHAR(20)' }
      ];
      
      for (const col of userColumns) {
        console.log(`Altering ${col.name} to ${col.type}...`);
        await client.query(`ALTER TABLE users ALTER COLUMN ${col.name} TYPE ${col.type}`);
      }
      
      console.log('Altering columns in scholars table...');
      
      // Alter scholars table columns
      const scholarColumns = [
        { name: 'status', type: 'VARCHAR(20)' },
        { name: 'gender', type: 'VARCHAR(20)' }
      ];
      
      for (const col of scholarColumns) {
        console.log(`Altering ${col.name} to ${col.type}...`);
        await client.query(`ALTER TABLE scholars ALTER COLUMN ${col.name} TYPE ${col.type}`);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Migration completed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed, rolling back:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  run();
} else {
  module.exports = { run };
}
