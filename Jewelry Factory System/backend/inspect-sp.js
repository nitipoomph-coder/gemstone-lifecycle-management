/**
 * inspect-sp.js
 * ตรวจสอบ Stored Procedures ที่ใช้ใน OrdTrack และทดสอบ Finish/CloseStatus
 */
const sql = require('mssql');
const fs  = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  server:   process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME,
  requestTimeout: 60000,
  options: { encrypt: false, trustServerCertificate: true }
};

const LOG_FILE = path.join(__dirname, 'sp-inspect-log.txt');
const lines = [];
function log(...args) {
  const msg = args.join(' ');
  console.log(msg);
  lines.push(msg);
}

async function run() {
  log('='.repeat(60));
  log('SP INSPECTION LOG -', new Date().toLocaleString('th-TH'));
  log('='.repeat(60));

  await sql.connect(config);
  log('Connected to:', process.env.DB_HOST, '/', process.env.DB_NAME);

  // 1) รายชื่อ SP ทั้งหมดที่เกี่ยวกับ OrdTrack
  log('\n--- [1] Stored Procedures (OrdTrack / PC_Show) ---');
  const spList = await sql.query(`
    SELECT ROUTINE_NAME, ROUTINE_TYPE
    FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_NAME LIKE '%OrdTrack%' OR ROUTINE_NAME LIKE '%PC_Show%'
    ORDER BY ROUTINE_NAME
  `);
  if (spList.recordset.length === 0) {
    log('  ไม่พบ SP ที่มีชื่อ OrdTrack หรือ PC_Show');
  } else {
    spList.recordset.forEach(r => log(`  - ${r.ROUTINE_NAME} (${r.ROUTINE_TYPE})`));
  }

  // 2) ดู definition ของ SP หลัก (PC_Show_OrdTrack_Sum_DueDate)
  const mainSP = 'PC_Show_OrdTrack_Sum_DueDate';
  log(`\n--- [2] Definition ของ ${mainSP} ---`);
  try {
    const def = await sql.query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('${mainSP}')) AS def
    `);
    const defText = def.recordset[0]?.def;
    if (defText) {
      // แสดงแค่ส่วน WHERE / CloseStatus เพื่อตรวจ filter
      log(defText.substring(0, 3000));
    } else {
      log('  ไม่สามารถดู definition ได้ (อาจไม่มีสิทธิ์ หรือชื่อไม่ตรง)');
    }
  } catch(e) {
    log('  Error:', e.message);
  }

  // 3) นับ orders ทั้งหมด + แบ่งตาม CloseStatus / OrdStatus
  log('\n--- [3] สถานะ Orders ใน OrdHD ---');
  try {
    const stats = await sql.query(`
      SELECT 
        CloseStatus,
        OrdStatus,
        COUNT(*) AS Total
      FROM OrdHD
      GROUP BY CloseStatus, OrdStatus
      ORDER BY CloseStatus, OrdStatus
    `);
    stats.recordset.forEach(r =>
      log(`  CloseStatus='${r.CloseStatus ?? 'NULL'}' | OrdStatus='${r.OrdStatus ?? 'NULL'}' => ${r.Total} records`)
    );
  } catch(e) {
    log('  Error:', e.message);
  }

  // 4) ทดสอบ SP หลัก ช่วงวันกว้าง (ดูว่ามี Finished ออกมาไหม)
  log('\n--- [4] ทดสอบ SP: PC_Show_OrdTrack_Sum_DueDate (1 ปีย้อนหลัง) ---');
  try {
    const fromDate = new Date(); fromDate.setFullYear(fromDate.getFullYear() - 1);
    const toDate   = new Date(); toDate.setMonth(toDate.getMonth() + 3);
    const req = (new sql.Request());
    req.input('FromDate', sql.DateTime, fromDate);
    req.input('ToDate',   sql.DateTime, toDate);
    const result = await req.execute('dbo.PC_Show_OrdTrack_Sum_DueDate');
    const rows = result.recordset;
    log(`  ได้ ${rows.length} rows`);
    if (rows.length > 0) {
      // แสดง columns
      log('  Columns:', Object.keys(rows[0]).join(', '));
      // นับตาม CloseStatus
      const closeMap = {};
      rows.forEach(r => {
        const k = `CloseStatus='${r.CloseStatus ?? 'NULL'}'`;
        closeMap[k] = (closeMap[k] || 0) + 1;
      });
      Object.entries(closeMap).forEach(([k,v]) => log(`    ${k} => ${v} rows`));
    }
  } catch(e) {
    log('  Error:', e.message);
  }

  // 5) ทดสอบ SP: PC_Show_OrdTrack_Sum_All
  log('\n--- [5] ทดสอบ SP: PC_Show_OrdTrack_Sum_All (1 ปีย้อนหลัง) ---');
  try {
    const fromDate = new Date(); fromDate.setFullYear(fromDate.getFullYear() - 1);
    const toDate   = new Date(); toDate.setMonth(toDate.getMonth() + 3);
    const req = (new sql.Request());
    req.input('FromDate', sql.DateTime, fromDate);
    req.input('ToDate',   sql.DateTime, toDate);
    const result = await req.execute('dbo.PC_Show_OrdTrack_Sum_All');
    const rows = result.recordset;
    log(`  ได้ ${rows.length} rows`);
    if (rows.length > 0) {
      const closeMap = {};
      rows.forEach(r => {
        const k = `CloseStatus='${r.CloseStatus ?? 'NULL'}'`;
        closeMap[k] = (closeMap[k] || 0) + 1;
      });
      Object.entries(closeMap).forEach(([k,v]) => log(`    ${k} => ${v} rows`));
    }
  } catch(e) {
    log('  Error:', e.message);
  }

  // 6) ตรวจ columns ที่ SP ส่งคืน (sample 1 row)
  log('\n--- [6] ตัวอย่าง 1 row จาก SP หลัก ---');
  try {
    const fromDate = new Date(); fromDate.setMonth(fromDate.getMonth() - 3);
    const toDate   = new Date();
    const req = (new sql.Request());
    req.input('FromDate', sql.DateTime, fromDate);
    req.input('ToDate',   sql.DateTime, toDate);
    const result = await req.execute('dbo.PC_Show_OrdTrack_Sum_DueDate');
    if (result.recordset.length > 0) {
      const sample = result.recordset[0];
      log('  Fields:');
      Object.entries(sample).forEach(([k,v]) => {
        if (k !== 'ItemPhoto') log(`    ${k}: ${v}`);
      });
    }
  } catch(e) {
    log('  Error:', e.message);
  }

  // บันทึก log ลงไฟล์
  fs.writeFileSync(LOG_FILE, lines.join('\n'), 'utf8');
  log(`\n✅ Log บันทึกแล้วที่: ${LOG_FILE}`);

  process.exit(0);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
