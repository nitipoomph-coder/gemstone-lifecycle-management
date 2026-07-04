const { getPool } = require('./db');
(async () => {
  try {
    const pool = await getPool();

    // 1. Read current SP definitions
    const spResult = await pool.request().query(`
      SELECT 
        o.name AS SPName,
        m.definition AS SPDefinition
      FROM sys.sql_modules m
      JOIN sys.objects o ON m.object_id = o.object_id
      WHERE o.type = 'P'
        AND o.name IN (
          'PC_Show_OrdTrack_Sum_DueDate',
          'PC_Show_OrdTrack_Sum_CustDueDate',
          'PC_Show_OrdTrack_Sum_FinDate',
          'PC_Show_OrdTrack_Sum_All'
        )
      ORDER BY o.name;
    `);

    console.log(`Found ${spResult.recordset.length} SPs\n`);

    for (const sp of spResult.recordset) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`SP: ${sp.SPName}`);
      console.log(`${'='.repeat(80)}`);
      // Show first 300 chars to see parameters and first WHERE clause
      const def = sp.SPDefinition;
      
      // Find @Status parameter
      const hasStatus = def.includes('@Status');
      console.log(`Has @Status param: ${hasStatus}`);
      
      // Find the date column used in WHERE
      const dateMatch = def.match(/WHERE\s+.*?\.(\w+Date)\s+BETWEEN\s+@FromDate/i);
      console.log(`Date column in WHERE: ${dateMatch ? dateMatch[1] : 'NOT FOUND (maybe no date filter)'}`);
      
      // Count UNION ALL
      const unionCount = (def.match(/UNION ALL/gi) || []).length;
      console.log(`UNION ALL count: ${unionCount}`);
      
      // Show parameters section
      const paramMatch = def.match(/@FromDate[\s\S]*?AS\s*\n/i);
      if (paramMatch) {
        console.log(`\nParameters:\n${paramMatch[0].trim()}`);
      }
      
      // Show first WHERE clause
      const firstWhere = def.match(/WHERE[\s\S]{0,200}/);
      if (firstWhere) {
        console.log(`\nFirst WHERE clause:\n${firstWhere[0].trim()}`);
      }
    }

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
