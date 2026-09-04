const { getPool } = require('./db');

async function check() {
  try {
    const pool = await getPool();
    
    const result1 = await pool.request().query(`
      SELECT SUM(ISNULL(HD.SumOrdExchAmnt, 0)) AS TotalHeader
      FROM dbo.OrdHD AS HD WITH (NOLOCK)
      LEFT JOIN dbo.GMCust AS CUST WITH (NOLOCK) ON HD.CustCode = CUST.CustCode
      WHERE YEAR(HD.OrdDate) = 2025
      AND (ISNULL(HD.OrdStatus, N'') <> 'C') 
      AND (ISNULL(CUST.CustStatus, N'Y') = 'Y')
      AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD'))
    `);
    console.log('Without PONo NOT IN... filter:', result1.recordset[0].TotalHeader);

    const result2 = await pool.request().query(`
      SELECT SUM(ISNULL(HD.SumOrdExchAmnt, 0)) AS TotalHeader
      FROM dbo.OrdHD AS HD WITH (NOLOCK)
      WHERE YEAR(HD.OrdDate) = 2025
      AND (ISNULL(HD.OrdStatus, N'') <> 'C') 
      AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD'))
    `);
    console.log('Without CustStatus & PONo filter:', result2.recordset[0].TotalHeader);

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
check();
