const { getPool } = require('./db');

async function check() {
  try {
    const pool = await getPool();
    
    // Check old system logic exactly as user stated
    const result1 = await pool.request().query(`
      SELECT SUM(ISNULL(HD.SumOrdExchAmnt, 0)) AS TotalHeader
      FROM dbo.OrdHD AS HD WITH (NOLOCK)
      LEFT JOIN dbo.GMCust AS CUST WITH (NOLOCK) ON HD.CustCode = CUST.CustCode
      WHERE YEAR(HD.OrdDate) = 2025
      AND (ISNULL(HD.OrdStatus, N'') <> 'C') 
      AND (ISNULL(CUST.CustStatus, N'Y') = 'Y')
      AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD'))
      AND (LTRIM(RTRIM(ISNULL(HD.PONo, ''))) NOT IN ('', 'TOP', 'Test', 'Testing', 'Stock', 'STOCK'))
    `);
    console.log('Total from OrdHD with NOT IN (old system logic?):', result1.recordset[0].TotalHeader);

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
check();
