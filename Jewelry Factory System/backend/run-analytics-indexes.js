const fs = require('fs');
const path = require('path');
const { getPool } = require('./db');

async function runIndexes() {
  try {
    const pool = await getPool();
    const sqlPath = path.join(__dirname, 'sql', 'indexes-sales-analytics.sql');
    const indexSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by GO 
    const commands = indexSql.split(/^\s*GO\s*$/im);
    
    for (let cmd of commands) {
      if (cmd.trim()) {
        console.log('Executing command...');
        console.log(cmd.trim().substring(0, 50) + '...');
        await pool.request().query(cmd);
        console.log('Command executed successfully.\n');
      }
    }
    console.log('All indexes processed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to run indexes:', err);
    process.exit(1);
  }
}

runIndexes();
