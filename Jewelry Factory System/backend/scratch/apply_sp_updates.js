const fs = require('fs');
const path = require('path');
const { getPool } = require('../db');

const filesToDeploy = [
  'sp_new OrdDate.txt',
  'sp_new Cust.txt',
  'sp_new Due.txt',
  'sp_new FIn.txt'
];

async function deploy() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = await getPool();
    console.log('Database connected successfully!');

    for (const fileName of filesToDeploy) {
      const filePath = path.join(__dirname, '..', 'routes', fileName);
      console.log(`\nReading file: ${fileName}...`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Split into batches by 'GO' on a line by itself
      const lines = fileContent.split(/\r?\n/);
      let currentBatch = [];
      const batches = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.toUpperCase() === 'GO') {
          if (currentBatch.length > 0) {
            batches.push(currentBatch.join('\n'));
            currentBatch = [];
          }
        } else {
          // Skip USE dbGeneration statement as mssql driver handles it from config
          if (!trimmed.toUpperCase().startsWith('USE ')) {
            currentBatch.push(line);
          }
        }
      }
      if (currentBatch.length > 0) {
        batches.push(currentBatch.join('\n'));
      }

      console.log(`Split into ${batches.length} batches.`);

      // Execute batches sequentially
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i].trim();
        if (!batch) continue;

        console.log(`Executing batch ${i + 1}/${batches.length}...`);
        try {
          await pool.request().batch(batch);
          console.log(`Batch ${i + 1} succeeded.`);
        } catch (err) {
          console.error(`Error in batch ${i + 1}:`, err.message);
          console.error('Batch SQL snippet:\n', batch.substring(0, 300));
          throw err;
        }
      }
      console.log(`Successfully deployed Stored Procedure: ${fileName}`);
    }

    console.log('\nAll Stored Procedures deployed successfully!');
  } catch (err) {
    console.error('\nDeployment failed:', err);
  } finally {
    if (pool) {
      // Close database connection
      await pool.close();
      console.log('Database pool closed.');
    }
  }
}

deploy();
