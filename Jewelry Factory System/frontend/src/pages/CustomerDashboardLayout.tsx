import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchAvailableYears } from '../services/dashboardAPI';
import './CustomerDashboard.css';

export default function CustomerDashboardLayout() {
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
