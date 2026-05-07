import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // ย่อแถบเมนูโดยอัตโนมัติเมื่อเข้าสู่หน้า Order Tracker
    if (location.pathname === '/order-tracker') {
      setSidebarOpen(false);
    } else {
      // ถ้าเปลี่ยนไปหน้าอื่น อาจจะอยากให้เปิดกลับมา (Optional)
      // setSidebarOpen(true);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
