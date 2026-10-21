const { sql } = require('../db');

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📌 QUERIES: Production Dashboard SQL Execution Layer
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure database query execution functions.
 * Preserves 100% exact SQL text, parameter types and query semantics.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const DEPT_UNION_SQL = `
  SELECT 'FL' AS Dept, 'Filing' AS DeptName, 1 AS Seq, ISNULL(ProFac, 'FBE') AS Facility, MONTH(DocuDate) AS Mo, ISNULL(SumSenQty, 0) AS Qty FROM FLSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'GR', 'Grinding & Setting', 2, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM GRSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'TB', 'Tumbling', 3, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM TBSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'AS', 'Assembly', 4, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM ASSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'LS', 'Laser', 5, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM LSSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'LP', 'Lapping', 6, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM LPSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'PL', 'Polishing', 7, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM PLSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'EP', 'Epoxy', 8, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM EPSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'CP', 'Copper Plating', 9, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM CPSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'PT', 'Plating Finishing', 10, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM PTSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
  UNION ALL SELECT 'IQ', 'In-process QC', 11, ISNULL(ProFac, 'FBE'), MONTH(DocuDate), ISNULL(SumSenQty, 0) FROM IQSenHD WHERE (@year IS NULL OR YEAR(DocuDate) = @year)
`;

async function fetchStatsResult(reqFactory) {
  return reqFactory().query(`
    SELECT
      COUNT(CASE WHEN CAST(OrdDate AS DATE) = CAST(GETDATE() AS DATE) THEN 1 END) AS ordersToday,
      COUNT(CASE WHEN CloseStatus = 'Y' OR OrdStatus = 'C' THEN 1 END) AS completed,
      COUNT(CASE WHEN OrdStatus IN ('P','N') AND CloseStatus <> 'Y' THEN 1 END) AS wip,
      COUNT(CASE WHEN DueDate < CAST(GETDATE() AS DATE) AND OrdStatus IN ('P','N') AND CloseStatus <> 'Y' THEN 1 END) AS delay
    FROM OrdHD
    WHERE ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(OrdDate) = @year)
  `);
}

async function fetchWeekResult(reqFactory) {
  return reqFactory().query(`
    SELECT
      COUNT(CASE WHEN CAST(OrdDate AS DATE) >= DATEADD(day, -7, CAST(GETDATE() AS DATE)) THEN 1 END) AS thisWeek,
      COUNT(CASE WHEN CAST(OrdDate AS DATE) >= DATEADD(day, -14, CAST(GETDATE() AS DATE))
                  AND CAST(OrdDate AS DATE) < DATEADD(day, -7, CAST(GETDATE() AS DATE)) THEN 1 END) AS lastWeek
    FROM OrdHD
    WHERE ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(OrdDate) = @year)
  `);
}

async function fetchAvgResult(reqFactory) {
  return reqFactory().query(`
    WITH Last7Days AS (
      SELECT DISTINCT TOP 7 CAST(OrdDate AS DATE) AS WorkDate
      FROM OrdHD
      WHERE
        CAST(OrdDate AS DATE) < CAST(GETDATE() AS DATE)
        AND DATENAME(dw, OrdDate) <> 'Sunday'
        AND OrdDate IS NOT NULL
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
      ORDER BY WorkDate DESC
    )
    SELECT
      ISNULL(AVG(CAST(d.OrderCount AS FLOAT)), 0) AS avgOrders
    FROM (
      SELECT COUNT(OrdNo) AS OrderCount
      FROM Last7Days w
      JOIN OrdHD o ON CAST(o.OrdDate AS DATE) = w.WorkDate AND ((o.PONo IS NULL OR UPPER(o.PONo) NOT LIKE '%SAMPLE%') AND LEFT(o.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      GROUP BY w.WorkDate
    ) d
  `);
}

async function fetchMonthResult(reqFactory) {
  return reqFactory().query(`
    SELECT COUNT(*) AS ordCount, SUM(ISNULL(SumOrdQty,0)) AS totalQty
    FROM OrdHD
    WHERE MONTH(OrdDate) = MONTH(GETDATE()) AND YEAR(OrdDate) = ISNULL(@year, YEAR(GETDATE()))
      AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
  `);
}

async function fetchYoyResult(reqFactory) {
  return reqFactory().query(`
    SELECT
      -- Completed: this month vs same month last year
      COUNT(CASE WHEN (CloseStatus='Y' OR OrdStatus='C') AND MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear THEN 1 END) AS compNow,
      COUNT(CASE WHEN (CloseStatus='Y' OR OrdStatus='C') AND MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear-1 THEN 1 END) AS compLY,
      -- This Month: this month vs same month last year
      COUNT(CASE WHEN MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear THEN 1 END) AS monthNow,
      COUNT(CASE WHEN MONTH(OrdDate)=MONTH(GETDATE()) AND YEAR(OrdDate)=@activeYear-1 THEN 1 END) AS monthLY
    FROM OrdHD
    WHERE ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
  `);
}

async function fetchTrendResult(reqFactory) {
  return reqFactory().query(`
    ;WITH Last7 AS (
      SELECT DATEADD(day, -6, CAST(@refDate AS DATE)) AS dt
      UNION ALL SELECT DATEADD(day, 1, dt) FROM Last7 WHERE dt < CAST(@refDate AS DATE)
    )
    SELECT
      l.dt,
      ISNULL(cnt, 0) AS cnt
    FROM Last7 l
    LEFT JOIN (
      SELECT CAST(OrdDate AS DATE) AS dt, COUNT(*) AS cnt
      FROM OrdHD
      WHERE OrdDate >= DATEADD(day, -7, CAST(@refDate AS DATE))
        AND OrdDate <= CAST(@refDate AS DATE)
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
      GROUP BY CAST(OrdDate AS DATE)
    ) o ON l.dt = o.dt
    ORDER BY l.dt
  `);
}

async function fetchProcessResult(reqFactory) {
  return reqFactory().query(`
    SELECT
      SUM(CASE WHEN d.CastQty > 0 AND ISNULL(d.GrindQty,0) = 0 THEN 1 ELSE 0 END) AS casting,
      SUM(CASE WHEN d.GrindQty > 0 AND ISNULL(d.PolishQty,0) = 0 THEN 1 ELSE 0 END) AS grinding,
      SUM(CASE WHEN d.PolishQty > 0 AND ISNULL(d.PlateQty,0) = 0 THEN 1 ELSE 0 END) AS polishing,
      SUM(CASE WHEN d.PlateQty > 0 AND ISNULL(d.AssemQty,0) = 0 THEN 1 ELSE 0 END) AS plating,
      SUM(CASE WHEN d.QCQty > 0 AND ISNULL(d.PackQty,0) = 0 THEN 1 ELSE 0 END) AS qc,
      SUM(CASE WHEN d.PackQty > 0 THEN 1 ELSE 0 END) AS packing,
      COUNT(*) AS total
    FROM OrdDT d
    JOIN OrdHD h ON d.OrdNo = h.OrdNo
    WHERE h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
      AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
  `);
}

async function fetchMaterialResult(reqFactory) {
  return reqFactory().query(`
    SELECT ISNULL(OrdMat,'Other') AS material, COUNT(*) AS cnt,
           SUM(ISNULL(SumOrdQty,0)) AS totalQty
    FROM OrdHD
    WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
      AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(OrdDate) = @year)
    GROUP BY OrdMat ORDER BY cnt DESC
  `);
}

async function fetchKindResult(reqFactory) {
  return reqFactory().query(`
    SELECT ISNULL(OrdKind,'Other') AS kind, COUNT(*) AS cnt
    FROM OrdHD
    WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
      AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(OrdDate) = @year)
    GROUP BY OrdKind ORDER BY cnt DESC
  `);
}

async function fetchCustomerResult(reqFactory) {
  return reqFactory().query(`
    SELECT TOP 9
      h.CustCode,
      ISNULL(c.CustName, h.CustCode) AS custName,
      COUNT(*) AS orderCount,
      SUM(ISNULL(h.SumOrdQty,0)) AS totalQty
    FROM OrdHD h
    LEFT JOIN GMCust c ON c.CustCode = h.CustCode
    WHERE h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
      AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
    GROUP BY h.CustCode, c.CustName
    ORDER BY totalQty DESC
  `);
}

async function fetchDelayResult(reqFactory) {
  return reqFactory().query(`
    SELECT TOP 15
      h.OrdNo,
      h.PONo,
      h.CustCode,
      ISNULL(c.CustName, h.CustCode) AS custName,
      h.DueDate,
      DATEDIFF(day, h.DueDate, GETDATE()) AS delayDays,
      h.SumOrdQty AS qty,
      h.ProFac
    FROM OrdHD h
    LEFT JOIN GMCust c ON c.CustCode = h.CustCode
    WHERE h.DueDate < CAST(GETDATE() AS DATE)
      AND h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
      AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
    ORDER BY h.DueDate ASC
  `);
}

async function fetchRecentResult(reqFactory) {
  return reqFactory().query(`
    SELECT TOP 6
      h.OrdNo,
      h.PONo,
      h.CustCode,
      h.OrdDate,
      h.OrdMat,
      h.OrdKind,
      h.SumOrdQty AS qty,
      CASE
        WHEN h.CloseStatus = 'Y' THEN 'Completed'
        WHEN h.DueDate < CAST(GETDATE() AS DATE) THEN 'Overdue'
        ELSE 'In Progress'
      END AS status
    FROM OrdHD h
    WHERE ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
    ORDER BY h.OrdDate DESC
  `);
}

async function fetchStoneFindingResult(reqFactory) {
  return reqFactory().query(`
    SELECT
      COUNT(*) AS totalItems,
      SUM(CASE WHEN ISNULL(d.StoneQty, 0) = 0 AND ISNULL(d.FStoneStatus, '') NOT IN ('N','X') THEN 1 ELSE 0 END) AS stonePendingItems,
      SUM(CASE WHEN ISNULL(d.StoneQty, 0) > 0 THEN 1 ELSE 0 END) AS stoneDoneItems,
      SUM(CASE WHEN ISNULL(d.StoneQty, 0) = 0 AND ISNULL(d.FStoneStatus, '') NOT IN ('N','X') THEN ISNULL(d.ItemQty, 0) ELSE 0 END) AS stonePendingQty,
      SUM(CASE WHEN ISNULL(d.FitQty, 0) = 0 AND ISNULL(d.FFitStatus, '') NOT IN ('N','X') THEN 1 ELSE 0 END) AS findingPendingItems,
      SUM(CASE WHEN ISNULL(d.FitQty, 0) > 0 THEN 1 ELSE 0 END) AS findingDoneItems,
      SUM(CASE WHEN ISNULL(d.FitQty, 0) = 0 AND ISNULL(d.FFitStatus, '') NOT IN ('N','X') THEN ISNULL(d.ItemQty, 0) ELSE 0 END) AS findingPendingQty
    FROM OrdDT d
    JOIN OrdHD h ON d.OrdNo = h.OrdNo
    WHERE (@year IS NULL OR YEAR(h.OrdDate) = @year)
  `);
}

async function fetchWipResult(pool, selectedYear) {
  return pool.request()
    .input('year', sql.Int, selectedYear)
    .query(`
      SELECT 
        CASE WHEN ProFac IN ('FBD', 'FBE') THEN 'FBE' ELSE 'CLL' END AS Fac,
        COUNT(*) AS wipOrders,
        SUM(ISNULL(SumOrdQty, 0)) AS wipPcs
      FROM OrdHD WITH (NOLOCK)
      WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
      GROUP BY CASE WHEN ProFac IN ('FBD', 'FBE') THEN 'FBE' ELSE 'CLL' END
    `);
}

async function fetchOverdueResult(pool, selectedYear) {
  return pool.request()
    .input('year', sql.Int, selectedYear)
    .query(`
      SELECT 
        CASE WHEN ProFac IN ('FBD', 'FBE') THEN 'FBE' ELSE 'CLL' END AS Fac,
        COUNT(*) AS overdueCount,
        SUM(ISNULL(SumOrdQty, 0)) AS overduePcs
      FROM OrdHD WITH (NOLOCK)
      WHERE DueDate < CAST(GETDATE() AS DATE) 
        AND OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
        AND (@year IS NULL OR YEAR(OrdDate) = @year)
      GROUP BY CASE WHEN ProFac IN ('FBD', 'FBE') THEN 'FBE' ELSE 'CLL' END
    `);
}

async function fetchDeptResult(pool, selectedYear) {
  return pool.request()
    .input('year', sql.Int, selectedYear)
    .query(`
      WITH RawData AS (${DEPT_UNION_SQL})
      SELECT 
        Dept, DeptName, Seq,
        SUM(CASE WHEN Facility = 'FBE' THEN Qty ELSE 0 END) AS FbePcs,
        SUM(CASE WHEN Facility = 'CLL' THEN Qty ELSE 0 END) AS CllPcs,
        SUM(Qty) AS TotalPcs
      FROM RawData
      GROUP BY Dept, DeptName, Seq
      ORDER BY Seq
    `);
}

async function fetchTimelineResult(pool, selectedYear) {
  return pool.request()
    .input('year', sql.Int, selectedYear)
    .query(`
      WITH RawData AS (${DEPT_UNION_SQL})
      SELECT 
        Mo AS MonthNum,
        SUM(CASE WHEN Facility = 'FBE' THEN Qty ELSE 0 END) AS FbePcs,
        SUM(CASE WHEN Facility = 'CLL' THEN Qty ELSE 0 END) AS CllPcs,
        SUM(Qty) AS TotalPcs
      FROM RawData
      GROUP BY Mo
      ORDER BY Mo
    `);
}

async function fetchHolidayResult(pool, year) {
  return pool.request()
    .input('year', sql.Int, year)
    .query(`
      SELECT COUNT(DISTINCT CAST(HolDate AS DATE)) AS HolidayCount 
      FROM GMHoliday 
      WHERE YEAR(HolDate) = @year AND DATENAME(dw, HolDate) <> 'Sunday'
    `);
}

async function fetchCllPipelineResult(pool, selectedYear) {
  return pool.request()
    .input('year', sql.Int, selectedYear)
    .query(`
      SELECT
        Stage,
        COUNT(*) AS LineCount,
        SUM(ItemQty) AS StagePcs
      FROM (
        SELECT
          d.ItemQty,
          CASE
            WHEN ISNULL(d.PackQty, 0) > 0 THEN 'PACK'
            WHEN ISNULL(d.QCQty, 0) > 0 THEN 'QC'
            WHEN ISNULL(d.PlateQty, 0) > 0 THEN 'PLATE'
            WHEN ISNULL(d.PolishQty, 0) > 0 THEN 'POLISH'
            WHEN ISNULL(d.GrindQty, 0) > 0 THEN 'GRIND'
            WHEN ISNULL(d.CastQty, 0) > 0 THEN 'CAST'
            ELSE 'WAX'
          END AS Stage
        FROM OrdDT d WITH (NOLOCK)
        JOIN OrdHD h WITH (NOLOCK) ON d.OrdNo = h.OrdNo
        WHERE h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y'
          AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
          AND (h.ProFac NOT IN ('FBD','FBE') OR h.ProFac IS NULL)
          AND (@year IS NULL OR YEAR(h.OrdDate) = @year)
      ) t
      GROUP BY Stage
    `);
}

async function fetchFbePipelineResult(pool, selectedYear) {
  return pool.request()
    .input('year', sql.Int, selectedYear)
    .query(`
      WITH ActiveOrders AS (
        SELECT OrdNo, SumOrdQty
        FROM OrdHD WITH (NOLOCK)
        WHERE OrdStatus IN ('P','N') AND CloseStatus <> 'Y'
          AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
          AND ProFac IN ('FBD','FBE')
          AND (@year IS NULL OR YEAR(OrdDate) = @year)
      ),
      SenActivities AS (
        SELECT d.OrdNo, 1 AS StepRank FROM GRSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 2 AS StepRank FROM TBSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 3 AS StepRank FROM FLSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 4 AS StepRank FROM ASSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 5 AS StepRank FROM LSSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 6 AS StepRank FROM LPSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 7 AS StepRank FROM PLSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 8 AS StepRank FROM CPSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 9 AS StepRank FROM PTSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
        UNION ALL
        SELECT d.OrdNo, 10 AS StepRank FROM IQSenDT d WITH (NOLOCK) INNER JOIN ActiveOrders ao ON d.OrdNo = ao.OrdNo GROUP BY d.OrdNo
      ),
      MaxStep AS (
        SELECT OrdNo, MAX(StepRank) AS MaxRank
        FROM SenActivities
        GROUP BY OrdNo
      ),
      OrderStepMapped AS (
        SELECT 
          ao.OrdNo,
          ao.SumOrdQty,
          CASE 
            WHEN ms.MaxRank = 10 THEN 'IQ'
            WHEN ms.MaxRank = 9 THEN 'PT'
            WHEN ms.MaxRank = 8 THEN 'CP'
            WHEN ms.MaxRank = 7 THEN 'PL'
            WHEN ms.MaxRank = 6 THEN 'LP'
            WHEN ms.MaxRank = 5 THEN 'LS'
            WHEN ms.MaxRank = 4 THEN 'AS'
            WHEN ms.MaxRank = 3 THEN 'FL'
            WHEN ms.MaxRank = 2 THEN 'TB'
            WHEN ms.MaxRank = 1 THEN 'GR'
            ELSE 'PREP'
          END AS Stage
        FROM ActiveOrders ao
        LEFT JOIN MaxStep ms ON ao.OrdNo = ms.OrdNo
      )
      SELECT 
        Stage,
        COUNT(*) AS OrderCount,
        SUM(SumOrdQty) AS Pcs
      FROM OrderStepMapped
      GROUP BY Stage
    `);
}

async function fetchYearsResult(pool) {
  return pool.request().query(`
    SELECT DISTINCT YEAR(OrdDate) AS yr
    FROM OrdHD
    WHERE OrdDate IS NOT NULL
    ORDER BY yr DESC;

    SELECT MIN(YEAR(OrdDate)) AS firstDataYear
    FROM OrdHD
    WHERE OrdDate IS NOT NULL;
  `);
}

async function fetchTodayActual(pool) {
  return pool.request().query(`
    SELECT COUNT(*) AS cnt, SUM(ISNULL(SumOrdQty, 0)) AS qty
    FROM OrdHD
    WHERE CAST(OrdDate AS DATE) = CAST(GETDATE() AS DATE)
      AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
  `);
}

async function fetchTodayLast7DaysWorkData(pool) {
  return pool.request().query(`
    WITH Last7Days AS (
      SELECT DISTINCT TOP 7 CAST(OrdDate AS DATE) AS WorkDate
      FROM OrdHD
      WHERE
        CAST(OrdDate AS DATE) < CAST(GETDATE() AS DATE)
        AND DATENAME(dw, OrdDate) <> 'Sunday'
        AND OrdDate IS NOT NULL
        AND ((PONo IS NULL OR UPPER(PONo) NOT LIKE '%SAMPLE%') AND LEFT(OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
      ORDER BY WorkDate DESC
    )
    SELECT
      w.WorkDate,
      DATENAME(dw, w.WorkDate) AS DayName,
      COUNT(o.OrdNo) AS OrderCount,
      SUM(ISNULL(o.SumOrdQty,0)) AS TotalQty
    FROM Last7Days w
    LEFT JOIN OrdHD o ON CAST(o.OrdDate AS DATE) = w.WorkDate AND ((o.PONo IS NULL OR UPPER(o.PONo) NOT LIKE '%SAMPLE%') AND LEFT(o.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))
    GROUP BY w.WorkDate
    ORDER BY w.WorkDate ASC
  `);
}

async function fetchCardMonthly(pool, { where, dateCol, year1, year2 }) {
  return pool.request()
    .input('y1', sql.Int, year1)
    .input('y2', sql.Int, year2)
    .query(`
      SELECT YEAR(h.${dateCol}) as yr, MONTH(h.${dateCol}) as m,
             COUNT(*) as cnt, SUM(ISNULL(h.SumOrdQty,0)) as qty, SUM(ISNULL(h.SumOrdAmnt,0)) as amt
      FROM OrdHD h WHERE ${where} AND YEAR(h.${dateCol}) IN (@y1,@y2)
      GROUP BY YEAR(h.${dateCol}), MONTH(h.${dateCol}) ORDER BY yr, m
    `);
}

async function fetchCardCustomerBreakdown(pool, { where, dateCol, year1, year2 }) {
  return pool.request()
    .input('y1', sql.Int, year1)
    .input('y2', sql.Int, year2)
    .query(`
      SELECT TOP 10 h.CustCode, ISNULL(c.CustName, h.CustCode) as custName,
        SUM(CASE WHEN YEAR(h.${dateCol})=@y1 THEN 1 ELSE 0 END) as y1Cnt,
        SUM(CASE WHEN YEAR(h.${dateCol})=@y2 THEN 1 ELSE 0 END) as y2Cnt,
        SUM(CASE WHEN YEAR(h.${dateCol})=@y1 THEN ISNULL(h.SumOrdQty,0) ELSE 0 END) as y1Qty,
        SUM(CASE WHEN YEAR(h.${dateCol})=@y2 THEN ISNULL(h.SumOrdQty,0) ELSE 0 END) as y2Qty
      FROM OrdHD h LEFT JOIN GMCust c ON c.CustCode=h.CustCode
      WHERE ${where} AND YEAR(h.${dateCol}) IN (@y1,@y2)
      GROUP BY h.CustCode, c.CustName
      ORDER BY SUM(CASE WHEN YEAR(h.${dateCol})=@y1 THEN 1 ELSE 0 END) DESC
    `);
}

async function fetchSalesSummary(pool, years) {
  const yearParams = years.map((_, i) => `@y${i}`).join(',');
  const request = pool.request();
  years.forEach((y, i) => request.input(`y${i}`, sql.Int, y));

  const query = `
    SELECT
      e.SalesName AS id,
      e.SalesName AS name,
      MAX(e.EmpType) AS empType,
      MAX(e.SalesLV) AS salesLv,
      YEAR(h.OrdDate) AS yr,
      SUM(ISNULL(h.SumOrdExchAmnt, 0)) AS totalSales
    FROM OrdHD h
    JOIN GMCust c ON h.CustCode = c.CustCode
    JOIN GMEmp e ON c.SalesName = e.SalesName
    WHERE YEAR(h.OrdDate) IN (${yearParams})
      AND h.OrdStatus IN ('P','N','C') AND h.CloseStatus <> 'Y' -- Adjust as needed
    GROUP BY e.SalesName, YEAR(h.OrdDate)
  `;
  return request.query(query);
}

module.exports = {
  fetchStatsResult,
  fetchWeekResult,
  fetchAvgResult,
  fetchMonthResult,
  fetchYoyResult,
  fetchTrendResult,
  fetchProcessResult,
  fetchMaterialResult,
  fetchKindResult,
  fetchCustomerResult,
  fetchDelayResult,
  fetchRecentResult,
  fetchStoneFindingResult,
  fetchWipResult,
  fetchOverdueResult,
  fetchDeptResult,
  fetchTimelineResult,
  fetchHolidayResult,
  fetchCllPipelineResult,
  fetchFbePipelineResult,
  fetchYearsResult,
  fetchTodayActual,
  fetchTodayLast7DaysWorkData,
  fetchCardMonthly,
  fetchCardCustomerBreakdown,
  fetchSalesSummary,
};
