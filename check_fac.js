const sql = require('mssql');
require('dotenv').config({ path: 'Jewelry Factory System/backend/.env' });
(async () => {
  const pool = await sql.connect({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
  });
  
  // Check if OrdHD or OrdDT has ProFac or Facility
  const colsHD = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdHD' AND COLUMN_NAME LIKE '%fac%'");
  console.log('OrdHD Fac cols:', colsHD.recordset);
  
  // Check how OrdNo relates to FBE vs CLL
  // In the legacy system, how does an order belong to CLL vs FBE?
  // Let's check ProFac in OrdHD or ProFac in OrdDT or PLSenHD
  const fbeCount = await pool.request().query("SELECT COUNT(DISTINCT OrdNo) AS fbeOrds FROM PLSenHD WHERE ProFac = 'FBE'");
  const cllCount = await pool.request().query("SELECT COUNT(DISTINCT OrdNo) AS cllOrds FROM PLSenHD WHERE ProFac = 'CLL'");
  console.log('Distinct OrdNos in PLSenHD - FBE:', fbeCount.recordset[0].fbeOrds, 'CLL:', cllCount.recordset[0].cllOrds);

  // Check if OrdHD has any facility column
  const allHdCols = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OrdHD'");
  console.log('OrdHD cols:', allHdCols.recordset.map(r => r.COLUMN_NAME).join(', '));

  await pool.close();
})();
