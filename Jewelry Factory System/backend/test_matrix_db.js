const { getPool } = require('./db');
const { buildSalesFilters, salesDateBasis } = require('./utils/dateFilters');

async function test() {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    const req = { query: { years: '2026,2025', type: 'ALL', dateField: 'dueDate' } };
    const { dateExpr: dateColumn } = salesDateBasis(req, '');
    const { whereSql: sargableDateCondition } = buildSalesFilters(req, request, '', dateColumn);
    
    const multiQuery = `
      -- 1. กรองข้อมูลเฉพาะช่วงเวลาที่ต้องการมาใส่ Temporary Table (#FilteredSales)
      IF OBJECT_ID('tempdb..#FilteredSales') IS NOT NULL DROP TABLE #FilteredSales;

      SELECT 
        CustCode,
        CustName,
        CustStatus,
        SalesName,
        YEAR(${dateColumn}) AS OrdYear,
        MONTH(${dateColumn}) AS OrdMonth,
        DATEPART(isowk, ${dateColumn}) AS OrdWeek,
        ItemAmnt,
        ItemQty,
        ItemNo,
        ProductType
      INTO #FilteredSales
      FROM VW_Web_SalesDashboard
      WHERE ${sargableDateCondition}
        AND ISNULL(CustStatus, 'Y') = 'Y';

      -- [Recordset 0] General Sales
      SELECT
        CustCode AS id,
        MAX(CustName) AS name,
        MAX(CustStatus) AS custStatus,
        MAX(SalesName) AS salesName,
        OrdYear AS yr,
        OrdMonth AS mth,
        OrdWeek AS wk,
        SUM(ItemAmnt) AS totalSales,
        SUM(ItemQty) AS totalQty
      FROM #FilteredSales
      GROUP BY CustCode, OrdYear, OrdMonth, OrdWeek;

      -- [Recordset 1] Top Item Overall
      WITH ItemTotals AS (
        SELECT CustCode, ItemNo, SUM(ItemQty) as totalQty
        FROM #FilteredSales
        GROUP BY CustCode, ItemNo
      ),
      RankedItems AS (
        SELECT CustCode, ItemNo, totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems WHERE rn = 1;

      -- [Recordset 2] Top Item By Year
      WITH ItemTotals AS (
        SELECT CustCode, OrdYear AS yr, ItemNo, SUM(ItemQty) as totalQty
        FROM #FilteredSales
        GROUP BY CustCode, OrdYear, ItemNo
      ),
      RankedItems AS (
        SELECT CustCode, yr, ItemNo, totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode, yr ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, yr, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems WHERE rn = 1;

      -- [Recordset 3] Top Item By Year & Type
      WITH ItemTotals AS (
        SELECT CustCode, OrdYear AS yr, ProductType, ItemNo, SUM(ItemQty) as totalQty
        FROM #FilteredSales
        GROUP BY CustCode, OrdYear, ProductType, ItemNo
      ),
      RankedItems AS (
        SELECT CustCode, yr, ProductType, ItemNo, totalQty,
          ROW_NUMBER() OVER(PARTITION BY CustCode, yr, ProductType ORDER BY totalQty DESC) as rn
        FROM ItemTotals
      )
      SELECT CustCode as id, yr, ProductType as productType, ItemNo as topItem, totalQty as topItemQty
      FROM RankedItems WHERE rn = 1;

      -- 3. ลบ Temporary Table
      DROP TABLE #FilteredSales;
    `;
    
    const multiResult = await request.query(multiQuery);
    console.log('Recordsets length:', multiResult.recordsets.length);
    if (multiResult.recordsets.length > 0) {
      console.log('Recordset 0 (General Sales) length:', multiResult.recordsets[0].length);
      console.log('Recordset 1 (Top Item Overall) length:', multiResult.recordsets[1].length);
      console.log('Recordset 2 (Top Item By Year) length:', multiResult.recordsets[2].length);
      console.log('Recordset 3 (Top Item By Year & Type) length:', multiResult.recordsets[3].length);
      
      const r0 = multiResult.recordsets[0];
      if (r0.length > 0) console.log('r0 sample:', r0[0]);
    }
    
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    process.exit(0);
  }
}

test();
