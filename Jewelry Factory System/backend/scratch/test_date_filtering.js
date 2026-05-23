const { getPool, sql } = require('../db');

async function runTest() {
  let pool;
  try {
    pool = await getPool();
    console.log('--- Testing Stored Procedure Date Filtering ---');

    // 1. Wide range: 2 years (2025-01-01 to 2026-12-31)
    const wideFrom = new Date('2025-01-01');
    const wideTo = new Date('2026-12-31');
    const reqWide = pool.request();
    reqWide.input('FromDate', sql.DateTime, wideFrom);
    reqWide.input('ToDate', sql.DateTime, wideTo);
    reqWide.input('Status', sql.VarChar, 'all');
    const resWide = await reqWide.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    console.log(`Wide range (2025-01-01 to 2026-12-31) returned: ${resWide.recordset.length} rows.`);

    // 2. Narrow range: 30 days (2025-10-21 to 2025-11-21)
    const narrowFrom = new Date('2025-10-21');
    const narrowTo = new Date('2025-11-21');
    const reqNarrow = pool.request();
    reqNarrow.input('FromDate', sql.DateTime, narrowFrom);
    reqNarrow.input('ToDate', sql.DateTime, narrowTo);
    reqNarrow.input('Status', sql.VarChar, 'all');
    const resNarrow = await reqNarrow.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    console.log(`Narrow range (2025-10-21 to 2025-11-21) returned: ${resNarrow.recordset.length} rows.`);

    // 3. Ultra narrow range: 5 days (2026-01-01 to 2026-01-05)
    const ultraFrom = new Date('2026-01-01');
    const ultraTo = new Date('2026-01-05');
    const reqUltra = pool.request();
    reqUltra.input('FromDate', sql.DateTime, ultraFrom);
    reqUltra.input('ToDate', sql.DateTime, ultraTo);
    reqUltra.input('Status', sql.VarChar, 'all');
    const resUltra = await reqUltra.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    console.log(`Ultra narrow range (2026-01-01 to 2026-01-05) returned: ${resUltra.recordset.length} rows.`);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

runTest();
