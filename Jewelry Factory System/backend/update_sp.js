const fs = require('fs');
const { getPool } = require('./db');

async function run() {
  try {
    const pool = await getPool();
    const files = [
      'PC_Show_OrdTrack_Sum_OrdDate.sql',
      'PC_Show_OrdTrack_Sum_FinDate.sql',
      'PC_Show_OrdTrack_Sum_DueDate.sql',
      'PC_Show_OrdTrack_Sum_CustDueDate.sql',
      'PC_Show_OrdTrack_Sum_All.sql'
    ];

    const replacement = `LTRIM(RTRIM(STUFF((SELECT DISTINCT '/ ' + ISNULL(T1.PONo,'')
FROM OrdHD T1
WHERE T1.CustCode = OrdHD.CustCode
AND ISNULL(T1.CustMultiAddr,'') = ISNULL(OrdHD.CustMultiAddr,'')
AND ISNULL(T1.OrdKind,'') = ISNULL(OrdHD.OrdKind,'')
AND ISNULL(T1.OrdMat,'') = ISNULL(OrdHD.OrdMat,'')
AND ISNULL(T1.CustDueDate,'1900-01-01') = ISNULL(OrdHD.CustDueDate,'1900-01-01')
FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, ''))) AS PONo,`;

    for (const f of files) {
      let path = 'sql/stored-procedures/' + f;
      if (!fs.existsSync(path)) continue;

      let sql = fs.readFileSync(path, 'utf8');
      
      if (sql.includes('AS PONo,') && !sql.includes('ISNULL(T1.PONo')) {
         sql = sql.replace("'Group PO By ShipTo' AS PONo,", replacement);
         sql = sql.replace(/CREATE PROCEDURE/i, 'ALTER PROCEDURE');
         
         const batches = sql.split(/^GO$/im);
         for(const batch of batches) {
             if (batch.trim().length > 0) {
                 await pool.request().batch(batch);
             }
         }
         console.log('Updated ' + f);
         
         fs.writeFileSync(path, sql.replace(/ALTER PROCEDURE/i, 'CREATE PROCEDURE'));
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
