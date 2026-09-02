const sql = require('mssql');

async function testConnection(host, user, pass, db) {
  console.log(`Testing connection to ${host}...`);
  try {
    const pool = await sql.connect({
      user: user,
      password: pass,
      server: host,
      port: 1433,
      database: db,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      }
    });
    console.log(`✅ Connection to ${host} successful!`);
    pool.close();
  } catch (err) {
    console.log(`❌ Connection to ${host} failed:`, err.message);
  }
}

async function run() {
  await testConnection('192.168.5.40', 'sa', 'Expman1#', 'dbGeneration');
  await testConnection('CLLDBS', 'sa', 'clldbs@896698', 'dbGeneration');
}

run();
