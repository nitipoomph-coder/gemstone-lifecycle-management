const fs = require('fs');

const filePath = 'd:\\gemstone-lifecycle-management\\Jewelry Factory System\\frontend\\src\\pages\\CustomerDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStart = `<Topbar breadcrumb={summaryBreadcrumb} contentLayout="workspace" hideSearch />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page">

          {/* Header & Control Bar */}
          <div className="sales-summary-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 'var(--erp-text-page)', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: 0, lineHeight: 1.1, margin: 0 }}>
                  {summaryTitle}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={openCustomerSalesAnalysis} style={compactSecondaryButton}><Users size={14} /> Customer Trends</button>
                <button onClick={openCustomerMatrix} style={compactSecondaryButton}><Table2 size={14} /> Matrix</button>
                <button onClick={resetSummaryView} style={compactGhostButton}><RefreshCw size={14} /> Reset</button>
              </div>
            </div>

            {/* Compact Control & Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: '8px 12px' }}>`;

const targetEnd = `              <div style={controlDivider} />
              <div style={controlSection}>
                <span style={controlLabel}>Labels</span>
                <ErpSegmentedControl
                  ariaLabel="Labels toggle"
                  value={showLabels ? 'on' : 'off'}
                  onChange={(v) => setShowLabels(v === 'on')}
                  options={[
                    { value: 'on', label: 'ON' },
                    { value: 'off', label: 'OFF' },
                  ]}
                />
              </div>
            </div>
          </div>`;

const replacementStart = `<Topbar 
        breadcrumb={summaryBreadcrumb} 
        contentLayout="workspace" 
        hideSearch 
        rightContent={
          <div className="sales-gallery-topbar-tools flex min-w-0 flex-1 items-center justify-end gap-2 pr-2" style={{ overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <button onClick={openCustomerSalesAnalysis} style={{
                background: "var(--color-surface-0)", border: "1px solid var(--color-border-light)", borderRadius: 8, padding: "6px 12px",
                fontSize: "0.85rem", fontWeight: 900, color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-display)", boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)"
            }}><Users size={14} /> Trends</button>
            <button onClick={openCustomerMatrix} style={{
                background: "var(--color-surface-0)", border: "1px solid var(--color-border-light)", borderRadius: 8, padding: "6px 12px",
                fontSize: "0.85rem", fontWeight: 900, color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-display)", boxShadow: "0 2px 4px color-mix(in srgb, var(--color-surface-900) 3%, transparent)"
            }}><Table2 size={14} /> Matrix</button>
            <div style={{ width: 1, height: 24, background: 'var(--color-border-light)', margin: '0 4px' }} />`;

const replacementEnd = `            <div style={{ width: 1, height: 24, background: 'var(--color-border-light)', margin: '0 4px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-surface-0)', border: '1px solid var(--color-border-light)', borderRadius: 8, padding: 4 }}>
              <ErpSegmentedControl ariaLabel="Metric" value={metric} onChange={(v) => switchMetric(v as Metric)}
                options={[ { value: 'amount', label: 'Sales' }, { value: 'qty', label: 'Qty' } ]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="View" value={mode} onChange={(v) => setMode(v as 'yearly' | 'monthly')}
                options={[ { value: 'yearly', label: 'Year' }, { value: 'monthly', label: 'Month' } ]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="Series" value={monthlySeries} onChange={(v) => setMonthlySeries(v as 'year' | 'group')}
                options={[ { value: 'year', label: 'By Year' }, { value: 'group', label: 'By Group' } ]} />
              <div style={{ width: 1, height: 16, background: 'var(--color-border-light)' }} />
              <ErpSegmentedControl ariaLabel="Labels" value={showLabels ? 'on' : 'off'} onChange={(v) => setShowLabels(v === 'on')}
                options={[ { value: 'on', label: 'Label ON' }, { value: 'off', label: 'Label OFF' } ]} />
            </div>

            <button onClick={resetSummaryView} style={{
                background: "var(--color-surface-0)", border: "1px solid var(--color-border-light)", borderRadius: 8, padding: "8px", 
                color: "var(--color-text-tertiary)", cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><RefreshCw size={14} /></button>
          </div>
        }
      />
      <div className="content-scrollbar flex-1 overflow-y-auto" style={{ background: 'var(--color-surface-1)' }}>
        <div className="app-content-frame app-content-frame--workspace app-page-content sales-summary-page" style={{ paddingTop: 16 }}>`;

let startIndex = content.indexOf(targetStart);
let endIndex = content.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end bounds.");
    process.exit(1);
}

endIndex += targetEnd.length;

let innerContent = content.substring(startIndex + targetStart.length, endIndex - targetEnd.length);
// Inner content contains the Popovers.
// We just need to adjust some margins if any, but they should work fine as is.
// Actually, let's just do a clean replace.

const newContent = content.substring(0, startIndex) + replacementStart + innerContent + replacementEnd + content.substring(endIndex);

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log("Success");
