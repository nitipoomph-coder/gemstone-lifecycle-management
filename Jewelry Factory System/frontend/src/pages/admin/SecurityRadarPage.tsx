import { useState, useEffect, useTransition } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  RefreshCw,
  Flame,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Eye,
  X,
  Play,
  Terminal,
  Ban,
  Unlock,
  Clock,
  Plus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminAuditAPI, type ThreatSummary, type AuditEvent, type BannedIP } from '../../services/adminAuditAPI';
import { useToast } from '../../contexts/ToastContext';

export default function SecurityRadarPage() {
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const [summary, setSummary] = useState<ThreatSummary | null>(null);
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal detail & manual ban
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showManualBanModal, setShowManualBanModal] = useState(false);
  const [manualBanIp, setManualBanIp] = useState('');
  const [manualBanReason, setManualBanReason] = useState('');
  const [manualBanDuration, setManualBanDuration] = useState(15);

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [sumData, logsData, bannedData] = await Promise.all([
        adminAuditAPI.getSummary(),
        adminAuditAPI.getLogs({ limit: 40, category: 'ALL' }),
        adminAuditAPI.getBannedIPs(),
      ]);
      startTransition(() => {
        setSummary(sumData);
        setLogs(logsData.items);
        setBannedIPs(bannedData);
      });
    } catch (err: any) {
      console.error('[SecurityRadar] Fetch error:', err);
      showToast(err.message || 'Failed to load security metrics', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh interval (every 10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSimulate = async (type: string) => {
    setIsSimulating(true);
    try {
      await adminAuditAPI.simulateThreat(type);
      showToast(`Simulation triggered: ${type}`, 'success');
      await fetchData(true);
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleUnban = async (ip: string) => {
    try {
      const res = await adminAuditAPI.unbanIP(ip);
      showToast(res.message || `IP ${ip} released from jail`, 'success');
      await fetchData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to unban IP', 'error');
    }
  };

  const handleManualBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBanIp.trim()) {
      showToast('IP address is required', 'error');
      return;
    }
    try {
      const res = await adminAuditAPI.banIP(
        manualBanIp.trim(),
        manualBanReason.trim() || 'Manual admin ban',
        manualBanDuration
      );
      showToast(res.message || `IP ${manualBanIp} banned successfully`, 'success');
      setShowManualBanModal(false);
      setManualBanIp('');
      setManualBanReason('');
      await fetchData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to ban IP', 'error');
    }
  };

  // Filter logs for table
  const filteredLogs = logs.filter(item => {
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inAction = item.action.toLowerCase().includes(q);
      const inActor = item.actor.toLowerCase().includes(q);
      const inIp = item.ip.toLowerCase().includes(q);
      const inDetails = JSON.stringify(item.details).toLowerCase().includes(q);
      return inAction || inActor || inIp || inDetails;
    }
    return true;
  });

  const getThreatBadge = (level: string = 'NORMAL') => {
    switch (level) {
      case 'UNDER_ATTACK':
        return {
          label: 'CRITICAL / UNDER ATTACK',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.4)',
          text: '#f87171',
          icon: Flame,
        };
      case 'HIGH':
        return {
          label: 'HIGH THREAT LEVEL',
          bg: 'rgba(249, 115, 22, 0.15)',
          border: 'rgba(249, 115, 22, 0.4)',
          text: '#fb923c',
          icon: AlertTriangle,
        };
      case 'ELEVATED':
        return {
          label: 'ELEVATED ACTIVITY',
          bg: 'rgba(234, 179, 8, 0.15)',
          border: 'rgba(234, 179, 8, 0.4)',
          text: '#facc15',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'SYSTEM SECURE / NORMAL',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          text: '#34d399',
          icon: ShieldCheck,
        };
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
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

  const threatBadge = getThreatBadge(summary?.threatLevel);
  const ThreatIcon = threatBadge.icon;

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full text-[var(--color-text-main)] pb-12">
        {/* ─── Top Header Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-main)] m-0">
                Security & Threat Radar
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                Zero-DB Engine
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] m-0">
              Live cyber threat detection, authentication auditing, and anomaly monitoring
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]'
            }`}
            title="Auto-refresh every 10s"
          >
            <Radio size={14} className={autoRefresh ? 'animate-pulse text-emerald-400' : ''} />
            <span>{autoRefresh ? 'Live (10s)' : 'Live Paused'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Threat Status Banner & KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Threat Level Gauge (Left 4 cols) */}
        <div
          className="lg:col-span-4 rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-sm"
          style={{
            background: threatBadge.bg,
            border: `1px solid ${threatBadge.border}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold opacity-90 text-[var(--color-text-main)]">
              Current Threat Status
            </span>
            <div className="flex items-center gap-1.5">
              <ThreatIcon size={18} style={{ color: threatBadge.text }} />
              <span className="text-xs font-bold" style={{ color: threatBadge.text }}>
                {threatBadge.label}
              </span>
            </div>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: threatBadge.text }}>
                {summary?.threatScore ?? 0}
              </span>
              <span className="text-sm font-medium text-[var(--color-text-muted)]">/ 100 Threat Score</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2.5 bg-[var(--color-surface-3)] rounded-full mt-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.max(5, summary?.threatScore ?? 0))}%`,
                  backgroundColor: threatBadge.text,
                }}
              />
            </div>
          </div>

          <div className="text-xs text-[var(--color-text-muted)] flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]/40">
            <span>Evaluated over last 24h</span>
            <span className="font-mono text-emerald-400">Memory + Local JSON</span>
          </div>
        </div>

        {/* KPI Tiles (Right 8 cols) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Failed Logins */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Failed Logins</span>
              <AlertTriangle size={15} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] my-1">
              {summary?.kpis.failedLogins24h ?? 0}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Brute force indicator</div>
          </div>

          {/* Master Admin Probes */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Admin Probes</span>
              <ShieldAlert size={15} className="text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 my-1">
              {summary?.kpis.adminProbes24h ?? 0}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Password guesses</div>
          </div>

          {/* Rate Limit Blocks */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Flood Throttles</span>
              <Flame size={15} className="text-orange-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] my-1">
              {summary?.kpis.rateLimitHits24h ?? 0}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">HTTP 429 triggered</div>
          </div>

          {/* Active Sessions */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Active Users</span>
              <Users size={15} className="text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 my-1">
              {summary?.kpis.activeSessionsNow ?? 0}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Live in memory</div>
          </div>

          {/* Auto-Banned IPs in Jail */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>IPs in Jail</span>
              <Ban size={15} className={bannedIPs.length > 0 ? 'text-rose-400 animate-pulse' : 'text-[var(--color-text-muted)]'} />
            </div>
            <div className={`text-2xl sm:text-3xl font-bold my-1 ${bannedIPs.length > 0 ? 'text-rose-400' : 'text-[var(--color-text-main)]'}`}>
              {bannedIPs.length}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Auto-ban defense</div>
          </div>
        </div>
      </div>

      {/* ─── 24h Timeline Chart & Attack Vector Breakdown ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Activity Timeline (8 cols) */}
        <div className="lg:col-span-8 bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--color-text-main)] m-0">
                24-Hour Attack & Activity Timeline
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] m-0">
                Comparison of normal requests vs security threats detected
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="text-[var(--color-text-muted)]">Threats</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[var(--color-text-muted)]">Auth Events</span>
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            {summary?.timeline && summary.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="threatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hour"
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border-subtle)' }}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border-subtle)' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-ui-surface)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#threatGrad)"
                    name="Threats"
                  />
                  <Area
                    type="monotone"
                    dataKey="auth"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#authGrad)"
                    name="Auth Events"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                No timeline data available
              </div>
            )}
          </div>
        </div>

        {/* Attack Vector Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-main)] m-0">
              Attack Vectors Breakdown
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] m-0 mb-4">
              Distribution of blocked attempts
            </p>

            <div className="flex flex-col gap-3">
              {summary?.attackVectors.map(vec => (
                <div key={vec.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-main)] font-medium">{vec.name}</span>
                    <span className="font-mono font-bold text-[var(--color-text-main)]">{vec.count}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (vec.count / Math.max(1, summary?.kpis.totalEvents24h || 1)) * 100)}%`,
                        backgroundColor: vec.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threat Simulator Drawer for Testing Verification */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-2 font-medium">
              <Terminal size={14} className="text-indigo-400" />
              <span>Diagnostic Threat Simulator</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSimulate('BRUTE_FORCE')}
                disabled={isSimulating}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Play size={10} className="text-amber-400" />
                <span>Simulate Brute</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('ADMIN_PROBE')}
                disabled={isSimulating}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Play size={10} className="text-rose-400" />
                <span>Admin Probe</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('PATH_TRAVERSAL')}
                disabled={isSimulating}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Play size={10} className="text-purple-400" />
                <span>Path Probe</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('RATE_LIMIT')}
                disabled={isSimulating}
                className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Play size={10} className="text-orange-400" />
                <span>Rate Flood</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Auto-Banned IPs (IP Jail Defense) ─────────────────────────────────── */}
      <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Ban size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--color-text-main)] m-0">
                  Auto-Banned IPs (IP Jail Defense)
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                  bannedIPs.length > 0
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {bannedIPs.length} {bannedIPs.length === 1 ? 'Jailed IP' : 'Jailed IPs'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] m-0">
                Automatic protection triggered after 5 failed login attempts in 10 minutes (Blocked with 403 at gateway)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowManualBanModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Manual Ban IP</span>
          </button>
        </div>

        {bannedIPs.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-[var(--color-surface-2)]/50 border border-dashed border-[var(--color-border-subtle)] flex flex-col items-center justify-center gap-2">
            <ShieldCheck size={32} className="text-emerald-400 opacity-80" />
            <div className="text-sm font-semibold text-[var(--color-text-main)]">IP Jail is Empty</div>
            <p className="text-xs text-[var(--color-text-muted)] max-w-md m-0">
              No IP addresses are currently blocked. Normal traffic flows freely without restriction.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                  <th className="py-2.5 px-4 font-semibold">Banned IP</th>
                  <th className="py-2.5 px-4 font-semibold">Violation Reason</th>
                  <th className="py-2.5 px-4 font-semibold">Banned At</th>
                  <th className="py-2.5 px-4 font-semibold">Time Remaining</th>
                  <th className="py-2.5 px-4 font-semibold">Enforced By</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {bannedIPs.map(item => (
                  <tr key={item.ip} className="hover:bg-[var(--color-surface-2)]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                        {item.ip}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-main)] max-w-xs truncate" title={item.reason}>
                      {item.reason}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-muted)] whitespace-nowrap">
                      {new Date(item.bannedAt).toLocaleTimeString('th-TH')} ({new Date(item.bannedAt).toLocaleDateString()})
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock size={12} />
                        ~{item.minutesRemaining} min left
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                        {item.bannedBy}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleUnban(item.ip)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Unlock size={13} />
                        <span>Unblock / ปลดแบน</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Live Threat Stream Table ────────────────────────────────────────── */}
      <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-main)] m-0">
              Live Threat & Audit Event Stream
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] m-0">
              Real-time chronological events intercepted by security middleware
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search IP, User, Action..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none focus:border-[var(--color-brand-500)] w-48 sm:w-56"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1">
              <Filter size={13} className="text-[var(--color-text-muted)]" />
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-none cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                <th className="py-2.5 px-3 font-semibold">Severity</th>
                <th className="py-2.5 px-3 font-semibold">Time</th>
                <th className="py-2.5 px-3 font-semibold">Source IP</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Actor / User</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--color-text-muted)]">
                    Loading security stream...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[var(--color-text-muted)]">
                    No threat events matching filter
                  </td>
                </tr>
              ) : (
                filteredLogs.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--color-surface-2)]/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(item)}
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[var(--color-text-muted)] font-mono">
                      {new Date(item.timestamp).toLocaleTimeString('th-TH')}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-[var(--color-text-main)] font-semibold">
                      {item.ip}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-semibold text-[var(--color-text-main)]">
                        {item.action}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] block">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[var(--color-text-main)]">
                      {item.actor}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.status === 'BLOCKED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : item.status === 'FAILED'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(item);
                        }}
                        className="p-1 rounded hover:bg-[var(--color-surface-3)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                        title="View Full Payload"
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
      </div>

      {/* ─── Detail Modal ───────────────────────────────────────────────────────── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl w-full max-w-lg p-5 shadow-2xl relative flex flex-col gap-4 text-[var(--color-text-main)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityBadgeClass(selectedEvent.severity)}`}>
                  {selectedEvent.severity}
                </span>
                <h3 className="text-base font-bold m-0">{selectedEvent.action}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[var(--color-text-muted)] block">Event ID:</span>
                <span className="font-mono">{selectedEvent.id}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Timestamp:</span>
                <span>{new Date(selectedEvent.timestamp).toLocaleString('th-TH')}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Source IP:</span>
                <span className="font-mono font-bold text-amber-400">{selectedEvent.ip}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block">Actor:</span>
                <span>{selectedEvent.actor}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-[var(--color-text-muted)] block mb-1">Payload & Details:</span>
              <pre className="p-3 rounded-lg bg-[var(--color-surface-2)] text-[11px] font-mono text-[var(--color-text-main)] overflow-x-auto max-h-48 border border-[var(--color-border-subtle)]">
                {JSON.stringify(selectedEvent.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Modal: Manual Ban IP ────────────────────────────────────────────── */}
      {showManualBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Ban size={18} />
                <span>Manual Ban IP to Jail</span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualBanModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleManualBan} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">IP Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.50"
                  value={manualBanIp}
                  onChange={e => setManualBanIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] font-mono outline-hidden focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Suspicious automated scanning"
                  value={manualBanReason}
                  onChange={e => setManualBanReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Duration (Minutes)</label>
                <select
                  value={manualBanDuration}
                  onChange={e => setManualBanDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-rose-500"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={180}>3 Hours</option>
                  <option value={1440}>24 Hours</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowManualBanModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition-all"
                >
                  Confirm Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
