const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('./db');
const bcrypt = require('bcryptjs');

async function runMigration() {
  try {
    const pool = await getPool();
    const migrationSql = fs.readFileSync(path.join(__dirname, 'sql', 'migrations', '01_create_users_table.sql'), 'utf8');
    
    // Split by GO if needed, mssql doesn't support GO natively in query
    const commands = migrationSql.split(/^\s*GO\s*$/im);
    
    for (let cmd of commands) {
      if (cmd.trim()) {
        await pool.request().query(cmd);
      }
    }
    console.log('Migration executed successfully.');

    // Seed default admin and sales if not exist
    const adminExists = await pool.request().query("SELECT * FROM system_users WHERE username = 'ADMIN'");
    if (adminExists.recordset.length === 0) {
      const adminPwd = await bcrypt.hash(process.env.APP_ADMIN_PASSWORD || 'admin', 10);
      await pool.request()
        .input('username', sql.NVarChar, 'ADMIN')
        .input('pwd', sql.NVarChar, adminPwd)
        .input('name', sql.NVarChar, 'System Admin')
        .input('dept', sql.NVarChar, 'IT')
        .input('role', sql.NVarChar, 'admin')
        .query('INSERT INTO system_users (username, password_hash, full_name, department, role) VALUES (@username, @pwd, @name, @dept, @role)');
      console.log('Seeded ADMIN user.');
    }

    const salesExists = await pool.request().query("SELECT * FROM system_users WHERE username = 'SALES'");
    if (salesExists.recordset.length === 0) {
      const salesPwd = await bcrypt.hash(process.env.APP_SALES_PASSWORD || 'sales', 10);
      await pool.request()
        .input('username', sql.NVarChar, 'SALES')
        .input('pwd', sql.NVarChar, salesPwd)
        .input('name', sql.NVarChar, 'Sales Team')
        .input('dept', sql.NVarChar, 'Sales')
        .input('role', sql.NVarChar, 'sales')
        .query('INSERT INTO system_users (username, password_hash, full_name, department, role) VALUES (@username, @pwd, @name, @dept, @role)');
      console.log('Seeded SALES user.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
