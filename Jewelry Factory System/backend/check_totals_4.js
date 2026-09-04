const { getPool } = require('./db');

async function check() {
  try {
    const pool = await getPool();
    
    const result1 = await pool.request().query(`
      SELECT SUM(ISNULL(DT.ItemExchAmnt, DT.ItemAmnt)) AS TotalLines
      FROM dbo.OrdHD AS HD WITH (NOLOCK)
      JOIN dbo.OrdDT AS DT WITH (NOLOCK) ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo
      WHERE YEAR(HD.OrdDate) = 2025
      AND (ISNULL(HD.OrdStatus, N'') <> 'C') 
      AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD'))
    `);
    console.log('Total Lines (ItemExchAmnt) with old filters:', result1.recordset[0].TotalLines);

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
check();
