// ═══════════════════════════════════════════════════════════════════════════════
// 📌 SERVICE: Production Dashboard Data & Orchestration Layer
// ═══════════════════════════════════════════════════════════════════════════════
// Extracts database query logic and business orchestration out of the Express routes.
// ═══════════════════════════════════════════════════════════════════════════════

const { getPool, sql } = require('../db');
const queries = require('../queries/productionDashboardQueries');
const {
  calculateCllPipeline,
  calculateFbePipeline,
  findBottleneckStageName,
} = require('./productionPipelineCalculation');

// ─── Detail Cache (TTL 10 นาที) ──────────────────────────────────────────────
const detailCache = new Map();
const DETAIL_TTL = 10 * 60 * 1000;

function getDC(k) {
  const e = detailCache.get(k);
  if (!e) return null;
  if (Date.now() > e.ex) {
    detailCache.delete(k);
    return null;
  }
  return e.d;
}

function setDC(k, d) {
  detailCache.set(k, { d, ex: Date.now() + DETAIL_TTL });
}

/**
 * Helper to get a configured DB request with common dates
 * Preserved for backward compatibility
 */
async function getConfiguredRequest(selectedYear) {
  const pool = await getPool();
  const activeYear = selectedYear || new Date().getFullYear();
  let refDate = new Date();
  if (selectedYear && selectedYear < new Date().getFullYear()) {
    refDate = new Date(selectedYear, 11, 31);
  }

  return pool.request()
    .input('year', sql.Int, selectedYear)
    .input('activeYear', sql.Int, activeYear)
    .input('refDate', sql.Date, refDate);
}

/**
 * Fetch and assemble all data for the Main Production Dashboard
 * @param {Object} options
 * @param {string|number|null} options.yearParam
 * @param {string} options.facilityParam
 * @returns {Promise<Object>}
 */
async function getMainDashboardData({ yearParam, facilityParam }) {
  const pool = await getPool();

  const selectedYear = (yearParam && yearParam !== 'all') ? parseInt(yearParam, 10) : null;
  const activeYear = selectedYear || new Date().getFullYear();

  let refDate = new Date();
  if (selectedYear && selectedYear < new Date().getFullYear()) {
    refDate = new Date(selectedYear, 11, 31);
  }

  const getReq = () => pool.request()
    .input('year', sql.Int, selectedYear)
    .input('activeYear', sql.Int, activeYear)
    .input('refDate', sql.Date, refDate);

  // 1. STAT CARDS
  const statsResult = await queries.fetchStatsResult(getReq);
  const s = statsResult.recordset[0];

  const weekResult = await queries.fetchWeekResult(getReq);
  const w = weekResult.recordset[0];
  const weekChange = w.lastWeek > 0 ? Math.round(((w.thisWeek - w.lastWeek) / w.lastWeek) * 100) : 0;

  const avgResult = await queries.fetchAvgResult(getReq);
  const avg7Days = avgResult.recordset[0]?.avgOrders || 0;

  const monthResult = await queries.fetchMonthResult(getReq);
  const m = monthResult.recordset[0];

  const yoyResult = await queries.fetchYoyResult(getReq);
  const y = yoyResult.recordset[0];
  const pct = (now, ly) => ly > 0 ? Math.round(((now - ly) / ly) * 100) : (now > 0 ? 100 : 0);

  const statCards = [
    {
      label: 'Orders Today', value: s.ordersToday, change: '', trend: 'up',
      yoyPct: null, yoyLabel: ''
    },
    {
      label: 'Completed', value: s.completed, change: '', trend: 'good',
      yoyPct: pct(y.compNow, y.compLY), yoyLabel: 'vs last year'
    },
    {
      label: 'Work In Progress', value: s.wip, change: `${weekChange >= 0 ? '+' : ''}${weekChange}% vs last week`, trend: weekChange >= 0 ? 'up' : 'down',
      yoyPct: null, yoyLabel: ''
    },
    {
      label: 'Overdue', value: s.delay, change: '', trend: 'bad', isAlert: s.delay > 0,
      yoyPct: null, yoyLabel: ''
    },
    {
      label: 'This Month', value: m.ordCount, change: `${(m.totalQty || 0).toLocaleString()} pcs`, trend: 'up',
      yoyPct: pct(y.monthNow, y.monthLY), yoyLabel: 'vs last year'
    },
  ];

  // 2. 7-DAY ORDER TREND
  const trendResult = await queries.fetchTrendResult(getReq);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const orderTrend = trendResult.recordset.map(r => ({
    day: dayNames[new Date(r.dt).getDay()],
    date: new Date(r.dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: r.cnt,
  }));

  // 3. PROCESS DISTRIBUTION
  const procResult = await queries.fetchProcessResult(getReq);
  const p = procResult.recordset[0];
  const processDistribution = {
    total: p.total,
    segments: [
      { label: 'Casting', value: p.casting },
      { label: 'Grinding', value: p.grinding },
      { label: 'Polishing', value: p.polishing },
      { label: 'Plating', value: p.plating },
      { label: 'QC', value: p.qc },
      { label: 'Packing', value: p.packing },
    ],
  };

  // 4. MATERIAL BREAKDOWN
  const matResult = await queries.fetchMaterialResult(getReq);
  const materialBreakdown = matResult.recordset.map(r => ({
    material: r.material === 'B' ? 'Brass' : r.material === 'S' ? 'Silver' : r.material === 'T' ? 'Tin' : r.material === 'Other' ? 'Other (Accessories / Tin)' : r.material,
    code: r.material,
    orders: r.cnt,
    qty: r.totalQty,
  }));

  // 5. ORDER TYPE
  const kindResult = await queries.fetchKindResult(getReq);
  const orderTypes = kindResult.recordset.map(r => ({
    type: r.kind === 'NEW' ? 'New Order' : r.kind === 'REP' ? 'Replenishment' : r.kind,
    count: r.cnt,
  }));

  // 6. TOP CUSTOMERS
  const custResult = await queries.fetchCustomerResult(getReq);
  const topCustomers = custResult.recordset.map(r => ({
    code: r.CustCode,
    name: r.custName,
    orders: r.orderCount,
    qty: r.totalQty,
  }));

  // 7. CRITICAL DELAY ORDERS
  const delayResult = await queries.fetchDelayResult(getReq);
  const delayOrders = delayResult.recordset.map(r => ({
    ordNo: r.OrdNo,
    poNo: r.PONo || '—',
    custCode: r.CustCode,
    custName: r.custName,
    dueDate: r.DueDate,
    delayDays: r.delayDays,
    qty: r.qty,
    proFac: r.ProFac,
  }));

  // 8. RECENT ORDERS
  const recentResult = await queries.fetchRecentResult(getReq);
  const recentOrders = recentResult.recordset.map(r => ({
    ordNo: r.OrdNo,
    poNo: r.PONo || '—',
    custCode: r.CustCode,
    ordDate: r.OrdDate,
    material: r.OrdMat === 'B' ? 'Brass' : r.OrdMat === 'S' ? 'Silver' : r.OrdMat || '—',
    type: r.OrdKind === 'NEW' ? 'New' : r.OrdKind === 'REP' ? 'Replen' : r.OrdKind || '—',
    qty: r.qty,
    status: r.status,
  }));

  // 9. STONE & FINDING SUMMARY
  const sfResult = await queries.fetchStoneFindingResult(getReq);
  const sf = sfResult.recordset[0];
  const stoneFindings = {
    totalItems: sf.totalItems,
    stone: { pending: sf.stonePendingItems, done: sf.stoneDoneItems, pendingQty: sf.stonePendingQty },
    finding: { pending: sf.findingPendingItems, done: sf.findingDoneItems, pendingQty: sf.findingPendingQty },
  };

  // 10. EXECUTIVE COCKPIT DATA
  const normalizedFacilityParam = (facilityParam || 'ALL').toUpperCase();
  const activeFacility = ['FBE', 'CLL'].includes(normalizedFacilityParam) ? normalizedFacilityParam : 'ALL';

  // Active WIP from OrdHD grouped by Facility
  const wipResult = await queries.fetchWipResult(pool, selectedYear);
  let fbeWip = { orders: 0, pcs: 0 };
  let cllWip = { orders: 0, pcs: 0 };
  for (const row of wipResult.recordset) {
    if (row.Fac === 'FBE') {
      fbeWip = { orders: row.wipOrders || 0, pcs: row.wipPcs || 0 };
    } else {
      cllWip = { orders: row.wipOrders || 0, pcs: row.wipPcs || 0 };
    }
  }
  const totalWipOrders = fbeWip.orders + cllWip.orders;
  const totalWipPcs = fbeWip.pcs + cllWip.pcs;

  // Overdue Orders from OrdHD grouped by Facility
  const overdueResult = await queries.fetchOverdueResult(pool, selectedYear);
  let fbeOverdue = { count: 0, pcs: 0 };
  let cllOverdue = { count: 0, pcs: 0 };
  for (const row of overdueResult.recordset) {
    if (row.Fac === 'FBE') {
      fbeOverdue = { count: row.overdueCount || 0, pcs: row.overduePcs || 0 };
    } else {
      cllOverdue = { count: row.overdueCount || 0, pcs: row.overduePcs || 0 };
    }
  }
  const totalOverdueCount = fbeOverdue.count + cllOverdue.count;
  const totalOverduePcs = fbeOverdue.pcs + cllOverdue.pcs;

  // 11 Departments Combined Output FBE vs CLL
  const deptResult = await queries.fetchDeptResult(pool, selectedYear);
  const timelineResult = await queries.fetchTimelineResult(pool, selectedYear);

  // Working days for average run rate
  const holidayRes = await queries.fetchHolidayResult(pool, selectedYear || activeYear);
  const holidays = holidayRes.recordset[0]?.HolidayCount || 0;
  const workdays = Math.max(1, 313 - holidays); // ~313 non-Sunday days per year

  // CLL Dual-Lane Pipeline
  const cllPipelineRes = await queries.fetchCllPipelineResult(pool, selectedYear);
  const cllPipelineStages = calculateCllPipeline(cllPipelineRes.recordset, cllWip.pcs);

  // FBE Dual-Lane Pipeline
  const fbePipelineRes = await queries.fetchFbePipelineResult(pool, selectedYear);
  const fbePipelineStages = calculateFbePipeline(fbePipelineRes.recordset, fbeWip.pcs);

  // Aggregates for KPI Strip
  const fbeTotalPcs = deptResult.recordset.reduce((acc, r) => acc + (r.FbePcs || 0), 0);
  const cllTotalPcs = deptResult.recordset.reduce((acc, r) => acc + (r.CllPcs || 0), 0);
  const grandFactoryPcs = fbeTotalPcs + cllTotalPcs;
  const fbeSharePct = grandFactoryPcs > 0 ? Math.round((fbeTotalPcs / grandFactoryPcs) * 100) : 0;
  const cllSharePct = grandFactoryPcs > 0 ? (100 - fbeSharePct) : 0;
  const dailyAvgOutput = Math.round(grandFactoryPcs / workdays);
  const onTimeRate = s.wip > 0 ? Math.max(0, Math.round(((s.wip - totalOverdueCount) / s.wip) * 100)) : 100;

  // Monthly Timeline Array (1..12)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const timeline = monthNames.map((mName, idx) => {
    const mNum = idx + 1;
    const found = timelineResult.recordset.find(r => r.MonthNum === mNum);
    const fbe = found?.FbePcs || 0;
    const cll = found?.CllPcs || 0;
    const total = fbe + cll;
    return {
      month: mNum,
      label: mName,
      fbe,
      cll,
      total,
      dailyAvg: Math.round(total / 26),
    };
  });

  // Pipeline Stages based on active facility filter
  const pipeline = activeFacility === 'FBE' ? fbePipelineStages : cllPipelineStages;

  // Dual-Lane Bundle
  const dualPipeline = {
    cll: {
      facility: 'CLL',
      facilityName: 'CLL Facility (Bangna)',
      wipPcs: cllWip.pcs,
      wipOrders: cllWip.orders,
      bottleneckStage: findBottleneckStageName(cllPipelineStages, 'Casting Process'),
      stages: cllPipelineStages,
    },
    fbe: {
      facility: 'FBE',
      facilityName: 'FBE Facility (Bangplee)',
      wipPcs: fbeWip.pcs,
      wipOrders: fbeWip.orders,
      bottleneckStage: findBottleneckStageName(fbePipelineStages, 'QC Inspection'),
      stages: fbePipelineStages,
    },
  };

  // Department matrix with calculated daily averages and share
  const departments = deptResult.recordset.map(d => ({
    code: d.Dept,
    name: d.DeptName,
    seq: d.Seq,
    fbePcs: d.FbePcs || 0,
    cllPcs: d.CllPcs || 0,
    totalPcs: d.TotalPcs || 0,
    sharePct: grandFactoryPcs > 0 ? Math.round((d.TotalPcs / grandFactoryPcs) * 100) : 0,
    dailyAvg: Math.round((d.TotalPcs || 0) / workdays),
  }));

  // Customer volume share (Top 5)
  const currentWipPcs = activeFacility === 'FBE' ? fbeWip.pcs : (activeFacility === 'CLL' ? cllWip.pcs : totalWipPcs);
  const customerShare = (topCustomers || []).slice(0, 5).map(c => ({
    code: c.code,
    name: c.name,
    orders: c.orders,
    qty: c.qty,
    sharePct: currentWipPcs > 0 ? Math.min(100, Math.round((c.qty / currentWipPcs) * 100)) : 0,
  }));

  // Top 5 critical overdue orders with accurate facility identification & filter
  const filteredDelayOrders = (delayOrders || []).filter(o => {
    const fac = (o.proFac === 'FBD' || o.proFac === 'FBE') ? 'FBE' : 'CLL';
    if (activeFacility === 'ALL') return true;
    return fac === activeFacility;
  });

  const topOverdueOrders = filteredDelayOrders.slice(0, 5).map(o => ({
    ordNo: o.ordNo,
    poNo: o.poNo,
    custCode: o.custCode,
    dueDate: o.dueDate,
    delayDays: o.delayDays,
    qty: o.qty,
    facility: (o.proFac === 'FBD' || o.proFac === 'FBE') ? 'FBE' : 'CLL',
  }));

  // Executive Cockpit Bundle
  const cockpit = {
    facility: activeFacility,
    kpi: {
      totalWipPcs: activeFacility === 'FBE' ? fbeWip.pcs : (activeFacility === 'CLL' ? cllWip.pcs : totalWipPcs),
      totalWipOrders: activeFacility === 'FBE' ? fbeWip.orders : (activeFacility === 'CLL' ? cllWip.orders : totalWipOrders),
      fbeOutputPcs: fbeTotalPcs,
      fbeShare: fbeSharePct,
      cllOutputPcs: cllTotalPcs,
      cllShare: cllSharePct,
      dailyRunRate: activeFacility === 'FBE' ? Math.round(fbeTotalPcs / workdays) : (activeFacility === 'CLL' ? Math.round(cllTotalPcs / workdays) : dailyAvgOutput),
      activeWorkdays: workdays,
      overdueCount: activeFacility === 'FBE' ? fbeOverdue.count : (activeFacility === 'CLL' ? cllOverdue.count : totalOverdueCount),
      overduePcs: activeFacility === 'FBE' ? fbeOverdue.pcs : (activeFacility === 'CLL' ? cllOverdue.pcs : totalOverduePcs),
      onTimeRate,
    },
    timeline,
    pipeline,
    dualPipeline,
    departments,
    customerShare,
    overdueOrders: topOverdueOrders,
  };

  return {
    cockpit,
    statCards,
    orderTrend,
    processDistribution,
    materialBreakdown,
    orderTypes,
    topCustomers,
    delayOrders,
    recentOrders,
    stoneFindings,
  };
}

/**
 * Fetch available years for dashboard filters
 * @returns {Promise<Object>}
 */
async function getDashboardYears() {
  const cached = getDC('years');
  if (cached && Array.isArray(cached.years)) {
    return { ok: true, years: cached.years, firstDataYear: cached.firstDataYear ?? null };
  }

  const pool = await getPool();
  const result = await queries.fetchYearsResult(pool);

  let years = (result.recordsets?.[0] || []).map(row => row.yr);
  const firstDataYear = result.recordsets?.[1]?.[0]?.firstDataYear || years[years.length - 1] || null;

  if (years.length > 6) {
    years = years.slice(0, 6);
  }
  years.sort((a, b) => a - b);

  const payload = { years, firstDataYear };
  setDC('years', payload);
  return { ok: true, ...payload };
}

/**
 * Fetch detail drill-down data comparing year1 vs year2
 * @param {Object} options
 * @param {string} options.cardType 'today' | 'completed' | 'wip' | 'overdue' | 'month'
 * @param {number|string} options.year1Param
 * @param {number|string} options.year2Param
 * @returns {Promise<Object>}
 */
async function getCardDetailData({ cardType, year1Param, year2Param }) {
  const year1 = parseInt(year1Param, 10) || new Date().getFullYear();
  const year2 = parseInt(year2Param, 10) || year1 - 1;

  const cacheKey = `detail:${cardType}:${year1}:${year2}`;
  const cached = getDC(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return cached;
  }

  console.log(`[DETAIL] ${cardType} ${year1} vs ${year2}`);
  const pool = await getPool();

  if (cardType === 'today') {
    // 1) Fetch today's actual orders and quantity
    const todayRes = await queries.fetchTodayActual(pool);
    const t = todayRes.recordset[0];
    const todayTotal = t?.cnt || 0;
    const todayQty = t?.qty || 0;

    // 2) Fetch the last 7 working days
    const daysRes = await queries.fetchTodayLast7DaysWorkData(pool);
    const daysData = daysRes.recordset;
    const sumOrders = daysData.reduce((sum, d) => sum + d.OrderCount, 0);
    const sumQty = daysData.reduce((sum, d) => sum + d.TotalQty, 0);
    const avgOrders = daysData.length > 0 ? Math.round(sumOrders / daysData.length) : 0;
    const avgQty = daysData.length > 0 ? Math.round(sumQty / daysData.length) : 0;

    // Map to monthly-like structure for frontend chart compatibility
    const monthly = daysData.map((d, index) => {
      const formattedDate = new Date(d.WorkDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      return {
        month: index + 1,
        label: `${d.DayName.substring(0, 3)} ${formattedDate}`,
        year1: d.OrderCount,
        year1Qty: d.TotalQty,
        year2: avgOrders,
        year2Qty: avgQty,
        isFuture: false,
      };
    });

    // Map to breakdown structure for frontend table compatibility
    const breakdown = daysData.map(d => {
      const dateStr = new Date(d.WorkDate).toISOString().split('T')[0];
      const pctDiff = avgOrders > 0 ? +(((d.OrderCount - avgOrders) / avgOrders) * 100).toFixed(1) : 0;
      return {
        code: dateStr,
        name: d.DayName,
        year1: d.OrderCount,
        year2: avgOrders,
        year1Qty: d.TotalQty,
        year2Qty: avgQty,
        changePct: pctDiff,
      };
    });

    const response = {
      ok: true,
      cardType,
      year1,
      year2,
      summary: {
        year1Total: todayTotal,
        year2Total: avgOrders,
        year1Qty: todayQty,
        year2Qty: avgQty,
        changePct: avgOrders > 0 ? +(((todayTotal - avgOrders) / avgOrders) * 100).toFixed(1) : (todayTotal > 0 ? 100 : 0),
      },
      monthly,
      breakdown,
    };

    setDC(cacheKey, response);
    return response;
  }

  const curMonth = new Date().getMonth() + 1;
  const curYear = new Date().getFullYear();
  const ML = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let where;
  let dateCol = 'OrdDate';
  switch (cardType) {
    case 'month':
      where = "((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))";
      break;
    case 'completed':
      where = "(h.CloseStatus = 'Y' OR h.OrdStatus = 'C') AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))";
      break;
    case 'wip':
      where = "h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y' AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))";
      break;
    case 'overdue':
      where = "h.DueDate < CAST(GETDATE() AS DATE) AND h.OrdStatus IN ('P','N') AND h.CloseStatus <> 'Y' AND ((h.PONo IS NULL OR UPPER(h.PONo) NOT LIKE '%SAMPLE%') AND LEFT(h.OrdNo, 3) IN ('BBC','BBQ','BBD','BBI','BBF','BBP','BBT','BBX','BBK','BBR','BBL','BBS','BBE'))";
      dateCol = 'DueDate';
      break;
    default: {
      const err = new Error('Invalid cardType');
      err.statusCode = 400;
      throw err;
    }
  }

  // 1) Monthly counts for both years
  const mR = await queries.fetchCardMonthly(pool, { where, dateCol, year1, year2 });

  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const d1 = mR.recordset.find(r => r.yr === year1 && r.m === m);
    const d2 = mR.recordset.find(r => r.yr === year2 && r.m === m);
    const isFuture = year1 === curYear && m > curMonth;
    monthly.push({
      month: m,
      label: ML[m - 1],
      isFuture,
      year1: isFuture ? null : (d1?.cnt || 0),
      year1Qty: isFuture ? null : (d1?.qty || 0),
      year2: d2?.cnt || 0,
      year2Qty: d2?.qty || 0,
    });
  }

  // 2) Summary totals
  const y1T = monthly.reduce((sTotal, item) => sTotal + (item.year1 || 0), 0);
  const y2T = monthly.reduce((sTotal, item) => sTotal + item.year2, 0);
  const y1Q = monthly.reduce((sTotal, item) => sTotal + (item.year1Qty || 0), 0);
  const y2Q = monthly.reduce((sTotal, item) => sTotal + item.year2Qty, 0);

  // 3) Customer breakdown (top 10)
  const bR = await queries.fetchCardCustomerBreakdown(pool, { where, dateCol, year1, year2 });

  const breakdown = bR.recordset.map(r => ({
    code: r.CustCode,
    name: r.custName,
    year1: r.y1Cnt,
    year2: r.y2Cnt,
    year1Qty: r.y1Qty,
    year2Qty: r.y2Qty,
    changePct: r.y2Cnt > 0 ? +((r.y1Cnt - r.y2Cnt) / r.y2Cnt * 100).toFixed(1) : (r.y1Cnt > 0 ? 100 : 0),
  }));

  const response = {
    ok: true,
    cardType,
    year1,
    year2,
    summary: {
      year1Total: y1T,
      year2Total: y2T,
      year1Qty: y1Q,
      year2Qty: y2Q,
      changePct: y2T > 0 ? +((y1T - y2T) / y2T * 100).toFixed(1) : 0,
    },
    monthly,
    breakdown,
  };
  setDC(cacheKey, response);
  return response;
}

/**
 * Fetch sales summary grouped by Sales Rep and Year
 * @param {string} yearsQuery
 * @returns {Promise<Object>}
 */
async function getSalesSummaryData(yearsQuery) {
  const pool = await getPool();
  let years = (yearsQuery || '').split(',').map(y => parseInt(y, 10)).filter(y => !isNaN(y));
  if (years.length > 6) {
    years = years.sort((a, b) => a - b).slice(-6);
  }

  if (years.length === 0) years.push(new Date().getFullYear());

  const result = await queries.fetchSalesSummary(pool, years);

  // Format data into the structure expected by frontend
  const salesMap = {};
  result.recordset.forEach(row => {
    if (!salesMap[row.id]) {
      salesMap[row.id] = {
        id: row.id,
        name: row.name,
        empType: row.empType,
        salesLv: row.salesLv,
        data: {},
      };
    }
    salesMap[row.id].data[row.yr.toString()] = row.totalSales;
  });

  const data = Object.values(salesMap).sort((a, b) => {
    const lastYr = Math.max(...years).toString();
    return (b.data[lastYr] || 0) - (a.data[lastYr] || 0);
  });

  return { ok: true, data };
}

module.exports = {
  getConfiguredRequest,
  getMainDashboardData,
  getDashboardYears,
  getCardDetailData,
  getSalesSummaryData,
  getDC,
  setDC,
};
