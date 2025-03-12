const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Check if the report_card_history table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'report_card_history'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating report_card_history table...');
      
      // Read and execute the migration file
      const migrationPath = path.join(__dirname, '..', 'migrations', 'create_report_card_history_table.sql');
      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query(migration);
      console.log('Migration completed successfully.');
    } else {
      console.log('report_card_history table already exists.');
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error running migration:', error);
  } finally {
    client.release();
  }
}

runMigration().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
