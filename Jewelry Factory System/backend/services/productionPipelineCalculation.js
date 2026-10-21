/**
 * Production Pipeline & Bottleneck Calculation Service
 * Pure application-layer calculations (Zero-DB, No Express, No UI dependencies)
 * Extracts and characterizes logic from productionDashboard.js and LEGACY_PCC_SYSTEM_ARCHITECTURE.md
 */

/**
 * Calculate CLL Facility 7-stage production pipeline
 * @param {Array<{Stage: string, StagePcs: number, LineCount: number}>} cllStageRows
 * @param {number} cllWipPcs
 * @returns {Array<Object>}
 */
function calculateCllPipeline(cllStageRows, cllWipPcs = 0) {
  const cllStageMap = {};
  for (const r of cllStageRows || []) {
    cllStageMap[r.Stage] = { pcs: r.StagePcs || 0, count: r.LineCount || 0 };
  }

  const cllRawStages = [
    { id: 'wax', name: 'Wax & Prep', pcs: cllStageMap['WAX']?.pcs || 0, orderCount: cllStageMap['WAX']?.count || 0 },
    { id: 'cast', name: 'Casting Process', pcs: cllStageMap['CAST']?.pcs || 0, orderCount: cllStageMap['CAST']?.count || 0 },
    { id: 'grind', name: 'Filing & Grind', pcs: cllStageMap['GRIND']?.pcs || 0, orderCount: cllStageMap['GRIND']?.count || 0 },
    { id: 'polish', name: 'Pre-Polishing', pcs: cllStageMap['POLISH']?.pcs || 0, orderCount: cllStageMap['POLISH']?.count || 0 },
    { id: 'plate', name: 'Plating Process', pcs: cllStageMap['PLATE']?.pcs || 0, orderCount: cllStageMap['PLATE']?.count || 0 },
    { id: 'qc', name: 'In-line QC', pcs: cllStageMap['QC']?.pcs || 0, orderCount: cllStageMap['QC']?.count || 0 },
    { id: 'pack', name: 'Final Packing', pcs: cllStageMap['PACK']?.pcs || 0, orderCount: cllStageMap['PACK']?.count || 0 },
  ];
  const maxCllPcs = Math.max(...cllRawStages.map(s => s.pcs), 1);
  return cllRawStages.map(stg => ({
    ...stg,
    isBottleneck: stg.pcs === maxCllPcs && stg.pcs > 0,
    sharePct: cllWipPcs > 0 ? Math.round((stg.pcs / cllWipPcs) * 100) : 0,
  }));
}

/**
 * Calculate FBE Facility 7-stage dual-lane pipeline
 * @param {Array<{Stage: string, Pcs: number, OrderCount: number}>} fbeStageRows
 * @param {number} fbeWipPcs
 * @returns {Array<Object>}
 */
function calculateFbePipeline(fbeStageRows, fbeWipPcs = 0) {
  const fbeStageMap = {};
  for (const r of fbeStageRows || []) {
    fbeStageMap[r.Stage] = { pcs: r.Pcs || 0, count: r.OrderCount || 0 };
  }

  const fbeRawStages = [
    { id: 'prep', name: 'Prep & Queue', pcs: fbeStageMap['PREP']?.pcs || 0, orderCount: fbeStageMap['PREP']?.count || 0 },
    { id: 'gr_tb', name: 'Grind & Tumbling', pcs: (fbeStageMap['GR']?.pcs || 0) + (fbeStageMap['TB']?.pcs || 0), orderCount: (fbeStageMap['GR']?.count || 0) + (fbeStageMap['TB']?.count || 0) },
    { id: 'fl_lp', name: 'Filing & Lapping', pcs: (fbeStageMap['FL']?.pcs || 0) + (fbeStageMap['LP']?.pcs || 0), orderCount: (fbeStageMap['FL']?.count || 0) + (fbeStageMap['LP']?.count || 0) },
    { id: 'as_ls', name: 'Assembly & Laser', pcs: (fbeStageMap['AS']?.pcs || 0) + (fbeStageMap['LS']?.pcs || 0), orderCount: (fbeStageMap['AS']?.count || 0) + (fbeStageMap['LS']?.count || 0) },
    { id: 'pl', name: 'Polishing', pcs: fbeStageMap['PL']?.pcs || 0, orderCount: fbeStageMap['PL']?.count || 0 },
    { id: 'cp_pt', name: 'Plating Process', pcs: (fbeStageMap['CP']?.pcs || 0) + (fbeStageMap['PT']?.pcs || 0), orderCount: (fbeStageMap['CP']?.count || 0) + (fbeStageMap['PT']?.count || 0) },
    { id: 'iq', name: 'QC Inspection', pcs: fbeStageMap['IQ']?.pcs || 0, orderCount: fbeStageMap['IQ']?.count || 0 },
  ];
  const maxFbePcs = Math.max(...fbeRawStages.map(s => s.pcs), 1);
  return fbeRawStages.map(stg => ({
    ...stg,
    isBottleneck: stg.pcs === maxFbePcs && stg.pcs > 0,
    sharePct: fbeWipPcs > 0 ? Math.round((stg.pcs / fbeWipPcs) * 100) : 0,
  }));
}

/**
 * Calculate KPI aggregates, on-time rate, and 12-month timeline array
 * @param {Object} params
 * @returns {Object}
 */
function calculatePipelineSummary({
  deptRows = [],
  workdays = 26,
  wipCount = 0,
  totalOverdueCount = 0,
  timelineRows = [],
} = {}) {
  const fbeTotalPcs = (deptRows || []).reduce((acc, r) => acc + (r.FbePcs || 0), 0);
  const cllTotalPcs = (deptRows || []).reduce((acc, r) => acc + (r.CllPcs || 0), 0);
  const grandFactoryPcs = fbeTotalPcs + cllTotalPcs;
  const fbeSharePct = grandFactoryPcs > 0 ? Math.round((fbeTotalPcs / grandFactoryPcs) * 100) : 0;
  const cllSharePct = grandFactoryPcs > 0 ? (100 - fbeSharePct) : 0;
  const dailyAvgOutput = Math.round(grandFactoryPcs / (workdays || 26));
  const onTimeRate = (wipCount || 0) > 0
    ? Math.max(0, Math.round((((wipCount || 0) - (totalOverdueCount || 0)) / (wipCount || 0)) * 100))
    : 100;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const timeline = monthNames.map((mName, idx) => {
    const mNum = idx + 1;
    const found = (timelineRows || []).find(r => r.MonthNum === mNum);
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

  return {
    fbeTotalPcs,
    cllTotalPcs,
    grandFactoryPcs,
    fbeSharePct,
    cllSharePct,
    dailyAvgOutput,
    onTimeRate,
    timeline,
  };
}

/**
 * Find the bottleneck stage name from a stages array, falling back to a default
 * @param {Array<Object>} stages
 * @param {string} fallbackName
 * @returns {string}
 */
function findBottleneckStageName(stages, fallbackName = 'Process') {
  return (stages || []).find(s => s.isBottleneck)?.name || fallbackName;
}

/**
 * Calculate Stage Delta WIP according to Legacy PCC Architecture
 * (Formula from Section 6 of LEGACY_PCC_SYSTEM_ARCHITECTURE.md)
 * @param {Object} item
 * @returns {Object}
 */
function calculateStageDelta(item = {}) {
  const itemQty = Number(item.ItemQty || 0);
  const castQty = Number(item.CastQty || 0);
  const grindQty = Number(item.GrindQty || 0);
  const polishQty = Number(item.PolishQty || 0);
  const plateQty = Number(item.PlateQty || 0);
  const qcQty = Number(item.QCQty || 0);
  const finishQty = Number(item.FinishQty || 0);

  const grindPenQty = castQty === itemQty ? grindQty - castQty : grindQty - itemQty;
  const polishPenQty = grindQty === itemQty ? polishQty - grindQty : polishQty - itemQty;
  const platePenQty = polishQty === itemQty ? plateQty - polishQty : plateQty - itemQty;
  const qcPenQty = plateQty === itemQty ? qcQty - plateQty : qcQty - itemQty;
  const unFinishQty = finishQty - itemQty;

  return {
    grindPenQty,
    polishPenQty,
    platePenQty,
    qcPenQty,
    unFinishQty,
  };
}

module.exports = {
  calculateCllPipeline,
  calculateFbePipeline,
  calculatePipelineSummary,
  findBottleneckStageName,
  calculateStageDelta,
};
