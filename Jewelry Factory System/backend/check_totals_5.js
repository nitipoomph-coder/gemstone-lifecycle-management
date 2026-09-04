const { getPool } = require('./db');

async function check() {
  try {
    const pool = await getPool();
    
    const result1 = await pool.request().query(`
      WITH JoinedData AS (
        SELECT 
          HD.OrdID,
          HD.SumOrdExchAmnt,
          DT.ItemExchAmnt,
          ROW_NUMBER() OVER(PARTITION BY HD.OrdID ORDER BY DT.OrdLineNo) as rn
        FROM dbo.OrdHD AS HD WITH (NOLOCK)
        JOIN dbo.OrdDT AS DT WITH (NOLOCK) ON HD.OrdID = DT.OrdID AND HD.OrdNo = DT.OrdNo
        WHERE YEAR(HD.OrdDate) = 2025
        AND (SUBSTRING(HD.OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD'))
      )
      SELECT 
        SUM(CASE WHEN rn = 1 THEN ISNULL(SumOrdExchAmnt, 0) ELSE 0 END) AS TotalHeaderFromJoin,
        SUM(ISNULL(ItemExchAmnt, 0)) AS TotalLines
      FROM JoinedData
    `);
    console.log('Result:', result1.recordset[0]);

  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
check();
