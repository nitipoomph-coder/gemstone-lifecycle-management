import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalTopbar from './GlobalTopbar';

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(max-width: 819px)').matches) return false;
  return localStorage.getItem('app_sidebar_open') !== 'false';
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarState);
  const location = useLocation();

  useEffect(() => {
    if (!window.matchMedia('(max-width: 819px)').matches) return;
    const closeTimer = window.setTimeout(() => setSidebarOpen(false), 0);
    return () => window.clearTimeout(closeTimer);
  }, [location.pathname]);

  const setSidebar = (isOpen: boolean) => {
    setSidebarOpen(isOpen);
    localStorage.setItem('app_sidebar_open', String(isOpen));
  };

  return (
    <div className="app-shell flex w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebar(!sidebarOpen)} />
      {sidebarOpen && (
        <button
          type="button"
          className="app-sidebar-scrim"
          onClick={() => setSidebar(false)}
          aria-label="Close navigation menu"
        />
      )}
      <div className="flex flex-col flex-1 min-w-0">
        <GlobalTopbar />
        <main className="app-main flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
