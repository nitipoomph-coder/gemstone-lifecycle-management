import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SIRPage from './pages/SIRPage';
import SIMPage from './pages/SIMPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* 1. จัดซื้อและรับเข้า — SPA, SRA, SRB, SIR (CHK-SPA รวมเป็น view ใน SPA) */}
          <Route path="/procurement/purchase" element={<PlaceholderPage />} />
          <Route path="/procurement/receive" element={<PlaceholderPage />} />
          <Route path="/procurement/receive-b" element={<PlaceholderPage />} />
          <Route path="/procurement/return" element={<SIRPage />} />

          {/* 2. ออเดอร์และการเบิก — SOA, SIA, SIB, SIP, SIS */}
          <Route path="/orders/create" element={<PlaceholderPage />} />
          <Route path="/orders/issue" element={<PlaceholderPage />} />
          <Route path="/orders/issue-b" element={<PlaceholderPage />} />
          <Route path="/orders/repair" element={<PlaceholderPage />} />
          <Route path="/orders/dispatch-order" element={<PlaceholderPage />} />

          {/* 3. ห้องตัวอย่าง — SSA, SIM */}
          <Route path="/sample/order" element={<PlaceholderPage />} />
          <Route path="/sample/dispatch" element={<SIMPage />} />

          {/* 4. ตรวจสอบและนับสต็อก (ตาม DFD) */}
          <Route path="/inventory/check-dispatch" element={<PlaceholderPage />} />
          <Route path="/inventory/check-sample" element={<PlaceholderPage />} />
          <Route path="/inventory/check-purchase" element={<PlaceholderPage />} />
          <Route path="/inventory/audit" element={<PlaceholderPage />} />
          <Route path="/inventory/check-stock" element={<PlaceholderPage />} />
          <Route path="/inventory/check-status" element={<PlaceholderPage />} />

          {/* Fallback */}
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

