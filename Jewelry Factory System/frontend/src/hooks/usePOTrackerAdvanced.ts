import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GROUP_PRESETS } from '../components/dashboard/poTracker/orderTableConfig';
import { fetchOrders, type OrderSummary } from '../services/orderAPI';
import { getErrorMessage } from '../utils/errors';

export type StatusFilter = 'pending' | 'finish' | 'all';
export const EMPTY_ORDERS: OrderSummary[] = [];

export const parseStatusFilter = (value: string | null): StatusFilter =>
  value === 'finish' || value === 'all' ? value : 'pending';

export const getSavedColumns = (group: string): string[] => {
  if (group !== 'CUSTOM') return GROUP_PRESETS[group] || GROUP_PRESETS.ALL;
  const saved = localStorage.getItem('poTrackerCustomCols');
  if (!saved) return GROUP_PRESETS.ALL;
  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.every(key => typeof key === 'string') ? parsed : GROUP_PRESETS.ALL;
  } catch {
    return GROUP_PRESETS.ALL;
  }
};

export const getDefaultDateRange = () => {
  const from = new Date();
  from.setMonth(from.getMonth() - 7);
  return { from: from.toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] };
};

export function usePOTrackerAdvanced() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const search = searchParams.get('search') || '';

  const [selectedStatusFilter, setStatusFilter] = useState<StatusFilter>(() => parseStatusFilter(searchParams.get('status')));
  const [selectedGroupFilter, setGroupFilter] = useState<string>(() => searchParams.get('group') || 'N008');
  const [dateType, setDateType] = useState(() => searchParams.get('dateType') || 'Order Date');
  const [requestedPage, setPage] = useState(() => parseInt(searchParams.get('page') || '1'));
  const [pageSize, setPageSize] = useState(() => parseInt(searchParams.get('pageSize') || '20'));

  const [filterType, setFilterType] = useState(() => searchParams.get('fType') || '');
  const [filterWeek, setFilterWeek] = useState(() => searchParams.get('fWeek') || '');
  const [filterCust, setFilterCust] = useState(() => searchParams.get('fCust') || '');
  const [filterPO, setFilterPO] = useState(() => searchParams.get('fPO') || '');
  const [filterShipTo, setFilterShipTo] = useState(() => searchParams.get('fShipTo') || '');

  const [showFiltersPopover, setShowFiltersPopover] = useState(false);

  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || getDefaultDateRange().to);

  const smartFilters = useMemo(() => {
    const keywords = search.toLowerCase().split(' ').filter(Boolean);
    let status: StatusFilter | undefined;
    let group: string | undefined;

    if (keywords.some(k => ['pending', 'p'].includes(k))) status = 'pending';
    else if (keywords.some(k => ['finish', 'f', 'complete'].includes(k))) status = 'finish';
    else if (keywords.some(k => ['all'].includes(k))) status = 'all';

    if (keywords.some(k => k.includes('n098'))) group = 'N098';
    else if (keywords.some(k => k.includes('n083'))) group = 'N083';
    else if (keywords.some(k => k.includes('n051'))) group = 'N051';
    else if (keywords.some(k => k.includes('n044'))) group = 'N044';
    else if (keywords.some(k => k.includes('mlt') || k.startsWith('u'))) group = 'MLT';
    else {
      const n008List = ['n008', 'n048', 'n066', 'n067', 'n068', 'n069', 'n070', 'n071', 'n072', 'n073', 'n074', 'n075'];
      if (keywords.some(k => n008List.some(code => k.includes(code)))) group = 'N008';
    }

    return { status, group };
  }, [search]);

  const statusFilter = smartFilters.status ?? selectedStatusFilter;
  const groupFilter = smartFilters.group ?? selectedGroupFilter;

  const [columnState, setColumnState] = useState(() => ({ group: groupFilter, keys: getSavedColumns(groupFilter) }));
  const visibleKeys = columnState.group === groupFilter ? columnState.keys : getSavedColumns(groupFilter);
  const setVisibleKeys = (keys: string[]) => setColumnState({ group: groupFilter, keys });

  const [refreshVersion, setRefreshVersion] = useState(0);
  const ordersKey = `${statusFilter}:${dateType}:${dateFrom}:${dateTo}:${refreshVersion}`;
  const [ordersState, setOrdersState] = useState<{
    key: string;
    orders: OrderSummary[];
    error: string | null;
  }>({ key: '', orders: [], error: null });
  const hasCurrentOrders = ordersState.key === ordersKey;
  const orders = hasCurrentOrders ? ordersState.orders : EMPTY_ORDERS;
  const error = hasCurrentOrders ? ordersState.error : null;
  const loading = !hasCurrentOrders;
  // Sync incoming URL changes to state (e.g. from Topbar global search)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    const newFPO = params.get('fPO') || '';
    setFilterPO(prev => (prev !== newFPO ? newFPO : prev));

    const newFCust = params.get('fCust') || '';
    setFilterCust(prev => (prev !== newFCust ? newFCust : prev));
  }, [location.search]);

  // Sync state back to URL automatically
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== 'pending') params.set('status', statusFilter);
    if (groupFilter !== 'N008') params.set('group', groupFilter);
    if (dateType !== 'Order Date') params.set('dateType', dateType);
    if (requestedPage !== 1) params.set('page', requestedPage.toString());
    if (pageSize !== 20) params.set('pageSize', pageSize.toString());
    if (filterType) params.set('fType', filterType);
    if (filterWeek) params.set('fWeek', filterWeek);
    if (filterCust) params.set('fCust', filterCust);
    if (filterPO) params.set('fPO', filterPO);
    if (filterShipTo) params.set('fShipTo', filterShipTo);

    const defaultRange = getDefaultDateRange();
    if (dateFrom !== defaultRange.from) params.set('dateFrom', dateFrom);
    if (dateTo !== defaultRange.to) params.set('dateTo', dateTo);

    navigate({ search: params.toString() }, { replace: true });
  }, [search, statusFilter, groupFilter, dateType, requestedPage, pageSize, dateFrom, dateTo, filterType, filterWeek, filterCust, filterPO, filterShipTo, navigate]);

  useEffect(() => {
    let cancelled = false;
    fetchOrders({
        status: statusFilter as 'pending' | 'all' | 'finish',
        dateType: dateType,
        dateFrom: dateFrom,
        dateTo: dateTo
      })
      .then(result => {
        if (cancelled) return;
        if (result.ok) {
          setOrdersState({ key: ordersKey, orders: result.data, error: null });
        } else {
          setOrdersState({ key: ordersKey, orders: [], error: result.error || 'Failed to load data from API' });
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setOrdersState({ key: ordersKey, orders: [], error: getErrorMessage(requestError, 'Failed to load data') });
        }
      });
    return () => { cancelled = true; };
  }, [statusFilter, dateType, dateFrom, dateTo, ordersKey]);

  const load = () => setRefreshVersion(version => version + 1);

  useEffect(() => {
    if (groupFilter === 'CUSTOM') {
      localStorage.setItem('poTrackerCustomCols', JSON.stringify(visibleKeys));
    }
  }, [visibleKeys, groupFilter]);

  const [showCustomViewModal, setShowCustomViewModal] = useState(false);

  const filtered = useMemo(() => {
    let filteredList = orders;

    if (groupFilter !== 'ALL' && groupFilter !== 'CUSTOM') {
      if (groupFilter === 'N008') {
        const n008List = ['N008', 'N048', 'N066', 'N067', 'N068', 'N069', 'N070', 'N071', 'N072', 'N073', 'N074', 'N075'];
        filteredList = filteredList.filter(o => o.CustCode && n008List.some(code => o.CustCode!.includes(code)));
      }
      else if (groupFilter === 'MLT') filteredList = filteredList.filter(o => o.CustCode?.includes('MLT') || o.CustCode?.startsWith('U'));
      else if (groupFilter === 'N083') filteredList = filteredList.filter(o => o.CustCode?.includes('N083'));
      else if (groupFilter === 'N044') filteredList = filteredList.filter(o => o.CustCode?.includes('N044'));
      else if (groupFilter === 'N098') filteredList = filteredList.filter(o => o.CustCode?.includes('N098'));
      else if (groupFilter === 'N051') filteredList = filteredList.filter(o => o.CustCode?.includes('N051'));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const keywords = q.split(' ').filter(k => k.length > 0);

      const dataKeywords = keywords.filter(k =>
        !['pending', 'finish', 'complete', 'all', 'late', 'delay'].includes(k) &&
        !['n008', 'n098', 'n083', 'n051', 'n044', 'mlt'].includes(k)
      );

      if (dataKeywords.length > 0) {
        filteredList = filteredList.filter(o =>
          dataKeywords.every(kw =>
            o.OrdNo?.toLowerCase().includes(kw) ||
            o.CustCode?.toLowerCase().includes(kw) ||
            o.ShipTo?.toLowerCase().includes(kw) ||
            o.PONo?.toLowerCase().includes(kw) ||
            o.Week?.toString().toLowerCase().includes(kw) ||
            o.OrdKind?.toLowerCase().includes(kw)
          )
        );
      }

      if (keywords.some(k => ['late', 'delay'].includes(k))) {
        filteredList = filteredList.filter(o => o.DueDate && new Date(o.DueDate) < new Date() && (o.CloseStatus !== 'Y'));
      }
    }

    const qWeek = filterWeek.trim().toLowerCase();
    if (qWeek) {
      filteredList = filteredList.filter(o => {
        const val = String(o.Week ?? '').trim().toLowerCase();
        return val.includes(qWeek);
      });
    }

    const qCust = filterCust.trim().toLowerCase();
    if (qCust) {
      filteredList = filteredList.filter(o => {
        const val = String(o.CustCode ?? '').trim().toLowerCase();
        return val.includes(qCust);
      });
    }

    const qPO = filterPO.trim().toLowerCase();
    if (qPO) {
      filteredList = filteredList.filter(o => {
        const poVal = String(o.PONo ?? '').trim().toLowerCase();
        const ordVal = String(o.OrdNo ?? '').trim().toLowerCase();
        return poVal.includes(qPO) || ordVal.includes(qPO);
      });
    }

    const qType = filterType.trim().toLowerCase();
    if (qType) {
      filteredList = filteredList.filter(o => {
        const val = String(o.OrdKind ?? '').trim().toLowerCase();
        return val.includes(qType);
      });
    }

    const qShipTo = filterShipTo.trim().toLowerCase();
    if (qShipTo) {
      filteredList = filteredList.filter(o => {
        const val = String(o.ShipTo ?? '').trim().toLowerCase();
        return val.includes(qShipTo);
      });
    }

    return filteredList;
  }, [search, orders, groupFilter, filterType, filterWeek, filterCust, filterPO, filterShipTo]);

  const totalQty = filtered.reduce((s, o) => s + (o.TotalQty || 0), 0);
  const totalAmount = filtered.reduce((s, o) => s + (o.Amount || 0), 0);
  const pendingCount = statusFilter === 'finish' ? 0 : filtered.length;
  const delayedCount = statusFilter === 'finish' ? 0 : filtered.filter(o => o.DueDate && new Date(o.DueDate) < new Date()).length;

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    orders.forEach(o => {
      if (o.OrdKind && o.OrdKind !== '-') types.add(o.OrdKind.trim());
    });
    return Array.from(types).sort();
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageStart = (page - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  })();

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterWeek) chips.push({ key: 'week', label: `Week: ${filterWeek}`, onClear: () => setFilterWeek('') });
    if (filterCust) chips.push({ key: 'cust', label: `Cust: ${filterCust}`, onClear: () => setFilterCust('') });
    if (filterPO) chips.push({ key: 'po', label: `PO: ${filterPO}`, onClear: () => setFilterPO('') });
    if (filterType) chips.push({ key: 'type', label: `Type: ${filterType}`, onClear: () => setFilterType('') });
    if (filterShipTo) chips.push({ key: 'shipto', label: `ShipTo: ${filterShipTo}`, onClear: () => setFilterShipTo('') });
    if (dateType !== 'Order Date') chips.push({ key: 'datetype', label: `Date: ${dateType}`, onClear: () => setDateType('Order Date') });
    return chips;
  }, [filterWeek, filterCust, filterPO, filterType, filterShipTo, dateType]);

  const activeFilterCount = activeChips.length;

  return {
    statusFilter,
    setStatusFilter,
    groupFilter,
    setGroupFilter,
    dateType,
    setDateType,
    requestedPage,
    setPage,
    pageSize,
    setPageSize,
    filterType,
    setFilterType,
    filterWeek,
    setFilterWeek,
    filterCust,
    setFilterCust,
    filterPO,
    setFilterPO,
    filterShipTo,
    setFilterShipTo,
    showFiltersPopover,
    setShowFiltersPopover,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    visibleKeys,
    setVisibleKeys,
    loading,
    error,
    load,
    showCustomViewModal,
    setShowCustomViewModal,
    filtered,
    totalQty,
    totalAmount,
    pendingCount,
    delayedCount,
    uniqueTypes,
    totalPages,
    page,
    pageStart,
    paged,
    pageNumbers,
    activeChips,
    activeFilterCount
  };
}
