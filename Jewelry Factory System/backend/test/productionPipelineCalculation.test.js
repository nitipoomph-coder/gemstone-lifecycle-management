const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  calculateCllPipeline,
  calculateFbePipeline,
  calculatePipelineSummary,
  findBottleneckStageName,
  calculateStageDelta,
} = require('../services/productionPipelineCalculation');

describe('Production Pipeline Calculation Characterization Tests', () => {
  describe('calculateCllPipeline', () => {
    test('calculates 7 stages, marks bottleneck and computes share percentages', () => {
      const rows = [
        { Stage: 'WAX', StagePcs: 100, LineCount: 5 },
        { Stage: 'CAST', StagePcs: 300, LineCount: 12 },
        { Stage: 'GRIND', StagePcs: 150, LineCount: 8 },
        { Stage: 'POLISH', StagePcs: 200, LineCount: 10 },
        { Stage: 'PLATE', StagePcs: 50, LineCount: 3 },
        { Stage: 'QC', StagePcs: 80, LineCount: 4 },
        { Stage: 'PACK', StagePcs: 120, LineCount: 6 },
      ];
      const cllWipPcs = 1000;
      const stages = calculateCllPipeline(rows, cllWipPcs);

      assert.strictEqual(stages.length, 7);
      const castStage = stages.find(s => s.id === 'cast');
      assert.strictEqual(castStage.pcs, 300);
      assert.strictEqual(castStage.orderCount, 12);
      assert.strictEqual(castStage.isBottleneck, true);
      assert.strictEqual(castStage.sharePct, 30); // 300 / 1000 * 100

      const waxStage = stages.find(s => s.id === 'wax');
      assert.strictEqual(waxStage.isBottleneck, false);
      assert.strictEqual(waxStage.sharePct, 10); // 100 / 1000 * 100
    });

    test('handles empty stage rows gracefully', () => {
      const stages = calculateCllPipeline([], 500);
      assert.strictEqual(stages.length, 7);
      for (const s of stages) {
        assert.strictEqual(s.pcs, 0);
        assert.strictEqual(s.orderCount, 0);
        assert.strictEqual(s.isBottleneck, false);
        assert.strictEqual(s.sharePct, 0);
      }
    });

    test('handles null and undefined input', () => {
      const stages = calculateCllPipeline(null, 0);
      assert.strictEqual(stages.length, 7);
      assert.strictEqual(stages[0].pcs, 0);
      assert.strictEqual(stages[0].sharePct, 0);
      assert.strictEqual(stages[0].isBottleneck, false);
    });

    test('handles zero WIP pcs without division by zero', () => {
      const rows = [{ Stage: 'CAST', StagePcs: 100, LineCount: 2 }];
      const stages = calculateCllPipeline(rows, 0);
      const cast = stages.find(s => s.id === 'cast');
      assert.strictEqual(cast.sharePct, 0);
      assert.strictEqual(cast.isBottleneck, true);
    });

    test('identifies tied bottlenecks if multiple stages share max pcs', () => {
      const rows = [
        { Stage: 'CAST', StagePcs: 250, LineCount: 5 },
        { Stage: 'POLISH', StagePcs: 250, LineCount: 5 },
      ];
      const stages = calculateCllPipeline(rows, 500);
      const cast = stages.find(s => s.id === 'cast');
      const polish = stages.find(s => s.id === 'polish');
      const wax = stages.find(s => s.id === 'wax');

      assert.strictEqual(cast.isBottleneck, true);
      assert.strictEqual(polish.isBottleneck, true);
      assert.strictEqual(wax.isBottleneck, false);
    });
  });

  describe('calculateFbePipeline', () => {
    test('calculates 7 FBE stages and aggregates stage pairs (gr_tb, fl_lp, as_ls, cp_pt)', () => {
      const rows = [
        { Stage: 'PREP', Pcs: 50, OrderCount: 2 },
        { Stage: 'GR', Pcs: 40, OrderCount: 3 },
        { Stage: 'TB', Pcs: 60, OrderCount: 2 }, // gr_tb = 100, count = 5
        { Stage: 'FL', Pcs: 70, OrderCount: 4 },
        { Stage: 'LP', Pcs: 30, OrderCount: 1 }, // fl_lp = 100, count = 5
        { Stage: 'AS', Pcs: 80, OrderCount: 3 },
        { Stage: 'LS', Pcs: 120, OrderCount: 5 }, // as_ls = 200, count = 8 (Bottleneck)
        { Stage: 'PL', Pcs: 90, OrderCount: 4 },
        { Stage: 'CP', Pcs: 25, OrderCount: 1 },
        { Stage: 'PT', Pcs: 35, OrderCount: 2 }, // cp_pt = 60, count = 3
        { Stage: 'IQ', Pcs: 45, OrderCount: 2 },
      ];
      const fbeWipPcs = 645;
      const stages = calculateFbePipeline(rows, fbeWipPcs);

      assert.strictEqual(stages.length, 7);
      const grTb = stages.find(s => s.id === 'gr_tb');
      assert.strictEqual(grTb.pcs, 100);
      assert.strictEqual(grTb.orderCount, 5);

      const asLs = stages.find(s => s.id === 'as_ls');
      assert.strictEqual(asLs.pcs, 200);
      assert.strictEqual(asLs.orderCount, 8);
      assert.strictEqual(asLs.isBottleneck, true);

      const cpPt = stages.find(s => s.id === 'cp_pt');
      assert.strictEqual(cpPt.pcs, 60);
      assert.strictEqual(cpPt.orderCount, 3);
    });

    test('handles empty and null FBE input', () => {
      const stages = calculateFbePipeline([], 0);
      assert.strictEqual(stages.length, 7);
      assert.strictEqual(stages[0].pcs, 0);
      assert.strictEqual(stages[0].isBottleneck, false);
      assert.strictEqual(stages[0].sharePct, 0);
    });
  });

  describe('calculatePipelineSummary', () => {
    test('computes totals, share percentages, daily average and on-time rate', () => {
      const deptRows = [
        { FbePcs: 100, CllPcs: 300 },
        { FbePcs: 200, CllPcs: 400 },
      ];
      const timelineRows = [
        { MonthNum: 1, FbePcs: 150, CllPcs: 350 },
        { MonthNum: 2, FbePcs: 200, CllPcs: 400 },
      ];

      const summary = calculatePipelineSummary({
        deptRows,
        workdays: 25,
        wipCount: 100,
        totalOverdueCount: 15,
        timelineRows,
      });

      assert.strictEqual(summary.fbeTotalPcs, 300);
      assert.strictEqual(summary.cllTotalPcs, 700);
      assert.strictEqual(summary.grandFactoryPcs, 1000);
      assert.strictEqual(summary.fbeSharePct, 30);
      assert.strictEqual(summary.cllSharePct, 70);
      assert.strictEqual(summary.dailyAvgOutput, 40); // 1000 / 25
      assert.strictEqual(summary.onTimeRate, 85); // ((100 - 15) / 100) * 100

      // Timeline check
      assert.strictEqual(summary.timeline.length, 12);
      assert.strictEqual(summary.timeline[0].month, 1);
      assert.strictEqual(summary.timeline[0].label, 'Jan');
      assert.strictEqual(summary.timeline[0].total, 500); // 150 + 350
      assert.strictEqual(summary.timeline[2].label, 'Mar');
      assert.strictEqual(summary.timeline[2].total, 0); // No record in Mar
    });

    test('handles edge case when wipCount is zero', () => {
      const summary = calculatePipelineSummary({ wipCount: 0, totalOverdueCount: 0 });
      assert.strictEqual(summary.onTimeRate, 100);
    });

    test('clamps onTimeRate to 0 when overdue exceeds wipCount', () => {
      const summary = calculatePipelineSummary({ wipCount: 10, totalOverdueCount: 20 });
      assert.strictEqual(summary.onTimeRate, 0);
    });

    test('handles empty inputs with defaults', () => {
      const summary = calculatePipelineSummary({});
      assert.strictEqual(summary.grandFactoryPcs, 0);
      assert.strictEqual(summary.fbeSharePct, 0);
      assert.strictEqual(summary.cllSharePct, 0);
      assert.strictEqual(summary.dailyAvgOutput, 0);
      assert.strictEqual(summary.timeline.length, 12);
    });
  });

  describe('findBottleneckStageName', () => {
    test('returns bottleneck stage name when present', () => {
      const stages = [
        { name: 'Wax & Prep', isBottleneck: false },
        { name: 'Casting Process', isBottleneck: true },
      ];
      assert.strictEqual(findBottleneckStageName(stages, 'Default'), 'Casting Process');
    });

    test('returns fallback name when no stage is bottleneck or array is empty', () => {
      assert.strictEqual(findBottleneckStageName([], 'Fallback'), 'Fallback');
      assert.strictEqual(findBottleneckStageName(null, 'Fallback'), 'Fallback');
      assert.strictEqual(findBottleneckStageName([{ name: 'Wax', isBottleneck: false }], 'Fallback'), 'Fallback');
    });
  });

  describe('calculateStageDelta (Legacy Architecture Formula)', () => {
    test('calculates pending quantities when predecessor equals ItemQty', () => {
      const item = {
        ItemQty: 100,
        CastQty: 100, // Cast completed full lot
        GrindQty: 80,
        PolishQty: 60,
        PlateQty: 40,
        QCQty: 30,
        FinishQty: 25,
      };
      const delta = calculateStageDelta(item);

      // GrindPenQty = GrindQty - CastQty = 80 - 100 = -20
      assert.strictEqual(delta.grindPenQty, -20);
      // PolishPenQty = PolishQty - ItemQty (since GrindQty !== ItemQty) = 60 - 100 = -40
      assert.strictEqual(delta.polishPenQty, -40);
      // PlatePenQty = PlateQty - ItemQty = 40 - 100 = -60
      assert.strictEqual(delta.platePenQty, -60);
      // QCPenQty = QCQty - ItemQty = 30 - 100 = -70
      assert.strictEqual(delta.qcPenQty, -70);
      // UnFinishQty = FinishQty - ItemQty = 25 - 100 = -75
      assert.strictEqual(delta.unFinishQty, -75);
    });

    test('calculates pending quantities when predecessor is not equal to ItemQty', () => {
      const item = {
        ItemQty: 100,
        CastQty: 80, // partial cast
        GrindQty: 50,
        PolishQty: 30,
        PlateQty: 10,
        QCQty: 5,
        FinishQty: 0,
      };
      const delta = calculateStageDelta(item);

      // GrindPenQty = GrindQty - ItemQty = 50 - 100 = -50
      assert.strictEqual(delta.grindPenQty, -50);
      assert.strictEqual(delta.polishPenQty, -70);
      assert.strictEqual(delta.unFinishQty, -100);
    });

    test('handles empty or zero item fields gracefully', () => {
      const delta = calculateStageDelta({});
      assert.strictEqual(delta.grindPenQty, 0);
      assert.strictEqual(delta.polishPenQty, 0);
      assert.strictEqual(delta.platePenQty, 0);
      assert.strictEqual(delta.qcPenQty, 0);
      assert.strictEqual(delta.unFinishQty, 0);
    });
  });
});
