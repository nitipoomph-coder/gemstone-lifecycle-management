import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchAvailableYears } from '../services/dashboardAPI';
import { useTopbarActions } from '../contexts/TopbarActionContext';
import { RefreshCw } from 'lucide-react';
import './CustomerDashboard.css';

export default function CustomerDashboardLayout() {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setTopbarActions } = useTopbarActions();

  useEffect(() => {
    fetchAvailableYears().then((years: any) => {
      const stringYears = years.map(String).sort((a: any, b: any) => b.localeCompare(a));
      setAvailableYears(stringYears);
    }).catch(console.error);
  }, []);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setRefreshCounter(c => c + 1);
  };

  useEffect(() => {
    setTopbarActions(
      <button
        type="button"
        onClick={triggerRefresh}
        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border-none bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-brand-600)] transition-colors cursor-pointer"
        title="Refresh Data"
        aria-label="Refresh Data"
      >
        <RefreshCw size={18} strokeWidth={1.75} className={isRefreshing ? 'animate-spin text-[var(--color-brand-600)]' : ''} />
      </button>
    );

    return () => setTopbarActions(null);
  }, [setTopbarActions, isRefreshing]);

  return (
    <>
      <Outlet context={{ 
        availableYears, 
        refreshCounter, 
        isRefreshing, 
        triggerRefresh, 
        setIsRefreshing 
      }} />
    </>
  );
}
