import { useState, useEffect, useTransition } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  RefreshCw,
  Search,
  X,
  UserCheck,
  Building2,
  Calendar,
  Database,
  ArrowRightLeft,
} from 'lucide-react';
import {
  adminUsersAPI,
  type ManagedUser,
  type CreateUserPayload,
} from '../../services/adminUsersAPI';
import { useToast } from '../../contexts/ToastContext';

export default function UserManagementPage() {
  const { showToast } = useToast();
  const [, startTransition] = useTransition();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'sales'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'system' | 'legacy'>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    username: '',
    password: '',
    fullName: '',
    department: '',
    role: 'sales',
  });
  const [targetRole, setTargetRole] = useState<'admin' | 'sales'>('sales');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await adminUsersAPI.getUsers();
      startTransition(() => {
        setUsers(data);
      });
    } catch (err: any) {
      console.error('[UserManagement] Fetch error:', err);
      showToast(err.message || 'Failed to load user directory', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    if (sourceFilter !== 'ALL' && user.source !== sourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inUsername = user.username.toLowerCase().includes(q);
      const inName = (user.fullName || '').toLowerCase().includes(q);
      const inDept = (user.department || '').toLowerCase().includes(q);
      return inUsername || inName || inDept;
    }
    return true;
  });

  // KPI Calculations
  const totalUsers = users.length;
  const adminUsersCount = users.filter(u => u.role === 'admin').length;
  const salesUsersCount = users.filter(u => u.role === 'sales').length;
  const systemUsersCount = users.filter(u => u.source === 'system').length;
  const legacyUsersCount = users.filter(u => u.source === 'legacy').length;

  // Handlers
  const handleOpenCreateModal = () => {
    setCreateForm({
      username: '',
      password: '',
      fullName: '',
      department: '',
      role: 'sales',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.password || !createForm.fullName || !createForm.department) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (createForm.password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminUsersAPI.createUser(createForm);
      showToast(res.message || 'User created successfully', 'success');
      setShowCreateModal(false);
      await fetchUsers(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRoleModal = (user: ManagedUser) => {
    if (user.source === 'legacy') {
      showToast('Legacy PCC users cannot be modified directly. Please migrate to System Users.', 'info');
      return;
    }
    setSelectedUser(user);
    setTargetRole(user.role === 'admin' ? 'sales' : 'admin');
    setShowRoleModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await adminUsersAPI.updateRole(selectedUser.id, targetRole);
      showToast(res.message || `Role updated for ${selectedUser.username}`, 'success');
      setShowRoleModal(false);
      await fetchUsers(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPasswordModal = (user: ManagedUser) => {
    if (user.source === 'legacy') {
      showToast('Legacy PCC user passwords cannot be reset from this portal.', 'info');
      return;
    }
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminUsersAPI.resetPassword(selectedUser.id, newPassword);
      showToast(res.message || `Password reset for ${selectedUser.username}`, 'success');
      setShowPasswordModal(false);
      await fetchUsers(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-page-scroll content-scrollbar p-4 sm:p-6 w-full">
      <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full text-[var(--color-text-main)] pb-12">
        {/* ─── Top Header Bar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-main)] m-0">
                  User Management
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                  Dual Directory
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] m-0">
                Manage accounts, assign roles, reset credentials, and monitor user statuses
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => fetchUsers(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh directory"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <UserPlus size={14} />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* ─── KPI Summary Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Total Users */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Total Accounts</span>
              <Users size={15} className="text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text-main)] my-1">
              {totalUsers}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Combined directories</div>
          </div>

          {/* Admin Role */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Administrators</span>
              <Shield size={15} className="text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-400 my-1">
              {adminUsersCount}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Full access granted</div>
          </div>

          {/* Sales Role */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Sales & Operators</span>
              <UserCheck size={15} className="text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 my-1">
              {salesUsersCount}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Standard operations</div>
          </div>

          {/* System Users */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Modern System Users</span>
              <Database size={15} className="text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-400 my-1">
              {systemUsersCount}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Bcrypt authenticated</div>
          </div>

          {/* Legacy PCC Users */}
          <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span>Legacy PCC Users</span>
              <Building2 size={15} className="text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-400 my-1">
              {legacyUsersCount}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">Read-only legacy link</div>
          </div>
        </div>

        {/* ─── Search & Filters Bar ────────────────────────────────────────────────── */}
        <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by username, full name, or department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-indigo-500 placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border-subtle)] text-xs">
              <span className="text-[var(--color-text-muted)] px-1.5 font-medium">Role:</span>
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  roleFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  roleFilter === 'admin'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('sales')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  roleFilter === 'sales'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                Sales
              </button>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border-subtle)] text-xs">
              <span className="text-[var(--color-text-muted)] px-1.5 font-medium">Source:</span>
              <button
                type="button"
                onClick={() => setSourceFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  sourceFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('system')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  sourceFilter === 'system'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                System
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('legacy')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  sourceFilter === 'legacy'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
              >
                Legacy
              </button>
            </div>
          </div>
        </div>

        {/* ─── User Table ──────────────────────────────────────────────────────────── */}
        <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-text-main)] m-0">
              User Directory ({filteredUsers.length} Users)
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-indigo-400" />
              <span>Loading user directory...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[var(--color-surface-2)]/50 border border-dashed border-[var(--color-border-subtle)] flex flex-col items-center justify-center gap-2">
              <Users size={32} className="text-[var(--color-text-muted)] opacity-60" />
              <div className="text-sm font-semibold text-[var(--color-text-main)]">No Users Found</div>
              <p className="text-xs text-[var(--color-text-muted)] m-0">
                No user accounts match your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                    <th className="py-2.5 px-4 font-semibold">User</th>
                    <th className="py-2.5 px-4 font-semibold">Department</th>
                    <th className="py-2.5 px-4 font-semibold">Role</th>
                    <th className="py-2.5 px-4 font-semibold">Source</th>
                    <th className="py-2.5 px-4 font-semibold">Created Date</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {filteredUsers.map(user => {
                    const isSystem = user.source === 'system';
                    const isAdmin = user.role === 'admin';
                    const initial = (user.fullName || user.username || 'U')[0].toUpperCase();

                    return (
                      <tr key={String(user.id)} className="hover:bg-[var(--color-surface-2)]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAdmin
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            }`}>
                              {initial}
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--color-text-main)] flex items-center gap-1.5">
                                <span>{user.fullName}</span>
                                {isAdmin && (
                                  <span className="text-[10px] px-1 rounded bg-purple-500/20 text-purple-300 font-mono">
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-[var(--color-text-muted)]">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-[var(--color-text-main)]">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Building2 size={12} className="text-[var(--color-text-muted)]" />
                            {user.department || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isAdmin
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}>
                            <Shield size={11} />
                            {isAdmin ? 'Administrator' : 'Sales / Operator'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            isSystem
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            <Database size={10} />
                            {isSystem ? 'system_users' : 'PCCUser'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-[var(--color-text-muted)] text-[11px] whitespace-nowrap">
                          {user.createdAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(user.createdAt).toLocaleDateString('th-TH')}
                            </span>
                          ) : (
                            <span className="italic text-[var(--color-text-muted)] opacity-60">Legacy account</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isSystem ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenRoleModal(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-all cursor-pointer shadow-xs"
                                title="Change Role"
                              >
                                <ArrowRightLeft size={12} className="text-purple-400" />
                                <span>Change Role</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenPasswordModal(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
                                title="Reset Password"
                              >
                                <KeyRound size={12} />
                                <span>Reset Pwd</span>
                              </button>
                            </div>
                          ) : (
                            <span
                              className="text-[11px] text-[var(--color-text-muted)] italic cursor-help"
                              title="Legacy PCCUser accounts are managed via legacy ERP"
                            >
                              Legacy (Read-Only)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Modal 1: Create New User ────────────────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <UserPlus size={18} />
                  <span>Create System User</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOMCHAI_S"
                    value={createForm.username}
                    onChange={e => setCreateForm({ ...createForm, username: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] font-mono outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Initial Password * (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. สมชาย สายเจียระไน"
                    value={createForm.fullName}
                    onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QC & Diamond Sorting"
                    value={createForm.department}
                    onChange={e => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">System Role *</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value as 'admin' | 'sales' })}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-indigo-500"
                  >
                    <option value="sales">Sales / Standard Operator</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Modal 2: Change Role ────────────────────────────────────────────────── */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <ArrowRightLeft size={18} />
                  <span>Change Role</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-muted)] m-0">
                  Select new access level for user <strong className="text-[var(--color-text-main)]">{selectedUser.fullName}</strong> (@{selectedUser.username}):
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetRole('sales')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      targetRole === 'sales'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                        : 'bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <UserCheck size={20} />
                    <span>Sales / Operator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetRole('admin')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      targetRole === 'admin'
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-sm'
                        : 'bg-[var(--color-surface-2)] border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    <Shield size={20} />
                    <span>Administrator</span>
                  </button>
                </div>

                <div className="text-[11px] p-2.5 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                  {targetRole === 'admin'
                    ? '⚠️ Administrator accounts have unrestricted access to Security Radar, Audit Logs, and User Management.'
                    : 'ℹ️ Sales accounts have operational access to PO Tracker, Dashboard, and Reports.'}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateRole}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-xs transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating...' : 'Save Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Modal 3: Reset Password ─────────────────────────────────────────────── */}
        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--color-ui-surface)] border border-[var(--color-border-subtle)] rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <KeyRound size={18} />
                  <span>Reset User Password</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-lg hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
                <p className="text-xs text-[var(--color-text-muted)] m-0">
                  Set a new password for <strong className="text-[var(--color-text-main)]">{selectedUser.fullName}</strong> (@{selectedUser.username}):
                </p>

                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1 font-medium">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="text-[11px] p-2.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  🔒 Resetting password will automatically revoke all active sessions for this user across all devices.
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-xs transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Resetting...' : 'Confirm Reset'}
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
