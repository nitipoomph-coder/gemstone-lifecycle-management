import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { adminAuditAPI, type AuditEvent } from '../../services/adminAuditAPI';
import { useToast } from '../../contexts/ToastContext';

export default function AuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<AuditEvent | null>(null);

  // Clear Logs State
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await adminAuditAPI.clearLogs();
      showToast(res.message || 'Audit logs have been cleared', 'success');
      setShowClearModal(false);
      await fetchLogs(1);
    } catch (err: any) {
      showToast(err.message || 'Failed to clear logs', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const fetchLogs = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const data = await adminAuditAPI.getLogs({
        page: targetPage,
        limit: 50,
        category,
        severity,
        status,
        search,
        fromDate,
        toDate,
      });
      setLogs(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      console.error('[AuditLogs] Fetch error:', err);
      showToast(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [category, severity, status, fromDate, toDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showToast('No logs to export', 'info');
      return;
    }

    const headers = ['Timestamp', 'Severity', 'Category', 'Action', 'Actor', 'IP', 'Status', 'Details'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.severity,
      l.category,
      l.action,
      l.actor,
      l.ip,
      l.status,
      `"${JSON.stringify(l.details).replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported audit logs to CSV', 'success');
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    }
  };

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full text-[var(--color-text-main)] pb-12">
        {/* ─── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-main)] m-0">
                System Audit Trail & History
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                {total} Total Logs
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] m-0">
              Complete chronological audit trail for logins, permissions, data modifications, and security events
            </p>
          </div>
        </div>

        {/* Export and Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => fetchLogs(page)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* ─── Filters & Search Toolbar ──────────────────────────────────────────── */}
      <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by action, user, IP, or payload keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-brand-500)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            Search Logs
          </button>
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)]/50 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-[var(--color-text-muted)]" />
            <span className="text-[var(--color-text-muted)]">Category:</span>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="py-1 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="AUTH">Authentication (AUTH)</option>
              <option value="SECURITY">Security Threats (SECURITY)</option>
              <option value="DATA_CHANGE">Data Changes (DATA_CHANGE)</option>
              <option value="SYSTEM">System Events (SYSTEM)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-text-muted)]">Severity:</span>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="py-1 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-text-muted)]">Status:</span>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="py-1 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="BLOCKED">Blocked</option>
              <option value="WARNING">Warning</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar size={13} className="text-[var(--color-text-muted)]" />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="py-1 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none text-xs"
            />
            <span className="text-[var(--color-text-muted)]">-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="py-1 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* ─── Logs Table ────────────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                <th className="py-2.5 px-3 font-semibold">Severity</th>
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Actor</th>
                <th className="py-2.5 px-3 font-semibold">IP Address</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[var(--color-text-muted)]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[var(--color-text-muted)]">
                    No audit records matching criteria
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--color-surface-2)]/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[var(--color-text-muted)]">
                      {new Date(log.timestamp).toLocaleString('th-TH')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-[var(--color-text-main)]">
                      {log.category}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-[var(--color-text-main)]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-[var(--color-text-main)]">{log.actor}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-semibold text-[var(--color-text-main)]">
                      {log.ip}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.status === 'BLOCKED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : log.status === 'FAILED'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1 rounded hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                        title="View Full Record"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-2 text-xs text-[var(--color-text-muted)]">
          <div>
            Showing Page <strong className="text-[var(--color-text-main)]">{page}</strong> of{' '}
            <strong className="text-[var(--color-text-main)]">{totalPages}</strong> ({total} entries)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => fetchLogs(page - 1)}
              className="p-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono">{page}</span>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => fetchLogs(page + 1)}
              className="p-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Detail Modal ───────────────────────────────────────────────────────── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl w-full max-w-xl p-5 shadow-2xl relative flex flex-col gap-4 text-[var(--color-text-main)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(selectedLog.severity)}`}>
                  {selectedLog.severity}
                </span>
                <h3 className="text-base font-bold m-0">{selectedLog.action}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)] block">Event ID:</span>
                <span className="font-mono text-[11px]">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Timestamp:</span>
                <span className="font-mono">{new Date(selectedLog.timestamp).toLocaleString('th-TH')}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Actor:</span>
                <span className="font-bold">{selectedLog.actor}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Client IP:</span>
                <span className="font-mono font-bold text-amber-400">{selectedLog.ip}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Category:</span>
                <span>{selectedLog.category}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Status:</span>
                <span className="font-semibold">{selectedLog.status}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-[var(--color-text-muted)] block mb-1">Payload / Details:</span>
              <pre className="p-3 rounded-lg bg-[var(--color-surface-2)] text-[11px] font-mono text-[var(--color-text-main)] overflow-x-auto max-h-56 border border-[var(--color-border-subtle)]">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Clear Logs Confirmation Modal ────────────────────────────────────── */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-ui-surface)] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-main)] m-0">Clear All Audit Logs?</h3>
                <p className="text-xs text-[var(--color-text-muted)] m-0">Irreversible security maintenance action</p>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Are you sure you want to permanently clear all audit trail records? All login events, security alerts, and activity logs will be wiped from memory and disk.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} className={isClearing ? 'animate-spin' : ''} />
                <span>{isClearing ? 'Clearing...' : 'Confirm Clear Logs'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
