import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const closeTimer = window.setTimeout(() => setSidebarOpen(false), 0);
    return () => window.clearTimeout(closeTimer);
  }, [location.pathname]);

  useEffect(() => {
    // Auto blur buttons on mouse/pointer release to prevent stuck focus borders
    const handlePointerUp = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement)?.closest('button, [role="button"]');
      if (btn && btn instanceof HTMLElement) {
        window.setTimeout(() => {
          btn.blur();
        }, 0);
      }
    };
    document.addEventListener('pointerup', handlePointerUp);
    return () => document.removeEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="app-main flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
