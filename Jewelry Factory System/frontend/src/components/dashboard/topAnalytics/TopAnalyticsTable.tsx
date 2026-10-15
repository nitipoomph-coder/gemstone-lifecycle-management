import { useState } from "react";
import { ImageOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TopGalleryItem } from "../../../services/itemYearlySummaryAPI";

const fmtQty = (val: number) => val.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function TopAnalyticsTable({ 
  rows, 
  loading, 
  displayYears,
  onPhotoClick,
  grandTotalQty = 0,
}: { 
  rows: TopGalleryItem[]; 
  loading: boolean;
  displayYears: string[];
  onPhotoClick?: (item: TopGalleryItem) => void;
  grandTotalQty?: number;
}) {
  const showAvg = displayYears.length > 0;
  const colSpanCount = 5 + displayYears.length + (showAvg ? 2 : 0);

  // Highest volume in the rows for relative share bar
  const maxRowVolume = rows.length > 0
    ? Math.max(...rows.map(r => displayYears.reduce((sum, yr) => sum + (r.yearlyTotals?.[yr]?.qty || 0), 0)))
    : 1;

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/60 font-semibold">
            <th className="py-3.5 px-4 text-center w-16">Rank</th>
            <th className="py-3.5 px-5 w-48">Item & Category</th>
            <th className="py-3.5 px-4 text-center w-28">Photo</th>
            <th className="py-3.5 px-5 w-32">Customer</th>
            <th className="py-3.5 px-5 min-w-[220px]">Volume Share</th>
            
            {/* Dynamic Year Columns in chronological order */}
            {displayYears.map(yr => (
              <th key={yr} className="py-3.5 px-5 text-right w-28 font-mono">
                {yr}
              </th>
            ))}

            {/* Summary Headers: Total & Avg */}
            {showAvg && (
              <th className="py-3.5 px-5 text-right w-32 font-mono bg-slate-100/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 font-bold">
                Total
              </th>
            )}
            {showAvg && (
              <th className="py-3.5 px-5 text-right w-32 font-mono bg-slate-100/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 font-bold">
                Avg / Yr
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-900/30">
          {loading ? (
            Array.from({ length: 12 }).map((_, index) => <SkeletonRow key={index} numCols={colSpanCount} />)
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpanCount} className="text-center py-16 text-slate-400">
                No items match the current filters.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <AnalyticsTableRow 
                key={`${row.primaryCustCode}-${row.itemNo}`} 
                row={row}
                index={index}
                displayYears={displayYears}
                showAvg={showAvg}
                maxRowVolume={maxRowVolume}
                grandTotalQty={grandTotalQty}
                onPhotoClick={() => onPhotoClick?.(row)}
              />
            ))
          )}
        </tbody>
        {rows.length > 0 && !loading && (
          <tfoot>
            <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs">
              <td className="py-4 px-4 text-center font-mono text-indigo-600 dark:text-indigo-400 text-sm">Σ</td>
              <td className="py-4 px-5 font-bold text-slate-900 dark:text-slate-100">Grand Total</td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-5 text-slate-500 font-medium">{rows.length} Items</td>
              <td className="py-4 px-5 text-slate-500 text-[11px] font-mono font-medium">100% Portfolio</td>
              {displayYears.map(yr => {
                const yrTotal = rows.reduce((s, r) => s + (r.yearlyTotals?.[yr]?.qty || 0), 0);
                return (
                  <td key={yr} className="py-4 px-5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-[13px]">
                    {fmtQty(yrTotal)}
                  </td>
                );
              })}
              {showAvg && (
                <td className="py-4 px-5 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-[13px] bg-slate-100/70 dark:bg-slate-800/60">
                  {fmtQty(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.qty || 0), 0), 0))}
                </td>
              )}
              {showAvg && (
                <td className="py-4 px-5 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-[13px] bg-slate-100/70 dark:bg-slate-800/60">
                  {fmtQty(Math.round(rows.reduce((s, r) => s + displayYears.reduce((ys, yr) => ys + (r.yearlyTotals?.[yr]?.qty || 0), 0), 0) / (displayYears.length || 1)))}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function AnalyticsTableRow({ 
  row, 
  index, 
  displayYears,
  showAvg,
  maxRowVolume,
  grandTotalQty,
  onPhotoClick
}: { 
  row: TopGalleryItem; 
  index: number;
  displayYears: string[];
  showAvg: boolean;
  maxRowVolume: number;
  grandTotalQty: number;
  onPhotoClick?: () => void;
}) {
  // Compute exact displayed sum and average for the active years
  const rowDisplayedTotal = displayYears.reduce((sum, yr) => sum + (row.yearlyTotals?.[yr]?.qty || 0), 0);
  const rowDisplayedAvg = displayYears.length > 0 ? Math.round(rowDisplayedTotal / displayYears.length) : 0;

  // Percentage of total volume
  const portfolioPct = grandTotalQty > 0 ? ((rowDisplayedTotal / grandTotalQty) * 100) : 0;
  const relativeBarPct = maxRowVolume > 0 ? Math.min(100, Math.max(4, (rowDisplayedTotal / maxRowVolume) * 100)) : 0;

  // Compute trend indicator comparing latest year to previous year
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (displayYears.length >= 2) {
    const latestYr = displayYears[displayYears.length - 1];
    const prevYr = displayYears[displayYears.length - 2];
    const latestQty = row.yearlyTotals?.[latestYr]?.qty || 0;
    const prevQty = row.yearlyTotals?.[prevYr]?.qty || 0;
    if (latestQty > prevQty) trend = 'up';
    else if (latestQty < prevQty) trend = 'down';
    else trend = 'flat';
  }

  const rank = row.rank || index + 1;

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      {/* Rank Column */}
      <td className="py-3 px-4 text-center whitespace-nowrap">
        {rank === 1 ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-xs shadow-2xs font-mono">
            1
          </span>
        ) : rank === 2 ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-400/20 text-slate-700 dark:text-slate-300 font-bold text-xs font-mono">
            2
          </span>
        ) : rank === 3 ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-xs font-mono">
            3
          </span>
        ) : (
          <span className="font-mono text-slate-400 font-semibold text-xs">
            {rank}
          </span>
        )}
      </td>

      {/* Item & Category */}
      <td className="py-3.5 px-5">
        <div 
          onClick={onPhotoClick}
          className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          {row.itemNo}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {row.productType && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {row.productTypeLabel || row.productType}
            </span>
          )}
          {row.productCategory && row.productCategory !== row.productType && (
            <span className="text-[10px] text-slate-400">
              {row.productCategory}
            </span>
          )}
        </div>
      </td>

      {/* Photo Thumbnail */}
      <td className="py-3.5 px-4 text-center">
        <div 
          className="w-20 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 p-1 flex items-center justify-center overflow-hidden shadow-2xs hover:scale-105 transition-transform cursor-pointer mx-auto"
          onClick={onPhotoClick}
          title={`Click to preview ${row.itemNo}`}
        >
          <PhotoThumb itemNo={row.itemNo} />
        </div>
      </td>

      {/* Customer */}
      <td className="py-3.5 px-5">
        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
          {row.primaryCustCode || '-'}
        </div>
        {row.primaryGroupLabel && (
          <div className="text-[10px] text-slate-400 truncate max-w-[110px]" title={row.primaryGroupLabel}>
            {row.primaryGroupLabel}
          </div>
        )}
      </td>

      {/* Volume Share Column (Fills horizontal void with valuable visualization!) */}
      <td className="py-3.5 px-5">
        <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {portfolioPct.toFixed(1)}% <span className="font-normal text-slate-400 text-[10px]">share</span>
          </span>
          <span className="text-slate-400 text-[10px]">
            {fmtQty(rowDisplayedTotal)} pcs
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${relativeBarPct}%` }}
          />
        </div>
      </td>

      {/* Dynamic Year Values */}
      {displayYears.map(yr => {
        const qtyForYear = row.yearlyTotals?.[yr]?.qty || 0;
        return (
          <td 
            key={yr} 
            className={`py-3.5 px-5 text-right font-mono text-xs ${qtyForYear > 0 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}
          >
            {qtyForYear > 0 ? fmtQty(qtyForYear) : '—'}
          </td>
        );
      })}

      {/* Harmonious Total and Average Columns */}
      {showAvg && (
        <td className="py-3.5 px-5 text-right font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-50/60 dark:bg-slate-800/30">
          {fmtQty(rowDisplayedTotal)}
        </td>
      )}
      {showAvg && (
        <td className="py-3.5 px-5 text-right font-mono font-medium text-xs text-slate-800 dark:text-slate-200 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="inline-flex items-center gap-1.5 justify-end w-full">
            <span>{fmtQty(rowDisplayedAvg)}</span>
            {trend === 'up' && (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold" title="Trending Up">
                <TrendingUp size={12} />
              </span>
            )}
            {trend === 'down' && (
              <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-bold" title="Trending Down">
                <TrendingDown size={12} />
              </span>
            )}
            {trend === 'flat' && (
              <span className="inline-flex items-center text-slate-400" title="Stable">
                <Minus size={11} />
              </span>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

function PhotoThumb({ itemNo }: { itemNo: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <ImageOff size={16} className="text-slate-400 opacity-60" />
  ) : (
    <img
      src={`/api/photos/ps/${itemNo}`}
      alt={itemNo}
      loading="lazy"
      className="w-full h-full object-contain"
      onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
        const image = event.currentTarget;
        if (!image.dataset.triedCad) {
          image.dataset.triedCad = "true";
          image.src = `/api/photos/cad/${itemNo}`;
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

function SkeletonRow({ numCols }: { numCols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: numCols }).map((_, index) => (
        <td key={index} className="py-3.5 px-5">
          <div 
            className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md"
            style={{ width: index === 0 ? '24px' : index === 2 ? '64px' : '75%' }} 
          />
        </td>
      ))}
    </tr>
  );
}
