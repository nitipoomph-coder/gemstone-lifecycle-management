const fs = require('fs');
const file = 'd:/gemstone-lifecycle-management/Jewelry Factory System/frontend/src/components/report/CustomerReportTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\s*\) : \(\s*<>\s*<thead>\s*<tr>\s*\{customerIdTh\(2\)\}\s*\{Array\.from\(\{ length: 53 \}/g;

const replacement = 
          ) : viewMode === 'day' ? (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {displayDays.map((dStr) => {
                    const [mm, dd] = dStr.split('-');
                    const mName = MONTHS[parseInt(mm) - 1];
                    return (
                      <th key={\d_\\} colSpan={displayYears.length + activeGrowthCount * 2} className="customer-matrix-th customer-matrix-th--top">{\\ \\}</th>
                    );
                  })}
                  <th colSpan={displayYears.length} className="customer-matrix-th customer-matrix-th--top">{metric === 'qty' ? 'Grand Total QTY' : 'Grand Total Sales'}</th>
                </tr>
                <tr>
                  {displayDays.map((dStr) => (
                    <React.Fragment key={\d_sub_\\}>
                      {displayYears.map((yr) => <th key={\\_\\} className={\customer-matrix-th customer-matrix-th--sub customer-matrix-td--number\}>{yr}</th>)}
                      {displayYears.length > 1 && growthComparisons.map((comp, idx) => (
                        <React.Fragment key={\growth_d_hdr_\\}>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={\Growth Amount (\ vs \)\}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-success-500)', fontWeight: 900 }}>?</span>
                            </div>
                          </th>
                          <th className="customer-matrix-th customer-matrix-th--sub customer-matrix-td--growth" title={\Growth Rate % (\ vs \)\}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingRight: 4 }}>
                              <span>Growth %</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-brand-500)', fontWeight: 900 }}>??</span>
                            </div>
                          </th>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                  {displayYears.map((yr) => <th key={\	ot_hdr_\\} className={totalHeaderClassName(yr)}>{yr} Total</th>)}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.length === 0 ? (
                  <tr><td colSpan={1 + displayDays.length * (displayYears.length + activeGrowthCount * 2) + displayYears.length} className="customer-matrix-empty">No customers match the current filter.</td></tr>
                ) : tableData.rows.map((row) => (
                  <tr key={row.id} className="customer-matrix-row">
                    <td className="customer-matrix-td customer-matrix-td--customer">
                      <button 
                        onClick={() => handleCustomerClick(row.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-600)', fontWeight: 900, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit', maxWidth: '100%' }}
                        title={\View details for \\}
                      >
                        {row.label}
                      </button>
                    </td>
                    {displayDays.map((dStr) => (
                      <React.Fragment key={\d_cell_\\}>
                        {displayYears.map((yr) => {
                          const val = Number(row[\\_D_\\] || 0);
                          return <td key={\\_\\} className={\customer-matrix-td customer-matrix-td--number\}>{renderCell(val)}</td>;
                        })}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const amt = renderGrowthAmt(Number(row[\\_D_\\] || 0), Number(row[\\_D_\\] || 0));
                          const pct = renderGrowthPct(Number(row[\\_D_\\] || 0), Number(row[\\_D_\\] || 0), Boolean(row[\isTrulyNew_\\]));
                          return (
                            <React.Fragment key={\growth_d_row_\_\\}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => <td key={\	otal_\\} className={totalCellClassName(yr)}>{renderCell(Number(row[\\_total\] || 0))}</td>)}
                  </tr>
                ))}
              </tbody>
              {totalsRow && (
                <tfoot className="customer-matrix-footer">
                  <tr className="customer-matrix-row customer-matrix-row--total">
                    <td className="customer-matrix-td customer-matrix-td--customer customer-matrix-footer-label" style={{ textAlign: 'center' }}>Total Row</td>
                    {displayDays.map((dStr) => (
                      <React.Fragment key={\	ot_row_d_\\}>
                        {displayYears.map((yr) => (
                          <td key={\	ot_row_\_\\} className={\customer-matrix-td customer-matrix-td--number\} style={{ textAlign: 'center' }}>
                            {renderCell(totalsRow[\\_D_\\] || 0)}
                          </td>
                        ))}
                        {displayYears.length > 1 && growthComparisons.map((comp, gIdx) => {
                          const valA = totalsRow[\\_D_\\] || 0;
                          const valB = totalsRow[\\_D_\\] || 0;
                          const amt = renderGrowthAmt(valA, valB);
                          const pct = renderGrowthPct(valA, valB);
                          return (
                            <React.Fragment key={\	ot_row_growth_d_\_\\}>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: amt.bgColor }}>{amt.node}</td>
                              <td className="customer-matrix-td customer-matrix-td--growth" style={{ background: pct.bgColor }}>{pct.node}</td>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    {displayYears.map((yr) => (
                      <td key={\	ot_row_d_tot_\\} className={totalCellClassName(yr)} style={{ textAlign: 'center' }}>
                        {renderCell(totalsRow[\\_total\] || 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </>
          ) : (
            <>
              <thead>
                <tr>
                  {customerIdTh(2)}
                  {Array.from({ length: 53 };

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
