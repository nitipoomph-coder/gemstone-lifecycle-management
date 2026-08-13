const { getPool } = require('./db');

async function runTest() {
  try {
    const pool = await getPool();
    const request = pool.request();

    console.log('--- Testing 2025 Totals by Group ---');

    const sql = `
      SELECT CustCode, SUM(SumOrdExchAmnt) as ExchAmnt, SUM(SumOrdAmnt) as OrdAmnt
      FROM OrdHD 
      WHERE OrdYear = 2025 
        AND ISNULL(OrdStatus, '') != 'C' 
        AND ISNULL(CloseStatus, '') != 'C' 
        AND SUBSTRING(OrdNo, 1, 3) NOT IN ('BBP','BBK','BBS','BBL','BBT','BBD') 
        AND (PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%')
      GROUP BY CustCode
    `;
    
    const r = await request.query(sql);
    
    let activeGroupsSumRaw = 0;
    let activeGroupsSumExch = 0;
    
    r.recordset.forEach(row => {
      const cc = row.CustCode ? row.CustCode.trim().toUpperCase() : '';
      if (['N008', 'N048', 'N065', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075', 'N044', 'N098', 'N051', 'M019', 'R043'].some(p => cc.startsWith(p))) {
        activeGroupsSumRaw += row.OrdAmnt;
        activeGroupsSumExch += row.ExchAmnt;
      }
    });

    console.log('Active Groups OrdAmnt:', activeGroupsSumRaw);
    console.log('Active Groups ExchAmnt:', activeGroupsSumExch);
    
    let totalRaw = 0;
    let totalExch = 0;
    r.recordset.forEach(row => {
      totalRaw += row.OrdAmnt;
      totalExch += row.ExchAmnt;
    });
    
    console.log('Total OrdAmnt:', totalRaw);
    console.log('Total ExchAmnt:', totalExch);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

runTest();
