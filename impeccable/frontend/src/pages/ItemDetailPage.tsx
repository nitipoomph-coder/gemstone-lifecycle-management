// src/pages/ItemDetailPage.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import { ChevronLeft, Printer, Image as ImageIcon, CheckCircle, FileText, Settings, Layers, Hash, Calendar, DollarSign, Box } from 'lucide-react';

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stone' | 'finding' | 'cast'>('stone');

  // Mock Data based on the user's screenshot
  const itemData = {
    pdsNo: 'PDS26040921', from: 'PDN26040201', psNo: 'PS248652A', itemNo: id || 'BES32753A',
    round: 'R2', sales: 'Buum-Buum', customer: 'N031', metal: 'B-Brass', productType: 'E-Earring',
    sampleQty: [2, 0, 2], devNo: '25FW-FG-03', size: '', length: '', collection: '10_25FW-FG',
    stampOn: '1.Mold', stamp: 'MG', source: '', estMetalWt: '', targetPrice: '0.00',
    orderNo: '', orderRingSize: '', enamelEpoxy: '', plating: '14K-YGH0.125M/EC',
    dueDate: '22/04/2026', receiveDate: '27/04/2026', cancelDate: '',
    castWt: 11.10, filingWt: 0.00, finishWt: 0.00,
    remarks: ['แค้ขอบล้นด้านในที่รองกระเปาะ', 'ให้เลี้ยงปีกเพื่อรองรับพลอย', 'ออเดอร์พลอยหลุดเยอะมาก']
  };

  const stoneList = [
    { no: 1, code: 'CZ', photo: true, name: 'White CZ', shape: 'PS', size: '9*14', cut: 'FAC', grade: 'A', set: 'GSH', wt: '0.0000', qty: 2, modifyDate: '06/11/2024' },
    { no: 2, code: 'CZ', photo: true, name: 'White CZ', shape: 'PS', size: '5*8', cut: 'FAC', grade: 'A', set: 'GSH', wt: '0.0000', qty: 2, modifyDate: '06/11/2024' },
    { no: 3, code: 'CZ', photo: true, name: 'White CZ', shape: 'RD', size: '8', cut: 'FAC', grade: 'A', set: 'GSH', wt: '0.0000', qty: 2, modifyDate: '06/11/2024' },
    { no: 4, code: 'CZ', photo: true, name: 'White CZ', shape: 'RD', size: '6', cut: 'FAC', grade: 'A', set: 'GSH', wt: '0.0000', qty: 6, modifyDate: '06/11/2024' },
    { no: 5, code: 'CZ', photo: true, name: 'White CZ', shape: 'RD', size: '4', cut: 'FAC', grade: 'A', set: 'GSH', wt: '0.0000', qty: 2, modifyDate: '06/11/2024' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f6f8' }}>
      <Topbar breadcrumb={[
        { label: 'JEWELRY SMART FACTORY', path: '/' },
        { label: 'ORDER TRACKER', path: '/order-tracker' },
        { label: itemData.itemNo }
      ]} />

      <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
        
        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={btnStyle('#fff', '#495057')}>
              <ChevronLeft size={16} /> กลับ
            </button>
            <div style={{ padding: '4px 16px', background: '#004b8d', color: '#fff', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,75,141,0.2)' }}>
              <Box size={18} /> ITEM DETAIL: {itemData.itemNo}
            </div>
          </div>
          <button style={btnStyle('#1971c2', '#fff')} onClick={() => window.print()}>
            <Printer size={16} /> พิมพ์ใบงาน
          </button>
        </div>

        {/* ─── MASTER CARD ─── */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #dee2e6', boxShadow: '0 8px 24px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: '24px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            
            {/* Left Column (Main Info) */}
            <div style={{ flex: '1 1 300px', padding: '20px', borderRight: '1px solid #e9ecef', background: '#fafbfc' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#004b8d', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={16} /> Primary Data
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <FieldRow label="PDS no." value={itemData.pdsNo} highlight />
                <FieldRow label="From" value={itemData.from} />
                <FieldRow label="PS no." value={itemData.psNo} />
                <FieldRow label="Customer" value={itemData.customer} bold />
                <FieldRow label="Sales" value={itemData.sales} />
                <FieldRow label="Product Type" value={itemData.productType} />
                <FieldRow label="Collection" value={itemData.collection} />
                <FieldRow label="Dev no." value={itemData.devNo} />
              </div>
            </div>

            {/* Middle Column (Photos & Tech Spec) */}
            <div style={{ flex: '2 1 500px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Photo Area */}
              <div style={{ display: 'flex', gap: '16px', height: '180px' }}>
                <div style={{ flex: 1, background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #ced4da', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ImageIcon size={32} style={{ color: '#dee2e6' }} />
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '0.65rem', color: '#adb5bd', fontWeight: 700 }}>FRONT VIEW</div>
                </div>
                <div style={{ flex: 1, background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #ced4da', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ImageIcon size={32} style={{ color: '#dee2e6' }} />
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '0.65rem', color: '#adb5bd', fontWeight: 700 }}>SIDE/TECH VIEW</div>
                </div>
              </div>

              {/* Tech Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FieldRow label="Metal" value={itemData.metal} highlight />
                  <FieldRow label="Stamp on" value={itemData.stampOn} />
                  <FieldRow label="Plating" value={itemData.plating} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FieldRow label="Due Date" value={itemData.dueDate} warning />
                  <FieldRow label="Target Price" value={`$${itemData.targetPrice}`} />
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #e9ecef', marginTop: '8px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#868e96', marginBottom: '8px' }}>WEIGHT (g)</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: '#495057' }}>Cast: <b>{itemData.castWt}</b></span>
                      <span style={{ color: '#495057' }}>Filing: <b>{itemData.filingWt}</b></span>
                      <span style={{ color: '#495057' }}>Finish: <b>{itemData.finishWt}</b></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Remarks & Extra) */}
            <div style={{ flex: '1 1 300px', padding: '20px', borderLeft: '1px solid #e9ecef', background: '#fff' }}>
               <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#e67700', marginBottom: '16px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Remarks & Instructions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {itemData.remarks.map((rmk, idx) => (
                  <div key={idx} style={{ background: '#fff9db', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #fcc419', fontSize: '0.75rem', color: '#495057', lineHeight: 1.4 }}>
                    <b style={{ color: '#d9480f' }}>Remark {idx + 1}:</b> {rmk}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#212529' }}>
                  <input type="checkbox" style={{ accentColor: '#1971c2', width: 16, height: 16 }} /> No Cast
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#212529' }}>
                  <input type="checkbox" style={{ accentColor: '#1971c2', width: 16, height: 16 }} /> Resin make sample
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ─── BOTTOM TABS (BOM) ─── */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          
          {/* Tab Header */}
          <div style={{ display: 'flex', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <TabBtn label={`Stone (${stoneList.length})`} active={activeTab === 'stone'} onClick={() => setActiveTab('stone')} icon={<Layers size={14} />} />
            <TabBtn label="Finding (2)" active={activeTab === 'finding'} onClick={() => setActiveTab('finding')} icon={<Settings size={14} />} />
            <TabBtn label="Cast (4)" active={activeTab === 'cast'} onClick={() => setActiveTab('cast')} icon={<CheckCircle size={14} />} />
          </div>

          {/* Tab Content (Table) */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#e7f5ff', borderBottom: '2px solid #74c0fc' }}>
                  <th style={TH}>No.</th>
                  <th style={TH}>Stone Code</th>
                  <th style={{...TH, textAlign: 'center'}}>Photo</th>
                  <th style={TH}>Stone Name</th>
                  <th style={TH}>Shape</th>
                  <th style={TH}>Size</th>
                  <th style={TH}>Cut</th>
                  <th style={TH}>Grade</th>
                  <th style={TH}>Set</th>
                  <th style={{...TH, textAlign: 'right'}}>Wt (ct)</th>
                  <th style={{...TH, textAlign: 'right'}}>Qty</th>
                  <th style={TH}>Remark</th>
                  <th style={TH}>Modify Date</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === 'stone' && stoneList.map((st, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e9ecef', background: i % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                    <td style={{...TD, fontWeight: 700, color: '#1971c2'}}>{st.no}</td>
                    <td style={TD}>{st.code}</td>
                    <td style={{...TD, textAlign: 'center'}}><ImageIcon size={14} style={{ color: '#adb5bd', margin: '0 auto' }} /></td>
                    <td style={TD}>{st.name}</td>
                    <td style={TD}>{st.shape}</td>
                    <td style={TD}>{st.size}</td>
                    <td style={TD}>{st.cut}</td>
                    <td style={TD}>{st.grade}</td>
                    <td style={TD}>{st.set}</td>
                    <td style={{...TD, textAlign: 'right'}}>{st.wt}</td>
                    <td style={{...TD, textAlign: 'right', fontWeight: 700}}>{st.qty}</td>
                    <td style={TD}></td>
                    <td style={{...TD, color: '#868e96'}}>{st.modifyDate}</td>
                  </tr>
                ))}
                {activeTab !== 'stone' && (
                  <tr>
                    <td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: '#adb5bd', fontSize: '0.85rem' }}>
                      Mockup data for {activeTab} will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Component Helpers ───

function FieldRow({ label, value, highlight, bold, warning }: any) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px dotted #dee2e6', paddingBottom: '4px' }}>
      <div style={{ width: '100px', fontSize: '0.7rem', color: '#868e96', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{label}</div>
      <div style={{ 
        flex: 1, 
        fontSize: '0.8rem', 
        fontWeight: highlight || bold || warning ? 800 : 500, 
        color: warning ? '#e03131' : highlight ? '#004b8d' : '#212529',
        background: highlight ? '#e7f5ff' : warning ? '#ffe3e3' : 'transparent',
        padding: highlight || warning ? '2px 8px' : '2px 0',
        borderRadius: '4px'
      }}>
        {value || <span style={{ color: '#ced4da' }}>—</span>}
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick, icon }: any) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '12px 24px', fontSize: '0.8rem', fontWeight: 800, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
        background: active ? '#fff' : 'transparent',
        color: active ? '#1971c2' : '#868e96',
        borderTop: active ? '3px solid #1971c2' : '3px solid transparent',
        boxShadow: active ? '0 -2px 10px rgba(0,0,0,0.02)' : 'none'
      }}
    >
      {icon} {label}
    </button>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
    border: '1px solid #ced4da', background: bg, color: color,
    cursor: 'pointer', transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  };
}

const TH: React.CSSProperties = { padding: '12px 16px', color: '#004b8d', fontWeight: 800 };
const TD: React.CSSProperties = { padding: '12px 16px', color: '#495057' };
