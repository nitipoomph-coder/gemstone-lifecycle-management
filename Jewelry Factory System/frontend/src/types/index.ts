// ============================================
// Navigation Types
// ============================================
export interface NavMenuItem {
  id: string;
  label: string;
  code?: string;
  path?: string;
  roles?: string[];
  items?: NavMenuItem[];
}

export interface NavMenuGroup {
  id: string;
  label: string;
  icon: string;
  path?: string;
  items?: NavMenuItem[];
  badge?: number;
  accentColor?: string;
  roles?: string[];
  section?: string;
}

// ============================================
// Document Types
// ============================================
export type DocumentStatus = 'pending' | 'complete' | 'processing';

export interface RecentDocument {
  id: string;
  docNumber: string;
  type: string;
  date: string;
  operator: string;
  status: DocumentStatus;
}

export interface PendingTask {
  id: string;
  title: string;
  meta: string;
  count: number | null;
  priority: 'urgent' | 'normal' | 'low';
}

export interface DashboardStat {
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
  icon: string;
  variant: 'procurement' | 'orders' | 'production' | 'stock';
}

// ============================================
// SIR (Stone Issue Return) Types
// ============================================
export interface SIRDocument {
  docNumber: string;
  date: string;
  refNumber: string;
  supplierCode: string;
  supplierName: string;
  category: string;
  currency: string;
  exchangeRate: number;
  items: SIRItem[];
}

export interface SIRItem {
  seq: number;
  stoneCode: string;
  unit: string;
  grade: string;
  weight: number;
  returnQty: number;
  price: number;
  total: number;
  warehouse: string;
}

export interface DocumentListItem {
  docNumber: string;
  date: string;
}
