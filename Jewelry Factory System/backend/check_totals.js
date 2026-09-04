const { getPool } = require('./db');

async function check() {
  try {
    const pool = await getPool();
    
    // Check 1: Sum from OrdHD directly
    const result1 = await pool.request().query(`
      SELECT SUM(ISNULL(HD.SumOrdExchAmnt, 0)) AS TotalHeader
      FROM dbo.OrdHD AS HD WITH (NOLOCK)
      LEFT JOIN dbo.GMCust AS CUST WITH (NOLOCK) ON HD.CustCode = CUST.CustCode
      WHERE YEAR(HD.OrdDate) = 2025
      AND (ISNULL(HD.OrdStatus, N'') <> 'C') 
      AND (ISNULL(CUST.CustStatus, N'Y') = 'Y')
      AND (SUBSTRING(HD.OrdNo, 1, 3) IN ('BBC', 'BBS', 'BBE', 'BBL', 'BBR', 'BBT', 'BBP'))
      AND (LTRIM(RTRIM(ISNULL(HD.PONo, ''))) NOT IN ('', 'TOP', 'Test', 'Testing', 'Stock', 'STOCK'))
    `);
    console.log('Total from OrdHD (SumOrdExchAmnt):', result1.recordset[0].TotalHeader);

    // Check 2: Sum from VW_Web_SalesDashboard (ItemAmnt)
    const result2 = await pool.request().query(`
      SELECT SUM(ItemAmnt) AS TotalLines
      FROM dbo.VW_Web_SalesDashboard
      WHERE OrdYear = 2025
    `);
    console.log('Total from VW_Web_SalesDashboard (ItemAmnt):', result2.recordset[0].TotalLines);

    // Check 3: Check if there are differences by OrdNo
    const result3 = await pool.request().query(`
      SELECT TOP 5 
        HD.OrdNo, 
        MAX(HD.SumOrdExchAmnt) AS HeaderTotal, 
        SUM(ISNULL(DT.ItemExchAmnt, DT.ItemAmnt)) AS LinesTotal
      FROM dbo.OrdHD HD
      JOIN dbo.OrdDT DT ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo
      WHERE YEAR(HD.OrdDate) = 2025
      AND (ISNULL(HD.OrdStatus, N'') <> 'C') 
      AND (SUBSTRING(HD.OrdNo, 1, 3) IN ('BBC', 'BBS', 'BBE', 'BBL', 'BBR', 'BBT', 'BBP'))
      GROUP BY HD.OrdNo
      HAVING ABS(MAX(HD.SumOrdExchAmnt) - SUM(ISNULL(DT.ItemExchAmnt, DT.ItemAmnt))) > 1
    `);
    console.log('Differences per order:', result3.recordset);

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
check();
