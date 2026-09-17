const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'ProductionSummaryPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const startIdx = content.indexOf('<PageHeader');
if (startIdx === -1) {
  console.log('Could not find PageHeader');
  process.exit(1);
}

// Slice the content to keep only everything before <PageHeader
let newContent = content.substring(0, startIdx);

// Append the fixed PageHeader and body
newContent += `<PageHeader
          breadcrumb={BREADCRUMBS.PRODUCTION_SUMMARY}
          contentLayout="workspace"
          rightContent={
            <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center justify-end gap-3 pr-2">
              <ErpIconButton
                label="Reload data"
                tone="refresh"
                onClick={() => void handleShow()}
                icon={<RefreshCw size={14} className={loading ? 'animate-spin' : undefined} />}
                disabled={loading}
                size="sm"
              />
            </div>
          }
        />
      </div>

      <div className="app-content-frame app-content-frame--workspace app-page-content flex-1 overflow-hidden p-2.5 flex flex-col min-h-0">
        <div className="flex flex-col h-full gap-2 min-h-0">

          <div className="no-print bg-[var(--color-surface-0)] border border-[var(--color-border-light)] rounded-lg p-2.5 flex flex-col gap-3 shadow-sm shrink-0">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <div style={{ width: 180 }}>
                  <CustomSelect
                    value={step}
                    onChange={setStep}
                    options={PRODUCTION_STEPS.map(s => ({ value: s.code, label: \`\${s.nameEN} (\${s.nameTH})\` }))}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <CustomSelect
                    value={mode}
                    onChange={setMode}
                    options={PRODUCTION_MODES.map(m => ({ value: m.key, label: m.label }))}
                  />
                </div>
              </div>
              <div className="w-[1px] h-8 bg-[var(--color-border-light)] shrink-0 self-center" />
              <div className="flex-1 min-w-[300px]">
                <PeriodSetupPanel 
                  periodSetup={periodSetup}
                  availableYears={yearsStr}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <ProductionDashboardSkeleton />
          ) : (
            <>
              {/* กล่องกราฟ (ปรับความHeightเป็น 500px) */}
              <div className="print-chart-box" style={{ height: '500px', width: '100%' }}>
                <ProductionSummaryChart data={data} title={chartTitle} showAvgLine={committed.preset === 'full-year' || committed.preset === 'ytd' || committed.preset === 'custom' || committed.preset === 'week'} />
              </div>

              {/* กล่องตาราง (ใส่ class print-table-box) */}
              <div className="print-table-box shrink-0">
                <ProductionSummaryTable data={data} tab={committed.preset === 'week' ? 'week' : committed.preset === 'month' ? 'month' : committed.preset === 'day' ? 'day' : 'year'} />
              </div>
            </>
          )}

        </div>
      </div>


    </div>
  );
}
`;

fs.writeFileSync(filePath, newContent);
console.log('Fixed PageHeader in ProductionSummaryPage.tsx');
