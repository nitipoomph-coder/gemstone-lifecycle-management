const { getPool, sql } = require('../db');

async function test() {
  let pool;
  try {
    pool = await getPool();
    console.log('--- Verifying Stored Procedure Results ---');

    // 1. Check date bounds
    const bounds = await pool.request().query(`
      SELECT MIN(OrdDate) as minDate, MAX(OrdDate) as maxDate, COUNT(*) as totalOrders
      FROM OrdHD
      WHERE CustCode IN ('N008','N044','N048','N066','N067','N068','N069','N070','N071','N072','N073','N074','N075')
    `);
    console.log('Data Bounds for Grouping-eligible Customers:');
    console.log(`- Min Date: ${bounds.recordset[0].minDate}`);
    console.log(`- Max Date: ${bounds.recordset[0].maxDate}`);
    console.log(`- Total Orders: ${bounds.recordset[0].totalOrders}`);

    const fromDate = new Date(bounds.recordset[0].minDate || '2025-01-01');
    const toDate = new Date(bounds.recordset[0].maxDate || '2026-12-31');

    // 2. Run the Stored Procedure for 'pending'
    console.log('\nRunning PC_Show_OrdTrack_Sum_OrdDate with status = "pending"...');
    const reqPending = pool.request();
    reqPending.input('FromDate', sql.DateTime, fromDate);
    reqPending.input('ToDate', sql.DateTime, toDate);
    reqPending.input('Status', sql.VarChar, 'pending');
    
    const pendingResult = await reqPending.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    const pendingRows = pendingResult.recordset;
    console.log(`Pending View returned: ${pendingRows.length} rows.`);

    // 3. Run the Stored Procedure for 'finish'
    console.log('\nRunning PC_Show_OrdTrack_Sum_OrdDate with status = "finish"...');
    const reqFinish = pool.request();
    reqFinish.input('FromDate', sql.DateTime, fromDate);
    reqFinish.input('ToDate', sql.DateTime, toDate);
    reqFinish.input('Status', sql.VarChar, 'finish');
    
    const finishResult = await reqFinish.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    const finishRows = finishResult.recordset;
    console.log(`Finish View returned: ${finishRows.length} rows.`);

    // 4. Run the Stored Procedure for 'All'
    console.log('\nRunning PC_Show_OrdTrack_Sum_OrdDate with status = "All"...');
    const reqAll = pool.request();
    reqAll.input('FromDate', sql.DateTime, fromDate);
    reqAll.input('ToDate', sql.DateTime, toDate);
    reqAll.input('Status', sql.VarChar, 'All');
    
    const allResult = await reqAll.execute('dbo.PC_Show_OrdTrack_Sum_OrdDate');
    const allRows = allResult.recordset;
    console.log(`All View returned: ${allRows.length} rows.`);

    // 5. Analyze groups
    console.log('\nAnalyzing "Group PO By ShipTo" instances across views:');
    const countGroups = (rows) => rows.filter(r => r.PONo === 'Group PO By ShipTo').length;
    const countRegular = (rows) => rows.filter(r => r.PONo !== 'Group PO By ShipTo').length;
    
    console.log(`- Pending View: Groups: ${countGroups(pendingRows)}, Regular POs: ${countRegular(pendingRows)}`);
    console.log(`- Finish View: Groups: ${countGroups(finishRows)}, Regular POs: ${countRegular(finishRows)}`);
    console.log(`- All View: Groups: ${countGroups(allRows)}, Regular POs: ${countRegular(allRows)}`);

    // 6. Check a few multi-order PO samples
    const multiOrderRealNames = allRows.filter(r => r.PONo !== 'Group PO By ShipTo' && r.OrdNo && r.OrdNo.includes('/'));
    console.log('\nSample Multi-Order POs displaying their real PO name (correctly classified):');
    if (multiOrderRealNames.length === 0) {
      console.log('No historical multi-order POs found in the active data set.');
    } else {
      multiOrderRealNames.slice(0, 5).forEach((r, idx) => {
        console.log(`${idx + 1}. PO: "${r.PONo}", CustCode: "${r.CustCode}", OrdNo list: "${r.OrdNo}", SumQty: ${r.SumQty}, FinishQty: ${r.FinishQty}`);
      });
    }

    console.log('\n--- Verification completed successfully! ---');
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

test();
