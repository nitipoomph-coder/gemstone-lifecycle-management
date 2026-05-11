const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  requestTimeout:    300000, // 300s (5 minutes) — allow long processing for large datasets
  connectionTimeout: 15000,  // 15s connect timeout
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 20,              // รองรับ concurrent users มากขึ้น (เดิม 10)
    min: 2,               // keep 2 connections warm เสมอ
    idleTimeoutMillis: 60000,  // 1 นาที
    acquireTimeoutMillis: 30000, // รอ connection ได้สูงสุด 30s
  },
};

let pool;

async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log('Connected to SQL Server:', process.env.DB_HOST);

      pool.on('error', err => {
        console.error('SQL Pool Error:', err);
        pool = null; // เคลียร์ทิ้งเพื่อให้ if (!pool) ทำงานใหม่ในรอบหน้า
      });
    }
    return pool; // <--- ย้ายออกมาไว้ข้างนอกเพื่อให้ return ทุกครั้งที่เรียก
  } catch (err) {
    console.error('Database Connection Failed:', err);
    pool = null;
    throw err; // โยน error กลับไปให้ route จัดการส่ง 500
  }
}
module.exports = { getPool, sql };
