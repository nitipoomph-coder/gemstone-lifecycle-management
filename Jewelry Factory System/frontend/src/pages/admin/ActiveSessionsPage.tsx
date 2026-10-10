import { useState, useEffect } from 'react';
import {
  Users,
  RefreshCw,
  Radio,
  UserX,
  Shield,
  Search,
  AlertCircle,
  LayoutList,
  FileText,
  BarChart3,
  TrendingUp,
  Gem,
  Factory,
  Calendar,
  ScrollText,
  ShoppingCart,
  ClipboardList,
  FlaskConical,
  Handshake,
  Compass,
  Package,
  Image,
  UserCheck,
  ShieldAlert,
  Boxes,
  Eye,
} from 'lucide-react';
import { adminAuditAPI, type ActiveSession } from '../../services/adminAuditAPI';
import { useToast } from '../../contexts/ToastContext';

function renderPageIcon(iconName?: string) {
  switch (iconName) {
    case 'layout-list':
      return <LayoutList size={14} className="text-emerald-400 shrink-0" />;
    case 'file-text':
      return <FileText size={14} className="text-indigo-400 shrink-0" />;
    case 'bar-chart':
      return <BarChart3 size={14} className="text-blue-400 shrink-0" />;
    case 'trending-up':
      return <TrendingUp size={14} className="text-cyan-400 shrink-0" />;
    case 'gem':
      return <Gem size={14} className="text-purple-400 shrink-0" />;
    case 'factory':
      return <Factory size={14} className="text-amber-400 shrink-0" />;
    case 'calendar':
      return <Calendar size={14} className="text-orange-400 shrink-0" />;
    case 'users':
      return <Users size={14} className="text-indigo-400 shrink-0" />;
    case 'shield':
      return <Shield size={14} className="text-rose-400 shrink-0" />;
    case 'scroll-text':
      return <ScrollText size={14} className="text-slate-400 shrink-0" />;
    case 'shopping-cart':
      return <ShoppingCart size={14} className="text-yellow-400 shrink-0" />;
    case 'clipboard-list':
      return <ClipboardList size={14} className="text-emerald-400 shrink-0" />;
    case 'flask':
      return <FlaskConical size={14} className="text-teal-400 shrink-0" />;
    case 'handshake':
      return <Handshake size={14} className="text-blue-400 shrink-0" />;
    default:
      return <Compass size={14} className="text-[var(--color-text-muted)] shrink-0" />;
  }
}

function renderActionIcon(actionType?: string) {
  switch (actionType) {
    case 'search':
      return <Search size={13} className="text-amber-400 shrink-0" />;
    case 'order':
      return <Package size={13} className="text-emerald-400 shrink-0" />;
    case 'chart':
      return <BarChart3 size={13} className="text-blue-400 shrink-0" />;
    case 'photo':
      return <Image size={13} className="text-purple-400 shrink-0" />;
    case 'user':
      return <UserCheck size={13} className="text-indigo-400 shrink-0" />;
    case 'shield':
      return <ShieldAlert size={13} className="text-rose-400 shrink-0" />;
    case 'package':
      return <Boxes size={13} className="text-teal-400 shrink-0" />;
    default:
      return <Eye size={13} className="text-[var(--color-text-muted)] shrink-0" />;
  }
}

export default function ActiveSessionsPage() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Kill Session Modal state
  const [sessionToKill, setSessionToKill] = useState<ActiveSession | null>(null);
  const [isKilling, setIsKilling] = useState(false);

  const fetchSessions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await adminAuditAPI.getSessions();
      setSessions(data);
    } catch (err: any) {
      console.error('[ActiveSessions] Fetch error:', err);
      showToast(err.message || 'Failed to load active sessions', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // 10s auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleKillSession = async () => {
    if (!sessionToKill) return;
    setIsKilling(true);

    try {
      const result = await adminAuditAPI.killSession(sessionToKill.sessionId);
      if (result.success) {
        showToast(`Session terminated for ${sessionToKill.username}`, 'success');
        setSessionToKill(null);
        await fetchSessions(true);
      } else {
        showToast(result.message || 'Failed to terminate session', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error terminating session', 'error');
    } finally {
      setIsKilling(false);
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.username.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.ip.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      (s.pageTitle || '').toLowerCase().includes(q) ||
      (s.currentPage || '').toLowerCase().includes(q) ||
      (s.currentAction || '').toLowerCase().includes(q)
    );
  });

  const getActiveStatusBadge = (lastActiveAt: string) => {
    const diffMs = Date.now() - new Date(lastActiveAt).getTime();
    if (diffMs < 45000) {
      return {
        label: 'Active Now',
        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400 animate-ping',
      };
    } else if (diffMs < 300000) {
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return {
        label: `Idle (${mins}m)`,
        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    } else {
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      return {
        label: `Away (${mins}m)`,
        color: 'bg-[var(--color-surface-3)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]',
        dot: 'bg-[var(--color-text-muted)]',
      };
    }
  };

  const poTrackerUsersCount = sessions.filter(s => (s.currentPage || '').includes('/po-tracker')).length;
  const matrixUsersCount = sessions.filter(s => (s.currentPage || '').includes('/customer')).length;

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-5 max-w-[1500px] mx-auto w-full text-[var(--color-text-main)] pb-12">
        {/* ─── Header ─────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-main)] m-0">
                  Active User Sessions & Data Presence
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  {sessions.length} Online
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] m-0">
                Live presence tracking: Monitor user navigation, active queries, and real-time operations
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
              }`}
            >
              <Radio size={14} className={autoRefresh ? 'animate-pulse text-emerald-400' : ''} />
              <span>{autoRefresh ? 'Live (10s)' : 'Live Paused'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchSessions(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── Search & Metrics Bar ──────────────────────────────────────────────── */}
        <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search user, IP, page, or query..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none focus:border-[var(--color-brand-500)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] self-end sm:self-auto flex-wrap">
            <span>
              Total Online: <strong className="text-[var(--color-text-main)] font-mono">{sessions.length}</strong>
            </span>
            <span>•</span>
            <span>
              PO Tracker:{' '}
              <strong className="text-emerald-400 font-mono">
                {poTrackerUsersCount}
              </strong>
            </span>
            <span>•</span>
            <span>
              Sales Analytics:{' '}
              <strong className="text-blue-400 font-mono">
                {matrixUsersCount}
              </strong>
            </span>
            <span>•</span>
            <span>
              Administrators:{' '}
              <strong className="text-amber-400 font-mono">
                {sessions.filter(s => s.role === 'admin').length}
              </strong>
            </span>
          </div>
        </div>

        {/* ─── Active Sessions Table ─────────────────────────────────────────────── */}
        <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm">
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                  <th className="py-2.5 px-3 font-semibold">User</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Current Page</th>
                  <th className="py-2.5 px-3 font-semibold">Active Data Query</th>
                  <th className="py-2.5 px-3 font-semibold">Activity Status</th>
                  <th className="py-2.5 px-3 font-semibold">IP Address</th>
                  <th className="py-2.5 px-3 font-semibold">Login Time</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-[var(--color-text-muted)]">
                      Loading live sessions...
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-[var(--color-text-muted)]">
                      No active sessions found
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map(session => {
                    const statusBadge = getActiveStatusBadge(session.lastActiveAt);

                    return (
                      <tr key={session.sessionId} className="hover:bg-[var(--color-surface-2)]/50 transition-colors">
                        {/* User */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-main)] font-bold flex items-center justify-center text-xs border border-[var(--color-border-subtle)]">
                              {(session.name || session.username)[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--color-text-main)]">{session.name}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)] font-mono">{session.username}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                              session.role === 'admin'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            <Shield size={10} />
                            {session.role.toUpperCase()}
                          </span>
                        </td>

                        {/* Current Page */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                              {renderPageIcon(session.pageIcon)}
                              <span>{session.pageTitle || 'Factory Overview'}</span>
                            </span>
                            <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 max-w-[180px] truncate" title={session.currentPage}>
                              {session.currentPage || '/'}
                            </span>
                          </div>
                        </td>

                        {/* Active Data Query */}
                        <td className="py-2.5 px-3 max-w-[320px]">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-medium text-[var(--color-text-main)] flex items-center gap-1.5 truncate" title={session.currentAction}>
                              {renderActionIcon(session.actionType)}
                              <span className="truncate">{session.currentAction || 'Browsing System'}</span>
                            </span>
                            {session.lastEndpoint && (
                              <span className="font-mono text-[9px] text-[var(--color-text-muted)] truncate pl-4.5" title={session.lastEndpoint}>
                                {session.lastEndpoint}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Activity Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadge.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                              {statusBadge.label}
                            </span>
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono font-semibold text-[var(--color-text-main)]">
                          {session.ip}
                        </td>

                        {/* Login Time */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-text-muted)] font-mono text-[11px]">
                          {new Date(session.createdAt).toLocaleTimeString('en-US', { hour12: false })}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setSessionToKill(session)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs active:scale-95"
                            title="Terminate Session"
                          >
                            <UserX size={12} />
                            <span>Kill</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Kill Session Confirmation Modal ────────────────────────────────────── */}
        {sessionToKill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertCircle size={18} />
                <span>Terminate User Session</span>
              </div>

              <div className="text-xs text-[var(--color-text-muted)]">
                Are you sure you want to forcibly terminate the session for{' '}
                <strong className="text-[var(--color-text-main)]">{sessionToKill.name}</strong> (@
                <span className="font-mono text-amber-400">{sessionToKill.username}</span>)?
                The user will be immediately signed out from all active interfaces.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setSessionToKill(null)}
                  disabled={isKilling}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleKillSession}
                  disabled={isKilling}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition-all disabled:opacity-50"
                >
                  {isKilling ? 'Terminating...' : 'Terminate Session'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
