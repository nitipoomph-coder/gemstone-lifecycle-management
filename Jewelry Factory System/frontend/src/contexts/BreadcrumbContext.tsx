import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { BreadcrumbItem } from '../config/breadcrumbs';

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  parentBreadcrumbs: BreadcrumbItem[];
}

export function getFallbackParentBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === '/') {
    return [];
  }
  if (pathname === '/dashboard/detail') {
    return [{ label: 'Factory Overview', path: '/' }];
  }
  if (pathname.startsWith('/dashboard/sales-customer-detail')) {
    return [
      { label: 'Sales Analytics' },
      { label: 'Order Trends', path: '/dashboard/customer/trends' },
    ];
  }
  if (
    pathname.startsWith('/dashboard/customer') ||
    pathname.startsWith('/dashboard/sales') ||
    pathname.startsWith('/dashboard/qty') ||
    pathname.startsWith('/dashboard/top-orders')
  ) {
    return [{ label: 'Sales Analytics' }];
  }
  if (
    pathname.startsWith('/po-tracker/') &&
    pathname !== '/po-tracker'
  ) {
    return [
      { label: 'Production' },
      { label: 'PO Tracker', path: '/po-tracker' },
    ];
  }
  if (
    pathname === '/po-tracker' ||
    pathname.startsWith('/dashboard/production') ||
    pathname.startsWith('/dashboard/fbe-order-track') ||
    pathname.startsWith('/item-detail')
  ) {
    return [{ label: 'Production' }];
  }
  if (pathname.startsWith('/subcontract')) {
    return [{ label: 'Subcontract Management' }];
  }
  if (pathname.startsWith('/procurement')) {
    return [{ label: 'Procurement & Receiving' }];
  }
  if (pathname.startsWith('/orders')) {
    return [{ label: 'Order Lines & Issues' }];
  }
  if (pathname.startsWith('/sample')) {
    return [{ label: 'Sample Department' }];
  }
  if (pathname.startsWith('/inventory')) {
    return [{ label: 'Inventory Control' }];
  }
  if (pathname.startsWith('/spare-parts')) {
    return [{ label: 'Spare Parts' }];
  }
  return [];
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
  parentBreadcrumbs: [],
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const location = useLocation();

  // Reset breadcrumbs on route change so stale page breadcrumb isn't shown
  useEffect(() => {
    setBreadcrumbs([]);
  }, [location.pathname]);

  const parentBreadcrumbs =
    breadcrumbs.length > 1
      ? breadcrumbs.slice(0, -1)
      : getFallbackParentBreadcrumbs(location.pathname);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs, parentBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext);
}
