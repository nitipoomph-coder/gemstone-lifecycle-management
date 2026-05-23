const { getPool, sql } = require('../db');

async function test() {
  let pool;
  try {
    pool = await getPool();
    console.log('--- Diagnosing User Date Range (2025-10-21 to 2026-05-21) ---');

    const fromDate = new Date('2025-10-21');
    const toDate = new Date('2026-05-21');

    // Query 1: SP with status = 'all'
    const reqAll = pool.request();
    reqAll.input('FromDate', sql.DateTime, fromDate);
    reqAll.input('ToDate', sql.DateTime, toDate);
    reqAll.input('Status', sql.VarChar, 'all');
    const resAll = await reqAll.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    console.log(`\nSP status = 'all' returned: ${resAll.recordset.length} rows.`);

    // Query 2: SP with status = 'pending'
    const reqPending = pool.request();
    reqPending.input('FromDate', sql.DateTime, fromDate);
    reqPending.input('ToDate', sql.DateTime, toDate);
    reqPending.input('Status', sql.VarChar, 'pending');
    const resPending = await reqPending.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    console.log(`SP status = 'pending' returned: ${resPending.recordset.length} rows.`);

    // Query 3: SP with status = 'finish'
    const reqFinish = pool.request();
    reqFinish.input('FromDate', sql.DateTime, fromDate);
    reqFinish.input('ToDate', sql.DateTime, toDate);
    reqFinish.input('Status', sql.VarChar, 'finish');
    const resFinish = await reqFinish.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    console.log(`SP status = 'finish' returned: ${resFinish.recordset.length} rows.`);

    console.log('\n--- Checking if there are any duplicate PONo or bad groupings in pending vs all ---');
    
    // Let's print unique PO names for pending
    const pendingPOs = new Set(resPending.recordset.map(r => r.PONo));
    const allPOs = new Set(resAll.recordset.map(r => r.PONo));
    
    console.log(`- Unique POs in 'pending': ${pendingPOs.size}`);
    console.log(`- Unique POs in 'all': ${allPOs.size}`);

    // Let's inspect some records in 'pending' where PONo is NOT 'Group PO By ShipTo'
    const regularPending = resPending.recordset.filter(r => r.PONo !== 'Group PO By ShipTo');
    console.log(`- Regular POs in 'pending': ${regularPending.length}`);
    if (regularPending.length > 0) {
      console.log('Sample regular pending POs:');
      regularPending.slice(0, 3).forEach(r => {
        console.log(`  - PO: "${r.PONo}", CustCode: "${r.CustCode}", OrdNo: "${r.OrdNo}", SumQty: ${r.SumQty}, FinishQty: ${r.FinishQty}`);
      });
    }

  } catch (err) {
    console.error('Diagnostic failed:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

test();
