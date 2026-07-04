import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import DashboardDetail from './pages/DashboardDetail';
import ProcurementDocPage from './pages/document/ProcurementDocPage';
import RequisitionDocPage from './pages/document/RequisitionDocPage';
import SampleDocPage from './pages/document/SampleDocPage';
import POTrackerAdvanced from './pages/POTrackerAdvanced';
import OrderDetailPage from './pages/OrderDetailPage';
import ItemDetailPage from './pages/ItemDetailPage';
import PlaceholderPage from './pages/PlaceholderPage';
import VendorPerformanceDashboardPage from './pages/subcontract/VendorPerformanceDashboardPage';
import SalesDashboard from './pages/SalesDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerReportPage from './pages/CustomerReportPage';
import TopOrdersGalleryPage from './pages/TopOrdersGalleryPage';
import LoginPage from './pages/LoginPage';

import { useLocation } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('auth_token');
  const role = localStorage.getItem('auth_role');
  const isAuthenticated = token !== null && role !== null;
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Prevent sales from accessing root Production Dashboard
  if (role === 'sales' && location.pathname === '/') {
    return <Navigate to="/dashboard/customer" replace />;
  }

  return <Outlet />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full screen routes (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard/detail" element={<DashboardDetail />} />
            <Route path="/dashboard/sales" element={<SalesDashboard />} />
            <Route path="/dashboard/customer" element={<CustomerDashboard metric="amount" />} />
            <Route path="/dashboard/qty" element={<CustomerDashboard metric="qty" />} />
            <Route path="/dashboard/customer-report" element={<CustomerReportPage />} />
            <Route path="/dashboard/top-Orders" element={<TopOrdersGalleryPage />} />


            {/* 1. จัดซื้อและรับเข้า — SPA, SRA, SRB, SIR */}
            <Route path="/procurement/purchase" element={<ProcurementDocPage />} />
            <Route path="/procurement/receive" element={<ProcurementDocPage />} />
            <Route path="/procurement/receive-b" element={<ProcurementDocPage />} />
            <Route path="/procurement/return" element={<ProcurementDocPage />} />

            {/* 2. ออเดอร์และการเบิก — SOA, SIA, SIB, SIP, SIS */}
            <Route path="/orders/create" element={<RequisitionDocPage />} />
            <Route path="/orders/issue" element={<RequisitionDocPage />} />
            <Route path="/orders/issue-b" element={<RequisitionDocPage />} />
            <Route path="/orders/repair" element={<RequisitionDocPage />} />
            <Route path="/orders/dispatch-order" element={<RequisitionDocPage />} />

            {/* 3. ห้องตัวอย่าง — SSA, SIM */}
            <Route path="/sample/order" element={<SampleDocPage />} />
            <Route path="/sample/dispatch" element={<SampleDocPage />} />

            {/* 4. ตรวจสอบและนับสต็อก (ตาม DFD) */}
            <Route path="/inventory/check-dispatch" element={<PlaceholderPage />} />
            <Route path="/inventory/check-sample" element={<PlaceholderPage />} />
            <Route path="/inventory/check-purchase" element={<PlaceholderPage />} />
            <Route path="/inventory/audit" element={<PlaceholderPage />} />
            <Route path="/inventory/check-stock" element={<PlaceholderPage />} />
            <Route path="/inventory/check-status" element={<PlaceholderPage />} />

            {/* 5. สต็อกอะไหล่ */}
            <Route path="/spare-parts/order" element={<PlaceholderPage />} />
            <Route path="/spare-parts/issue" element={<PlaceholderPage />} />
            <Route path="/spare-parts/receive" element={<PlaceholderPage />} />
            <Route path="/spare-parts/purchase-request" element={<PlaceholderPage />} />
            <Route path="/spare-parts/purchase-order" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-order" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-stock" element={<PlaceholderPage />} />
            <Route path="/spare-parts/summary-stock" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-item" element={<PlaceholderPage />} />
            <Route path="/spare-parts/check-status" element={<PlaceholderPage />} />

            {/* 6. งานเหมา (Subcontract Management) — Vendor Performance Dashboard has a static layout-only
                preview (no backend yet); the other two stay on the generic Placeholder for now */}
            <Route path="/subcontract/vendor-performance" element={<VendorPerformanceDashboardPage />} />
            <Route path="/subcontract/vendor-price-history" element={<PlaceholderPage />} />
            <Route path="/subcontract/aging-report" element={<PlaceholderPage />} />

            {/* PO Tracker */}
            <Route path="/po-tracker" element={<POTrackerAdvanced />} />
            <Route path="/po-tracker/group/:cust/:addr/:kind/:mat/:duedate" element={<OrderDetailPage />} />
            <Route path="/po-tracker/po/:poNo" element={<OrderDetailPage />} />
            <Route path="/po-tracker/ord/:ordNo" element={<OrderDetailPage />} />
            {/* Fallback route */}
            <Route path="/po-tracker/:ordNo" element={<OrderDetailPage />} />
            <Route path="/item-detail/:id" element={<ItemDetailPage />} />

            {/* Fallback */}
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

