// src/components/dashboard/CardDetailPanel.tsx
import { useState, useEffect, type ReactNode } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Calendar, Users, Loader2, AlertTriangle, Package, CheckCircle2, Settings, CalendarDays } from 'lucide-react';
import { fetchCardDetail, fetchAvailableYears, type CardDetailData, type CardType } from '../../services/dashboardAPI';

// ─── Icon wrapper ────────────────────────────────────────────────────────────
function CardIcon({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div style={{ width:44, height:44, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', background:`color-mix(in srgb, ${color}, transparent 88%)`, color, flexShrink:0 }}>
      {children}
    </div>
  );
}

const CARD_META: Record<CardType, { title: string; accent: string; icon: ReactNode }> = {
  today:     { title: 'Orders Today',     accent: 'var(--color-brand-500)',   icon: <CardIcon color="var(--color-brand-500)"><Package size={22}/></CardIcon> },
  completed: { title: 'Completed',        accent: 'var(--color-success-500)', icon: <CardIcon color="var(--color-success-500)"><CheckCircle2 size={22}/></CardIcon> },
  wip:       { title: 'Work In Progress', accent: 'var(--color-brand-600)',   icon: <CardIcon color="var(--color-brand-600)"><Settings size={22}/></CardIcon> },
  overdue:   { title: 'Overdue',          accent: 'var(--color-danger-500)',  icon: <CardIcon color="var(--color-danger-500)"><AlertTriangle size={22}/></CardIcon> },
  month:     { title: 'This Month',       accent: 'var(--color-brand-600)',   icon: <CardIcon color="var(--color-brand-600)"><CalendarDays size={22}/></CardIcon> },
};

// ─── Change Badge ────────────────────────────────────────────────────────────
function ChangeBadge({ pct, inverse }: { pct: number; inverse?: boolean }) {
  const isPos = pct > 0;
  const isNeg = pct < 0;
  // inverse = true สำหรับ Overdue (ลดลง = ดี)
  const isGood = inverse ? isNeg : isPos;
  const isBad  = inverse ? isPos : isNeg;
  // ใช้ color-mix แทน -50 shade เพื่อให้เห็นชัดทั้ง light/dark theme
  const color = isGood ? 'var(--color-success-500)' : isBad ? 'var(--color-danger-500)' : 'var(--color-text-secondary)';
  const bg    = isGood ? 'color-mix(in srgb, var(--color-success-500) 15%, transparent)' : isBad ? 'color-mix(in srgb, var(--color-danger-500) 15%, transparent)' : 'var(--color-surface-2)';
  const Icon  = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 12px', borderRadius:20, background:bg, color, fontSize:'0.72rem', fontWeight:800, border:`1px solid ${isGood ? 'color-mix(in srgb, var(--color-success-500) 25%, transparent)' : isBad ? 'color-mix(in srgb, var(--color-danger-500) 25%, transparent)' : 'transparent'}` }}>
      <Icon size={13}/> {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────
export default function CardDetailPanel({ cardType, onClose }: { cardType: CardType; onClose: () => void }) {
  const meta = CARD_META[cardType];
  const curYear = new Date().getFullYear();

  const [years, setYears] = useState<number[]>([]);
  const [year1, setYear1] = useState(curYear);
  const [year2, setYear2] = useState(curYear - 1);
  const [data, setData] = useState<CardDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load available years once
  useEffect(() => {
    fetchAvailableYears().then(y => { setYears(y); }).catch(() => {});
  }, []);

  // Load detail when years change
  useEffect(() => {
    setLoading(true); setError(null);
    fetchCardDetail(cardType, year1, year2)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [cardType, year1, year2]);

  const maxBar = data ? Math.max(...data.monthly.map(m => Math.max(m.year1 || 0, m.year2)), 1) : 1;
  const isInverse = cardType === 'overdue';

  return (
    <div style={{
      background: 'var(--color-surface-0)', borderRadius: 24,
      border: '1px solid var(--color-border-light)',
      boxShadow: '0 12px 40px -12px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      animation: 'panelSlideDown 0.45s cubic-bezier(0.16,1,0.3,1) forwards',
    }}>

      {/* ═══ Header ═══ */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'20px 28px', borderBottom:'1px solid var(--color-border-light)',
        background: `linear-gradient(135deg, color-mix(in oklch, ${meta.accent}, transparent 95%), transparent)`,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {meta.icon}
          <div>
            <h3 style={{ fontSize:'1.1rem', fontWeight:900, color:'var(--color-text-primary)', fontFamily:'var(--font-display)', letterSpacing:'-0.02em', margin:0 }}>
              {cardType === 'today' ? `${meta.title} — Moving Average` : `${meta.title} — Year Comparison`}
            </h3>
            <p style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--color-text-tertiary)', margin:'2px 0 0', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {cardType === 'today' ? '7 working days moving average comparison (excluding Sundays/Holidays)' : 'Monthly breakdown with year-over-year analysis'}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Year / Period Selectors */}
          {cardType === 'today' ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:14, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)' }}>
              <Calendar size={14} style={{ color: meta.accent }}/>
              <span style={{ fontSize:'0.72rem', fontWeight:800, color:'var(--color-text-secondary)' }}>Moving Average: Last 7 Working Days</span>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:14, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)' }}>
              <Calendar size={14} style={{ color:'var(--color-text-tertiary)' }}/>
              <select value={year1} onChange={e => setYear1(+e.target.value)} style={{ border:'none', background:'transparent', fontSize:'0.8rem', fontWeight:800, color: meta.accent, outline:'none', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--color-text-quaternary)' }}>vs</span>
              <select value={year2} onChange={e => setYear2(+e.target.value)} style={{ border:'none', background:'transparent', fontSize:'0.8rem', fontWeight:800, color:'var(--color-text-secondary)', outline:'none', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:10, background:'var(--color-surface-2)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-text-tertiary)', transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background='var(--color-danger-500)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background='var(--color-surface-2)'; e.currentTarget.style.color='var(--color-text-tertiary)'; }}
          ><X size={18}/></button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {loading ? (
        <div style={{ padding:60, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <Loader2 size={28} style={{ color: meta.accent, animation: 'spin 1s linear infinite' }}/>
          <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>Loading comparison data...</span>
        </div>
      ) : error ? (
        <div style={{ padding:40, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <AlertTriangle size={24} style={{ color:'var(--color-danger-500)' }}/>
          <span style={{ fontSize:'0.8rem', color:'var(--color-danger-500)' }}>{error}</span>
        </div>
      ) : data && (
        <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:24 }}>

          {/* ─── Summary Cards ─── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {(() => {
              const qtyChangePct = data.summary.year2Qty > 0
                ? +(((data.summary.year1Qty - data.summary.year2Qty) / data.summary.year2Qty) * 100).toFixed(1)
                : (data.summary.year1Qty > 0 ? 100 : 0);

              const summaryCards = [
                {
                  label: cardType === 'today' ? "Today's Orders" : `${year1} Orders`,
                  value: data.summary.year1Total,
                  color: meta.accent,
                  badge: data.summary.changePct
                },
                {
                  label: cardType === 'today' ? "7d Work Average" : `${year2} Orders`,
                  value: data.summary.year2Total,
                  color: 'var(--color-text-secondary)',
                  badge: undefined
                },
                {
                  label: cardType === 'today' ? "Today's Piece Qty" : `${year1} Qty`,
                  value: data.summary.year1Qty,
                  color: meta.accent,
                  badge: qtyChangePct
                },
                {
                  label: cardType === 'today' ? "7d Work Average Qty" : `${year2} Qty`,
                  value: data.summary.year2Qty,
                  color: 'var(--color-text-secondary)',
                  badge: undefined
                }
              ];

              return summaryCards.map((s, i) => (
                <div key={i} style={{ padding:'16px 20px', borderRadius:16, background:'var(--color-surface-1)', border:'1px solid var(--color-border-light)', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                  <div style={{ fontSize:'0.6rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{s.label}</div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                    <div style={{ fontSize:'1.4rem', fontWeight:900, color: s.color, fontFamily:'var(--font-display)', letterSpacing:'-0.02em' }}>
                      {s.value.toLocaleString()}
                    </div>
                    {s.badge !== undefined && (
                      <ChangeBadge pct={s.badge} inverse={isInverse}/>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* ─── Monthly Bar Chart ─── */}
          <div style={{ borderRadius:20, border:'1px solid var(--color-border-light)', overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--color-border-light)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                {cardType === 'today' ? 'Daily Actual vs Moving Average' : 'Monthly Comparison'}
              </span>
              {cardType === 'today' ? (
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-secondary)' }}>
                    <span style={{ width:10, height:10, borderRadius:3, background: meta.accent }}/> Daily Actual
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:'var(--color-border-strong)', opacity:0.5 }}/> 7d Average Baseline
                  </span>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-secondary)' }}>
                    <span style={{ width:10, height:10, borderRadius:3, background: meta.accent }}/> {year1}
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', fontWeight:700, color:'var(--color-text-tertiary)' }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:'var(--color-border-strong)', opacity:0.5 }}/> {year2}
                  </span>
                </div>
              )}
            </div>
            <div style={{ padding:'20px 16px 12px', display:'flex', alignItems:'flex-end', gap:4, minHeight:200 }}>
              {data.monthly.map((m, i) => (
                <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  {/* Values above bars */}
                  {!m.isFuture && (
                    <span style={{ fontSize:'0.58rem', fontWeight:800, color: meta.accent, opacity: (m.year1||0)>0 ? 1 : 0.3 }}>
                      {(m.year1||0).toLocaleString()}
                    </span>
                  )}
                  {/* Bar pair */}
                  <div style={{ display:'flex', gap:2, width:'100%', justifyContent:'center', alignItems:'flex-end', height:140 }}>
                    {m.isFuture ? (
                      <div style={{ flex:1, maxWidth:32, height:'100%', borderRadius:'6px 6px 2px 2px', border:'2px dashed var(--color-border-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:'0.5rem', fontWeight:800, color:'var(--color-text-quaternary)', writingMode:'vertical-rl', textOrientation:'mixed' }}>SOON</span>
                      </div>
                    ) : (
                      <div style={{ flex:1, maxWidth:16, borderRadius:'4px 4px 1px 1px', background: meta.accent, transition:'height 0.5s cubic-bezier(0.16,1,0.3,1)', transitionDelay:`${i*40}ms`,
                        height: `${Math.max(((m.year1||0)/maxBar)*130, 3)}px`,
                        opacity: (m.year1||0)>0 ? 1 : 0.15,
                      }}/>
                    )}
                    <div style={{ flex:1, maxWidth:16, borderRadius:'4px 4px 1px 1px', background:'var(--color-border-strong)', transition:'height 0.5s cubic-bezier(0.16,1,0.3,1)', transitionDelay:`${i*40+60}ms`,
                      height: `${Math.max((m.year2/maxBar)*130, 3)}px`,
                      opacity: m.year2>0 ? 0.4 : 0.1,
                    }}/>
                  </div>
                  {/* Month / Day label */}
                  <span style={{ fontSize:'0.52rem', fontWeight:700, color: m.isFuture ? 'var(--color-text-quaternary)' : 'var(--color-text-tertiary)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Customer / Daily Breakdown Table ─── */}
          {data.breakdown.length > 0 && (
            <div style={{ borderRadius:20, border:'1px solid var(--color-border-light)', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--color-border-light)', display:'flex', alignItems:'center', gap:8 }}>
                <Users size={14} style={{ color:'var(--color-text-tertiary)' }}/>
                <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  {cardType === 'today' ? 'Daily Working Days History' : 'Customer Breakdown (Top 10)'}
                </span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.75rem' }}>
                  <thead>
                    <tr style={{ background:'var(--color-surface-1)' }}>
                      {(cardType === 'today'
                        ? ['Date', 'Day of Week', 'Actual Orders', 'Average Baseline', 'Actual Qty', 'Average Qty', 'Performance']
                        : ['Customer', '', `${year1} Orders`, `${year2} Orders`, `${year1} Qty`, `${year2} Qty`, 'Change']
                      ).map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign: h.includes('Orders')||h.includes('Qty')||h.includes('Actual')||h.includes('Average')||h==='Change'||h==='Performance'?'right':'left', fontSize:'0.6rem', fontWeight:800, color:'var(--color-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--color-border-light)', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((r) => (
                      <tr key={r.code} style={{ borderBottom:'1px solid var(--color-border-light)', transition:'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-1)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--color-text-primary)' }}>
                          {cardType === 'today' ? new Date(r.code).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : r.code}
                        </td>
                        <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--color-text-secondary)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:800, color: meta.accent }}>{r.year1.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-primary)' }}>{r.year2.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-primary)' }}>{r.year1Qty.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color:'var(--color-text-secondary)' }}>{r.year2Qty.toLocaleString()}</td>
                        <td style={{ padding:'10px 16px', textAlign:'right' }}>
                          <ChangeBadge pct={r.changePct} inverse={isInverse}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes panelSlideDown { from { opacity:0; max-height:0; transform:translateY(-20px); } to { opacity:1; max-height:2000px; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
