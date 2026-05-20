// src/pages/OrderDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Search, Package, DollarSign, ClipboardList, Check, FileSpreadsheet, Image, X } from 'lucide-react';
import Topbar from '../components/layout/Topbar';
import { fetchOrderDetail, fetchOrderByPo, fetchOrderByGroup, updateOrderRemarks, type OrderDetail } from '../services/orderTrackerAPI';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
};
const fQty = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());
const fAmt = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ViewMode = 'sales' | 'prod' | 'all';

const DATE_KEYS = new Set(['OrdDate', 'DueDate', 'QCDate', 'CustDueDate', 'InvoiceDate']);
function formatV(key: string, val: any) {
  if (val == null || val === '') return '—';
  if (DATE_KEYS.has(key)) return fDate(val as string);
  if (key === 'Price' || key === 'Amount') return fAmt(Number(val));
  if (typeof val === 'number') return fQty(val);
  return String(val);
}

const PROD_STEPS = [
  { key: 'StoneQty', label: 'Stone' },
  { key: 'FindingQty', label: 'Finding' },
  { key: 'WaxQty', label: 'Wax' },
  { key: 'WaxSetQty', label: 'Wax Set' },
  { key: 'CastQty', label: 'Cast' },
  { key: 'GrindQty', label: 'Grind' },
  { key: 'EpoxQty', label: 'Epoxy' },
  { key: 'SolderQty', label: 'Solder' },
  { key: 'FilingQty', label: 'Filing' },
  { key: 'ControlQty', label: 'Control' },
  { key: 'SetQty', label: 'Setting' },
  { key: 'PolishQty', label: 'Polish' },
  { key: 'PQCQty', label: 'PQC' },
  { key: 'PlatingQty', label: 'Plating' },
  { key: 'AssemQty', label: 'Assemble' },
  { key: 'FQCQty', label: 'FQC' },
  { key: 'PackQty', label: 'Pack' },
  { key: 'FinishQty', label: 'Finish' },
  { key: 'ExportQty', label: 'Export' },
];

const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
  { key: 'sales', label: 'Sales View', icon: <DollarSign size={14} /> },
  { key: 'prod', label: 'Production View', icon: <Package size={14} /> },
  { key: 'all', label: 'All Details', icon: <ClipboardList size={14} /> },
];

// Add global styles for toast animation if not already present
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Excel Export Helper ─────────────────────────────────────────────────────
function exportToExcel(lines: Record<string, unknown>[], header: any, pageTitle: string) {
  // Build HTML table for Excel
  const salesCols = ['OrdNo', 'LineNo', 'ItemNo', 'ItemDesc', 'CustItem', 'ItemMat', 'ItemSize', 'Stone', 'Plating', 'SilverWt', 'FinishWt', 'Qty', 'Price', 'Amount', 'Sales', 'Destination', 'PONo', 'InvoiceNo', 'AWB', 'OrdDate', 'DueDate', 'CustDueDate', 'QCDate'];
  const prodCols = ['StoneQty', 'FindingQty', 'WaxQty', 'WaxSetQty', 'CastQty', 'GrindQty', 'EpoxQty', 'SolderQty', 'FilingQty', 'ControlQty', 'SetQty', 'PolishQty', 'PQCQty', 'PlatingQty', 'AssemQty', 'FQCQty', 'PackQty', 'FinishQty', 'ExportQty', 'BalQty'];
  const remarkCols = ['RecRemark', 'EnaRemark', 'CryRemark', 'AsmRemark', 'ShfRemark', 'PkRemark', 'ProdRemark', 'OrdRemark'];
  const allCols = [...salesCols, ...prodCols, ...remarkCols];

  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"><style>td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial,sans-serif;font-size:10pt} th{background:#4472C4;color:#fff;font-weight:bold} tr:nth-child(even) td{background:#f5f5f5}</style></head><body>';
  html += `<h3>${pageTitle} — ${header?.CustCode || ''} ${header?.CustName || ''}</h3>`;
  html += '<table cellspacing="0" cellpadding="4">';
  
  // Header row
  html += '<tr>';
  allCols.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += '</tr>';
  
  // Data rows
  lines.forEach(line => {
    html += '<tr>';
    allCols.forEach(col => {
      let val = line[col];
      if (val == null || val === '') val = '';
      // Format dates
      if (DATE_KEYS.has(col) && val) {
        try { val = new Date(val as string).toLocaleDateString('th-TH'); } catch { /* keep raw */ }
      }
      html += `<td>${String(val)}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pageTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Photo Gallery Modal ─────────────────────────────────────────────────────
function GalleryItemCard({ line, onClick }: { line: any, onClick: (url: string, source: 'network' | 'database') => void }) {
  const [photoSource, setPhotoSource] = useState<'network' | 'database' | 'loading'>('loading');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  useEffect(() => {
    if (!line.ItemPhoto && !line.ItemNo) {
      setPhotoSource('database');
      setPhotoUrl('');
      return;
    }

    const highResUrl = `http://localhost:3001/api/photos/${line.ItemNo}`;
    const img = new window.Image();
    img.src = highResUrl;

    img.onload = () => {
      setPhotoUrl(highResUrl);
      setPhotoSource('network');
    };

    img.onerror = () => {
      if (line.ItemPhoto) {
        const dbSrc = String(line.ItemPhoto).startsWith('data:')
          ? String(line.ItemPhoto)
          : `data:image/jpeg;base64,${line.ItemPhoto}`;
        setPhotoUrl(dbSrc);
        setPhotoSource('database');
      } else {
        setPhotoUrl('');
        setPhotoSource('database');
      }
    };
  }, [line.ItemNo, line.ItemPhoto]);

  return (
    <div
      onClick={() => photoUrl && onClick(photoUrl, photoSource === 'loading' ? 'database' : photoSource)}
      style={{
        cursor: photoUrl ? 'pointer' : 'default',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-border-light)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        if (photoUrl) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.borderColor = 'var(--color-brand-500)';
          e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={e => {
        if (photoUrl) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'var(--color-border-light)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
        }
      }}
    >
      {/* 🏷️ Status Badge on Thumbnail */}
      {photoUrl && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 10,
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 8px', borderRadius: '20px',
          fontSize: '0.62rem', fontWeight: 800,
          backdropFilter: 'blur(6px)',
          background: photoSource === 'network'
            ? 'rgba(47, 158, 68, 0.85)'
            : 'rgba(25, 113, 194, 0.85)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <span style={{
            width: '4px', height: '4px', borderRadius: '50%',
            background: '#fff',
            display: 'inline-block'
          }} />
          {photoSource === 'network' ? '🌐 REAL' : '💾 SQL'}
        </div>
      )}

      <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
        {photoUrl ? (
          <img src={photoUrl} alt={String(line.ItemNo)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px' }} />
        ) : (
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>NO PHOTO</span>
        )}
      </div>

      <div style={{ padding: '12px', background: 'var(--color-surface-0)', borderTop: '1px solid var(--color-border-light)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 850, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display, monospace)' }}>
          {String(line.ItemNo)}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {line.ItemDesc || 'No Description'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>QTY: {line.Qty != null ? Number(line.Qty).toLocaleString() : '—'}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)', fontWeight: 700, fontFamily: 'monospace' }}>#{line.LineNo}</span>
        </div>
      </div>
    </div>
  );
}

interface ActiveWindow {
  id: string;
  idx: number;
  line: any;
  photoUrl: string;
  photoSource: 'network' | 'database';
  isZoomed: boolean;
  zoomPos: { x: number; y: number };
  x: number;
  y: number;
  zIndex: number;
}

function PhotoGalleryModal({ lines, onClose }: { lines: Record<string, unknown>[], onClose: () => void }) {
  const photosLines = lines.filter(l => l.ItemPhoto || l.ItemNo);
  const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(10005);
  const [draggingWinId, setDraggingWinId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  if (photosLines.length === 0) {
    return (
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--color-surface-0)', borderRadius: '20px', padding: '48px', textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', maxWidth: '400px', border: '1px solid var(--color-border-light)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>📷</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>NO PHOTOS FOUND</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginBottom: '24px', fontFamily: 'var(--font-body)' }}>ไม่พบรูปภาพสินค้าหรือรหัสสินค้าในเอกสารฉบับนี้</div>
          <button onClick={onClose} style={{
            padding: '10px 28px', borderRadius: '10px', background: 'var(--color-brand-500)', color: '#fff',
            border: 'none', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(25, 113, 194, 0.3)'
          }}>Close Gallery</button>
        </div>
      </div>
    );
  }

  const openWindow = (idx: number) => {
    const line = photosLines[idx];
    const id = String(line.ItemNo);

    // If already open, just bring to front
    const existing = activeWindows.find(w => w.id === id);
    if (existing) {
      const nextZ = maxZIndex + 1;
      setMaxZIndex(nextZ);
      setActiveWindows(prev => 
        prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w)
      );
      return;
    }

    // Resolve dynamic photo url
    const highResUrl = `http://localhost:3001/api/photos/${line.ItemNo}`;
    const img = new window.Image();
    img.src = highResUrl;

    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);

    // Offset starting position cascaded
    const offset = (activeWindows.length % 5) * 35;
    const startX = 120 + offset;
    const startY = 140 + offset;

    img.onload = () => {
      setActiveWindows(prev => [
        ...prev,
        {
          id,
          idx,
          line,
          photoUrl: highResUrl,
          photoSource: 'network',
          isZoomed: false,
          zoomPos: { x: 50, y: 50 },
          x: startX,
          y: startY,
          zIndex: nextZ
        }
      ]);
    };

    img.onerror = () => {
      const dbSrc = line.ItemPhoto
        ? (String(line.ItemPhoto).startsWith('data:')
          ? String(line.ItemPhoto)
          : `data:image/jpeg;base64,${line.ItemPhoto}`)
        : '';
      setActiveWindows(prev => [
        ...prev,
        {
          id,
          idx,
          line,
          photoUrl: dbSrc,
          photoSource: 'database',
          isZoomed: false,
          zoomPos: { x: 50, y: 50 },
          x: startX,
          y: startY,
          zIndex: nextZ
        }
      ]);
    };
  };

  const closeWindow = (id: string) => {
    setActiveWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleZoom = (id: string) => {
    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, isZoomed: !w.isZoomed } : w)
    );
  };

  const handleWinMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const win = activeWindows.find(w => w.id === id);
    if (!win || !win.isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    
    setActiveWindows(prev =>
      prev.map(w => w.id === id ? { ...w, zoomPos: { x, y } } : w)
    );
  };

  const startDrag = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    
    const nextZ = maxZIndex + 1;
    setMaxZIndex(nextZ);
    setActiveWindows(prev => 
      prev.map(w => w.id === id ? { ...w, zIndex: nextZ } : w)
    );

    const win = activeWindows.find(w => w.id === id);
    if (!win) return;

    setDraggingWinId(id);
    setDragOffset({
      x: e.clientX - win.x,
      y: e.clientY - win.y
    });
  };

  const handleGlobalDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingWinId) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    setActiveWindows(prev =>
      prev.map(w => w.id === draggingWinId ? { ...w, x: newX, y: newY } : w)
    );
  };

  const stopGlobalDrag = () => {
    setDraggingWinId(null);
  };

  return (
    <div 
      onMouseMove={handleGlobalDragMove}
      onMouseUp={stopGlobalDrag}
      style={{
        position: 'fixed', inset: 0, 
        background: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        zIndex: 10000,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--font-body, "Prompt", sans-serif)',
        animation: 'fadeIn 0.25s ease-out forwards',
        overflow: 'hidden',
        userSelect: draggingWinId ? 'none' : 'auto'
      }}
    >
      {/* Premium Gallery Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 28px', 
        borderBottom: '1px solid var(--color-border-light)',
        background: 'var(--color-surface-0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        zIndex: 10002
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'color-mix(in srgb, var(--color-brand-500), transparent 90%)', padding: '8px', borderRadius: '10px', color: 'var(--color-brand-500)' }}>
            <ClipboardList size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 900, fontSize: '1.15rem', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
              MASTER PHOTO STUDIO
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
              ตรวจเช็คภาพถ่ายชิ้นงานอิสระระดับสากล เปิดหลายหน้าต่างซ้อนลากได้อิสระ
            </span>
          </div>
          <span style={{
            background: 'color-mix(in srgb, var(--color-brand-500), transparent 92%)', 
            color: 'var(--color-brand-600)', 
            padding: '4px 14px',
            border: '1px solid color-mix(in srgb, var(--color-brand-500), transparent 80%)',
            borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800,
            fontFamily: 'monospace'
          }}>{photosLines.length} ITEMS</span>
        </div>

        <button onClick={onClose} style={{
          width: 42, height: 42, borderRadius: '12px', 
          border: '1px solid var(--color-border-light)',
          background: 'var(--color-surface-1)', 
          color: 'var(--color-text-secondary)', 
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger-500), transparent 92%)'; e.currentTarget.style.borderColor = 'var(--color-danger-300)'; e.currentTarget.style.color = 'var(--color-danger-500)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface-1)'; e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Gallery Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px', background: 'var(--color-surface-1)', position: 'relative' }}>
        
        {/* Gallery Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px', maxWidth: '1400px', margin: '0 auto', zIndex: 10001, position: 'relative'
        }}>
          {photosLines.map((line, idx) => (
            <GalleryItemCard
              key={idx}
              line={line}
              onClick={() => openWindow(idx)}
            />
          ))}
        </div>

        {/* Stackable Draggable Floating Windows Manager */}
        {activeWindows.map(win => (
          <div
            key={win.id}
            style={{
              position: 'absolute',
              left: `${win.x}px`,
              top: `${win.y}px`,
              width: '450px',
              height: '520px',
              background: 'var(--color-surface-0)',
              borderRadius: '16px',
              border: '1px solid var(--color-border-light)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: win.zIndex,
              animation: 'zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Window Header - Draggable Area */}
            <div
              onMouseDown={(e) => startDrag(win.id, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--color-border-light)',
                background: 'var(--color-surface-1)',
                cursor: draggingWinId === win.id ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-brand-500)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                  {String(win.line.ItemNo)}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: win.photoSource === 'network' ? 'color-mix(in srgb, var(--color-success-500), transparent 90%)' : 'color-mix(in srgb, var(--color-brand-500), transparent 90%)',
                  color: win.photoSource === 'network' ? 'var(--color-success-500)' : 'var(--color-brand-500)',
                  border: '1px solid',
                  borderColor: 'currentColor'
                }}>
                  {win.photoSource === 'network' ? '🌐 REAL' : '💾 SQL'}
                </span>
              </div>
              <button
                onClick={() => closeWindow(win.id)}
                style={{
                  border: 'none', background: 'none', color: 'var(--color-text-secondary)',
                  cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger-500)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                ✕
              </button>
            </div>

            {/* Window Body (Zoomable Viewport & Specs) */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
              
              {/* Symmetrical Magnifier Frame */}
              <div
                onMouseMove={(e) => handleWinMouseMove(win.id, e)}
                onMouseLeave={() => !win.isZoomed && setActiveWindows(prev => prev.map(w => w.id === win.id ? { ...w, zoomPos: { x: 50, y: 50 } } : w))}
                style={{
                  width: '100%',
                  height: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface-2)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border-light)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {win.photoUrl ? (
                  <img
                    src={win.photoUrl}
                    alt={String(win.line.ItemNo)}
                    onClick={() => toggleZoom(win.id)}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: win.isZoomed ? 'scale(2.5)' : 'scale(1)',
                      transformOrigin: `${win.zoomPos.x}% ${win.zoomPos.y}%`,
                      transition: win.isZoomed 
                        ? 'transform-origin 0.08s ease-out, transform 0.2s ease-out' 
                        : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform-origin 0.3s',
                      cursor: win.isZoomed ? 'zoom-out' : 'zoom-in',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>NO PICTURE</span>
                )}
              </div>

              {/* Action Zoom Info Tray */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => toggleZoom(win.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-light)',
                    background: 'var(--color-surface-1)',
                    color: 'var(--color-brand-600)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-1)'}
                >
                  🔍 {win.isZoomed ? 'ZOOM OUT' : 'ZOOM IN (ขยาย 2.5 เท่า)'}
                </button>
              </div>

              {/* Symmetrical production spec details - 100% UNIFORM */}
              <div style={{
                width: '100%',
                fontSize: '0.72rem',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-1)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-light)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>ITEM NO / รหัสสินค้า</span>
                  <span style={{ fontWeight: 800, color: 'var(--color-brand-600)', fontFamily: 'monospace' }}>{String(win.line.ItemNo)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>SIZE / ขนาดชิ้นงาน</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{win.line.ItemSize || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>METAL / ตัวเรือน</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{win.line.ItemMat || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>STONE / ข้อมูลพลอย</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{win.line.Stone || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>DESCRIPTION / รายละเอียด</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{win.line.ItemDesc || '—'}</span>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function SpecItem({ label, value }: { label: string, value: any }) {
  if (!value || value === '—') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
      <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700 }}>{label}:</span>
      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{String(value)}</span>
    </div>
  );
}

function DataPair({ label, value }: { label: string, value: any }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{String(value)}</span>
    </div>
  );
}

function OrderLineCard({ line, index, viewMode }: { line: any, index: number, viewMode: ViewMode }) {
  const [isEditing, setIsEditing] = useState(false);
  const [remarks, setRemarks] = useState({
    RecRemark: line.RecRemark || '',
    EnaRemark: line.EnaRemark || '',
    CryRemark: line.CryRemark || '',
    AsmRemark: line.AsmRemark || '',
    ShfRemark: line.ShfRemark || '',
    PkRemark: line.PkRemark || '',
    ProdRemark: line.ProdRemark || '',
  });
  const [showToast, setShowToast] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // 🌐 Dual Bridged Image Loading Hook
  const [photoSource, setPhotoSource] = useState<'network' | 'database' | 'loading'>('loading');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  useEffect(() => {
    if (!line.ItemPhoto && !line.ItemNo) {
      setPhotoSource('database');
      setPhotoUrl('');
      return;
    }

    // Try loading the high-resolution photo from our Backend Network Photo Bridge first!
    const highResUrl = `http://localhost:3001/api/photos/${line.ItemNo}`;
    const img = new window.Image();
    img.src = highResUrl;

    img.onload = () => {
      setPhotoUrl(highResUrl);
      setPhotoSource('network');
    };

    img.onerror = () => {
      // If network photo is offline/missing, fallback to database base64 thumbnail!
      if (line.ItemPhoto) {
        const dbSrc = String(line.ItemPhoto).startsWith('data:')
          ? String(line.ItemPhoto)
          : `data:image/jpeg;base64,${line.ItemPhoto}`;
        setPhotoUrl(dbSrc);
        setPhotoSource('database');
      } else {
        setPhotoUrl('');
        setPhotoSource('database');
      }
    };
  }, [line.ItemNo, line.ItemPhoto]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const hasChanges = 
    remarks.RecRemark !== (line.RecRemark || '') ||
    remarks.EnaRemark !== (line.EnaRemark || '') ||
    remarks.CryRemark !== (line.CryRemark || '') ||
    remarks.AsmRemark !== (line.AsmRemark || '') ||
    remarks.ShfRemark !== (line.ShfRemark || '') ||
    remarks.PkRemark !== (line.PkRemark || '') ||
    remarks.ProdRemark !== (line.ProdRemark || '');

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    try {
      await updateOrderRemarks({
        OrdNo: line.OrdNo,
        LineNo: line.LineNo,
        ...remarks
      });
      // Optionally show a success toast here
      console.log('Saved remarks successfully for:', line.ItemNo);
      setIsEditing(false);
      
      // Update local line object so it reflects changes even after canceling next time
      line.RecRemark = remarks.RecRemark;
      line.EnaRemark = remarks.EnaRemark;
      line.CryRemark = remarks.CryRemark;
      line.AsmRemark = remarks.AsmRemark;
      line.ShfRemark = remarks.ShfRemark;
      line.PkRemark = remarks.PkRemark;
      line.ProdRemark = remarks.ProdRemark;

      // Show Toast Notification
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (err) {
      console.error('Failed to save remarks:', err);
      alert('Failed to save remarks. Please try again.');
    }
  };

  const handleCancel = () => {
    // Reset to original props
    setRemarks({
      RecRemark: line.RecRemark || '',
      EnaRemark: line.EnaRemark || '',
      CryRemark: line.CryRemark || '',
      AsmRemark: line.AsmRemark || '',
      ShfRemark: line.ShfRemark || '',
      PkRemark: line.PkRemark || '',
      ProdRemark: line.ProdRemark || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="order-line-card" style={{
      background: 'var(--color-surface-0)',
      borderRadius: '16px',
      border: '1px solid var(--color-border-light)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      marginBottom: '16px',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* ── Header Area ── */}
      <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Photo */}
        <div 
          onClick={() => photoUrl && setIsImageOpen(true)}
          style={{
            width: '80px', height: '80px', flexShrink: 0,
            borderRadius: '12px', border: '1px solid var(--color-border-light)',
            background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            cursor: photoUrl ? 'pointer' : 'default',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s'
          }}
          title={photoUrl ? 'Click to enlarge' : ''}
          onMouseEnter={e => { if (photoUrl) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.opacity = '0.9'; } }}
          onMouseLeave={e => { if (photoUrl) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; } }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-quaternary)', fontWeight: 700 }}>NO IMG</span>
          )}
        </div>

        {/* Premium Spacious Enlarged Lightbox Modal with Pan & 2.2x Zoom Controls */}
        {isImageOpen && photoUrl && (
          <div 
            onClick={() => { setIsImageOpen(false); setIsZoomed(false); }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(15, 23, 42, 0.85)', // Extra dark elegant slate backdrop
              backdropFilter: 'blur(12px)', // Glassmorphism blur
              zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.2s ease-out forwards',
              fontFamily: 'var(--font-body, "Prompt", sans-serif)'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()} // Prevent close on modal body click
              style={{ 
                position: 'relative', 
                background: 'var(--color-surface-0)', // 100% theme-aware surface
                borderRadius: '20px',
                border: '1px solid var(--color-border-light)',
                boxShadow: '0 30px 70px rgba(0,0,0,0.45)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: photoSource === 'network' ? '780px' : '600px',
                height: photoSource === 'network' ? '700px' : '560px',
                maxWidth: '92vw',
                maxHeight: '88vh',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                animation: 'zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              {/* Modal Title Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid var(--color-border-light)',
                background: 'var(--color-surface-1)', 
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--color-brand-600)', letterSpacing: '0.05em', fontFamily: 'var(--font-display, monospace)' }}>
                  :: {line.ItemNo || 'ITEM DETAIL'} ::
                </span>
                <button 
                  onClick={() => setIsImageOpen(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger-500), transparent 90%)'; e.currentTarget.style.color = 'var(--color-danger-500)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body - Symmetrical Locked Frame */}
              <div style={{
                flex: 1,
                padding: '20px',
                background: 'var(--color-surface-0)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* 🌐 Network Origin Status Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  marginBottom: '14px',
                  fontFamily: 'var(--font-body)',
                  border: '1px solid',
                  background: photoSource === 'network' 
                    ? 'color-mix(in srgb, var(--color-success-500), transparent 90%)' 
                    : 'color-mix(in srgb, var(--color-brand-500), transparent 90%)',
                  borderColor: photoSource === 'network' 
                    ? 'var(--color-success-500)' 
                    : 'var(--color-brand-500)',
                  color: photoSource === 'network' 
                    ? 'var(--color-success-500)' 
                    : 'var(--color-brand-500)',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'currentColor',
                  }} />
                  {photoSource === 'network' 
                    ? '🌐 HIGH-RES FILE SERVER' 
                    : '💾 SQL DB THUMBNAIL'}
                </div>

                {/* Symmetrical Dynamic Viewport Frame */}
                <div 
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => !isZoomed && setZoomPos({ x: 50, y: 50 })}
                  style={{
                    width: '100%',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-surface-2)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-border-light)',
                    overflow: 'hidden',
                    padding: '12px',
                    position: 'relative'
                  }}
                >
                  <img 
                    src={photoUrl} 
                    alt="Enlarged Item" 
                    onClick={() => setIsZoomed(!isZoomed)}
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain',
                      transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                      transition: isZoomed 
                        ? 'transform-origin 0.08s ease-out, transform 0.2s ease-out' 
                        : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform-origin 0.3s',
                      borderRadius: '8px', 
                      boxShadow: isZoomed ? '0 12px 36px rgba(0,0,0,0.15)' : 'none',
                    }} 
                  />
                </div>

                {/* Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginTop: '14px',
                  width: '100%',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border-light)',
                      background: 'var(--color-surface-1)',
                      color: 'var(--color-brand-600)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-1)'}
                  >
                    🔍 {isZoomed ? 'ZOOM OUT' : 'ZOOM IN (ขยาย 2.5 เท่า)'}
                  </button>
                </div>
                
                {line.ItemDesc && (
                  <div style={{
                    marginTop: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                    letterSpacing: '0.02em',
                    maxWidth: '500px',
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {line.ItemDesc}
                  </div>
                )}
                
                <div style={{
                  marginTop: '10px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-body)'
                }}>
                  {isZoomed ? 'คลิกที่รูปภาพอีกครั้งเพื่อย่อขนาด หรือเลื่อนเมาส์/ทัชแพดเพื่อสำรวจรายละเอียด' : 'คลิกที่รูปภาพเพื่อซูมขยาย หรือกด ✕ เพื่อปิดกล่อง'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ background: 'color-mix(in srgb, var(--color-text-primary), transparent 90%)', color: 'var(--color-text-primary)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  #{index + 1}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: 700 }}>
                  {String(line.LineNo || '').includes(line.OrdNo || '') ? line.LineNo : `${line.OrdNo || 'N/A'}/${line.LineNo || '1'}`}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {line.ItemNo || 'Unknown Item'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                {line.ItemDesc || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', textAlign: 'right', flexWrap: 'wrap' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Order Date</span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', fontWeight: 800 }}>{formatV('OrdDate', line.OrdDate)}</span>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Factory Due</span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--color-danger-500)', fontWeight: 800 }}>{formatV('DueDate', line.DueDate)}</span>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Cust Due</span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', fontWeight: 800 }}>{formatV('CustDueDate', line.CustDueDate)}</span>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>QC Date</span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 800 }}>{formatV('QCDate', line.QCDate)}</span>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Qty</span>
                 <span style={{ fontSize: '1.1rem', color: 'var(--color-brand-600)', fontWeight: 900, fontFamily: 'var(--font-display)' }}>{fQty(line.TotalQty || line.Qty)}</span>
               </div>
            </div>

          </div>

          {/* Specs / Attributes Wrap */}
          <div style={{ 
            display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: '16px',
            padding: '12px 16px', background: 'var(--color-surface-1)', borderRadius: '12px',
            border: '1px solid var(--color-border-light)'
          }}>
            <SpecItem label="Size" value={line.ItemSize} />
            <SpecItem label="Metal" value={line.ItemMat} />
            <SpecItem label="Stone" value={line.Stone} />
            <SpecItem label="Plating" value={line.Plating} />
            <SpecItem label="Cust Item" value={line.CustItem} />
            <SpecItem label="Silver Wt." value={line.SilverWt != null ? `${line.SilverWt}g` : undefined} />
            <SpecItem label="Finish Wt." value={line.FinishWt != null ? `${line.FinishWt}g` : undefined} />
          </div>
        </div>
      </div>

      {/* ── Detail Area ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {(viewMode === 'sales' || viewMode === 'all') && (
           <div style={{ borderTop: '1px solid var(--color-border-light)', padding: '16px 20px', background: 'color-mix(in srgb, #1971c2, transparent 94%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#1971c2', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <DollarSign size={16} /> Sales & Shipping Data
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 40px' }}>
                <DataPair label="Sales" value={line.Sales} />
                <DataPair label="Destination" value={line.Destination} />
                <DataPair label="PO Number" value={line.PONo} />
                <DataPair label="Price" value={formatV('Price', line.Price)} />
                <DataPair label="Amount" value={formatV('Amount', line.Amount)} />
                <DataPair label="Invoice No." value={line.InvoiceNo} />
                <DataPair label="Invoice Date" value={formatV('InvoiceDate', line.InvoiceDate)} />
                <DataPair label="AWB" value={line.AWB} />
              </div>
           </div>
        )}

        {(viewMode === 'prod' || viewMode === 'all') && (
           <div style={{ borderTop: '1px solid var(--color-border-light)', padding: '16px 20px', background: 'color-mix(in srgb, #e67700, transparent 92%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#e67700', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Package size={16} /> Production Tracking Pipeline
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                 {PROD_STEPS.map(step => {
                   const raw = line[step.key];
                   const qty = Number(raw);
                   const isEmpty = raw == null || raw === '';
                   const isZero = qty === 0;
                   const isNegative = qty < 0;
                   
                   const bg = isNegative ? '#ffe3e3' : (!isEmpty && !isZero) ? 'var(--color-surface-0)' : 'transparent';
                   const border = isNegative ? '#ffa8a8' : (!isEmpty && !isZero) ? 'color-mix(in srgb, #e67700, transparent 60%)' : 'var(--color-border-light)';
                   const opacity = isEmpty || isZero ? 0.6 : 1;
                   
                   return (
                     <div key={step.key} style={{
                       display: 'flex', flexDirection: 'column', alignItems: 'center', 
                       padding: '10px 14px', background: bg,
                       borderRadius: '10px', border: `1px solid ${border}`,
                       minWidth: '72px', opacity, transition: 'all 0.2s',
                       boxShadow: (!isEmpty && !isZero && !isNegative) ? '0 2px 8px rgba(230,119,0,0.1)' : 'none'
                     }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--color-text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>{step.label}</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: isNegative ? '#c92a2a' : 'var(--color-text-primary)' }}>{isEmpty ? '—' : qty}</span>
                     </div>
                   );
                 })}
                 <div style={{
                       display: 'flex', flexDirection: 'column', alignItems: 'center', 
                       padding: '10px 14px', background: 'var(--color-brand-50)',
                       borderRadius: '10px', border: `1px solid var(--color-brand-200)`,
                       minWidth: '72px'
                     }}>
                        <span style={{ fontSize: '0.62rem', color: 'var(--color-brand-600)', fontWeight: 800, textTransform: 'uppercase' }}>Balance</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-brand-700)' }}>{formatV('BalQty', line.BalQty)}</span>
                 </div>
              </div>
           </div>
        )}

        {/* Always show Remarks section, or at least in sales/prod/all */}
        {/* Always show Remarks section, or at least in sales/prod/all */}
        {(viewMode === 'sales' || viewMode === 'prod' || viewMode === 'all') && (
           <div style={{ borderTop: '1px solid var(--color-border-light)', padding: '16px 20px', background: 'color-mix(in srgb, var(--color-success-500), transparent 94%)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success-700)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <ClipboardList size={16} /> Remarks (Sales & Production)
                </div>
                
                {/* Action Buttons */}
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-success-500)', color: 'var(--color-success-500)', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                    EDIT REMARKS
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCancel} style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--color-border-dark)', color: 'var(--color-text-secondary)', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                      CANCEL
                    </button>
                    <button 
                      onClick={handleSave} 
                      disabled={!hasChanges}
                      style={{ 
                        padding: '6px 12px', borderRadius: '6px', 
                        background: 'var(--color-success-500)', 
                        border: 'none', 
                        color: '#fff', 
                        fontSize: '0.7rem', fontWeight: 800, 
                        cursor: hasChanges ? 'pointer' : 'not-allowed', 
                        opacity: hasChanges ? 1 : 0.5,
                        transition: 'all 0.2s', 
                        boxShadow: hasChanges ? '0 2px 8px rgba(43, 138, 62, 0.4)' : 'none' 
                      }}>
                      SAVE CHANGES
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 40px' }}>
                  <DataPair label="Receive (รับงาน)" value={line.RecRemark} />
                  <DataPair label="Enamel (ทาสี)" value={line.EnaRemark} />
                  <DataPair label="Crystal (ติดคริสตัล)" value={line.CryRemark} />
                  <DataPair label="Assembly (ประกอบ)" value={line.AsmRemark} />
                  <DataPair label="Shelf (ขึ้นชั้น)" value={line.ShfRemark} />
                  <DataPair label="Pack (แพ็ค)" value={line.PkRemark} />
                  <DataPair label="Prod Remark (หมายเหตุ)" value={line.ProdRemark} />
                  <DataPair label="Order Remark" value={line.OrdRemark} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {[
                    { key: 'RecRemark', label: 'Receive (รับงาน)' },
                    { key: 'EnaRemark', label: 'Enamel (ทาสี)' },
                    { key: 'CryRemark', label: 'Crystal (ติดคริสตัล)' },
                    { key: 'AsmRemark', label: 'Assembly (ประกอบ)' },
                    { key: 'ShfRemark', label: 'Shelf (ขึ้นชั้น)' },
                    { key: 'PkRemark', label: 'Pack (แพ็ค)' },
                    { key: 'ProdRemark', label: 'Prod Remark (หมายเหตุ)' }
                  ].map(field => (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>{field.label}</label>
                      <input 
                        type="text" 
                        value={(remarks as any)[field.key]} 
                        onChange={(e) => setRemarks(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={`Enter ${field.label}...`}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border-light)', background: 'var(--color-surface-0)', fontSize: '0.75rem', color: 'var(--color-text-primary)', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-success-500)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-border-light)'}
                      />
                    </div>
                  ))}
                  {/* Order Remark is generally read-only or managed elsewhere, but adding it for completeness if needed. We leave it as DataPair or read-only here */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                    <DataPair label="Order Remark (Read-only)" value={line.OrdRemark} />
                  </div>
                </div>
              )}
           </div>
        )}

        {/* Toast Notification for Save */}
        {showToast && (
          <div style={{
            position: 'fixed', bottom: '32px', right: '32px',
            background: 'var(--color-surface-0)', border: `1px solid var(--color-success-500)`,
            borderRadius: '12px', padding: '16px 24px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: '16px',
            animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: 'var(--color-text-primary)'
          }}>
             <div style={{ background: 'var(--color-success-100)', color: 'var(--color-success-700)', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={20} strokeWidth={3} />
             </div>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Saved Successfully</span>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Remarks for Line #{index + 1} updated.</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { poNo, ordNo, cust, addr, kind, mat, duedate } = useParams<{ poNo?: string; ordNo?: string; cust?: string; addr?: string; kind?: string; mat?: string; duedate?: string; }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isGroup = Boolean(cust && addr && kind && mat && duedate);
  const isPo = Boolean(poNo);
  const rawKey = isGroup ? 'Group' : (isPo ? poNo! : ordNo!);

  const viewParam = (searchParams.get('view') as ViewMode) || 'prod';
  const [view, setView] = useState<ViewMode>(viewParam);

  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  const load = useCallback(async () => {
    if (!rawKey) return;
    setLoading(true); setError(null);
    try {
      let data: OrderDetail;
      if (isGroup) {
        data = await fetchOrderByGroup(cust!, decodeURIComponent(addr!), kind!, mat!, duedate!) as unknown as OrderDetail;
      } else if (isPo) {
        data = await fetchOrderByPo(decodeURIComponent(rawKey)) as unknown as OrderDetail;
      } else {
        data = await fetchOrderDetail(decodeURIComponent(rawKey));
      }
      setDetail(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [rawKey, isGroup, isPo, cust, addr, kind, mat, duedate]);

  useEffect(() => { load(); }, [load]);

  const h = detail?.header;
  const rawLines = (detail?.lines ?? []) as unknown as Record<string, unknown>[];
  
  // High-fidelity statistics calculations
  const uniqueOrders = new Set(rawLines.map(l => String(l.OrdNo || l.PONo || '')).filter(Boolean));
  const ordersCount = uniqueOrders.size;
  const totalQtySum = rawLines.reduce((sum, l) => sum + Number(l.TotalQty || l.Qty || 0), 0);
  const totalAmountSum = rawLines.reduce((sum, l) => sum + Number(l.Amount || l.SumAmnt || 0), 0);
  const displayAmount = (h as any)?.TotalAmount || (h as any)?.SumAmnt || totalAmountSum;

  // Filter lines locally
  const lines = rawLines.filter(line => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return Object.values(line).some(v => String(v).toLowerCase().includes(s));
  });

  const pageTitle = isGroup 
    ? 'Group PO By ShipTo'
    : (isPo ? (h as any)?.PONo || decodeURIComponent(rawKey) : decodeURIComponent(rawKey));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-surface-1)' }}>
      <Topbar 
        hideSearch
        breadcrumb={[
          { label: 'JEWELRY SMART FACTORY', path: '/' },
          { label: 'ORDER TRACKER', path: '/order-tracker' },
          { label: pageTitle },
        ]} 
      />

      {/* ── Top Bar (Relocated Info & Search) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border-light)',
        boxShadow: '0 4px 20px -12px rgba(0,0,0,0.1)', zIndex: 50,
        flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {isGroup ? 'Grouped Orders' : (isPo ? 'Purchase Order' : 'Order Document')}
              </div>
              <div style={{ fontWeight: 900, fontSize: '1.4rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {pageTitle}
              </div>
            </div>

            {h && (
              <>
                <div style={{ width: '1px', height: '32px', background: 'var(--color-border-light)' }} />
                <div style={{ display: 'flex', gap: '40px' }}>
                  {/* Customer */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>CUSTOMER</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>{h.CustCode}</span>
                  </div>

                  {/* Total Quantity */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>TOTAL QUANTITY</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-brand-600)' }}>
                      {fQty(h.TotalQty || totalQtySum)} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>PCS</span>
                    </span>
                  </div>

                  {/* Total Orders */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>TOTAL ORDERS</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                      {ordersCount.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>DOCS</span>
                    </span>
                  </div>

                  {/* Total Amount */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>TOTAL AMOUNT (USD)</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-success-500)' }}>
                      ${fAmt(displayAmount)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Internal Search */}
          <div style={{ position: 'relative', width: '320px' }}>
             <input 
               type="text"
               placeholder="Search items, metals, plating..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               style={{
                 width: '100%', padding: '12px 16px 12px 42px', borderRadius: '14px',
                 background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)',
                 fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)',
                 outline: 'none', transition: 'all 0.2s',
                 boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
               }}
               onFocus={e => {
                 e.currentTarget.style.borderColor = 'var(--color-brand-500)';
                 e.currentTarget.style.boxShadow = '0 0 0 4px color-mix(in srgb, var(--color-brand-500), transparent 90%)';
               }}
               onBlur={e => {
                 e.currentTarget.style.borderColor = 'var(--color-border-light)';
                 e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)';
               }}
             />
             <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}>
               <Search size={18} />
             </div>
          </div>

          {/* View Toggles */}
          <div style={{ display: 'flex', padding: '4px', borderRadius: '14px', background: 'var(--color-surface-1)', border: '1px solid var(--color-border-light)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            {VIEW_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setView(t.key as ViewMode)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800, 
                  background: view === t.key ? 'var(--color-surface-0)' : 'transparent',
                  color: view === t.key ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                  boxShadow: view === t.key ? '0 4px 12px -2px rgba(0,0,0,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase'
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Action Buttons: Excel / Photo / Close ── */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Excel Export */}
            <button
              onClick={() => exportToExcel(lines, h, pageTitle)}
              disabled={loading || lines.length === 0}
              title="Export to Excel"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #217346, #2d9b5e)',
                border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 800,
                cursor: loading || lines.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || lines.length === 0 ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(33,115,70,0.3)',
                transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.03em'
              }}
              onMouseOver={e => { if (!loading && lines.length > 0) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <FileSpreadsheet size={16} /> Excel
            </button>

            {/* Photo Gallery */}
            <button
              onClick={() => setShowPhotoGallery(true)}
              disabled={loading}
              title="View All Photos"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #7048e8, #9775fa)',
                border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(112,72,232,0.3)',
                transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.03em'
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Image size={16} /> Photo
            </button>

            {/* Close (Back to Order Tracker) */}
            <button
              onClick={() => navigate('/order-tracker')}
              title="Close & return to Order Tracker"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #e03131, #f06595)',
                border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(224,49,49,0.3)',
                transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.03em'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <X size={16} /> Close
            </button>

            {/* Refresh */}
            <button
              onClick={load}
              title="Refresh Data"
              style={{ 
                width: 42, height: 42, borderRadius: '12px', border: '1px solid var(--color-border-light)', 
                background: 'var(--color-surface-1)', color: 'var(--color-text-secondary)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '12px 24px', background: '#ffe3e3', borderBottom: '1px solid #ffc9c9', color: '#c92a2a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── Main Content List ── */}
      <div className="custom-scrollbar" style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '24px',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-text-tertiary)' }}>
             <RefreshCw size={32} className="animate-spin" style={{ opacity: 0.2, marginBottom: '16px' }} />
             <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading world-class data...</div>
          </div>
        ) : lines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}>📦</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>No item data available</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '1600px', margin: '0 auto' }}>
            {lines.map((line, i) => (
              <OrderLineCard key={i} line={line} index={i} viewMode={view} />
            ))}
          </div>
        )}
      </div>

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <PhotoGalleryModal lines={lines} onClose={() => setShowPhotoGallery(false)} />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .order-line-card:hover { border-color: var(--color-brand-300) !important; box-shadow: 0 8px 24px -4px rgba(0,0,0,0.06) !important; }
      `}</style>
    </div>
  );
}