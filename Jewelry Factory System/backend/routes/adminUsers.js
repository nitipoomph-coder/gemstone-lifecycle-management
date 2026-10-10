const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
const auditService = require('../services/auditService');

// ─── GET /api/admin/users ───────────────────────────────────────────────────
// List all users from system_users and legacy PCCUser (read-only query)
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();

    // 1. Fetch web system_users
    let systemUsers = [];
    try {
      const sysRes = await pool.request().query(`
        SELECT id, username, full_name, department, role, created_at, last_login
        FROM system_users
        ORDER BY id DESC
      `);
      systemUsers = sysRes.recordset || [];
    } catch (e) {
      console.warn('[AdminUsers] system_users query error:', e.message);
    }

    // 2. Fetch legacy PCCUser
    let legacyUsers = [];
    try {
      const pccRes = await pool.request().query(`
        SELECT UserID, UserName, UserType
        FROM dbo.PCCUser
        ORDER BY UserName
      `);
      legacyUsers = pccRes.recordset || [];
    } catch (e) {
      console.warn('[AdminUsers] PCCUser query error:', e.message);
    }

    const sysUsernames = new Set(systemUsers.map(u => (u.username || '').toUpperCase()));

    // Combine list
    const combined = [
      ...systemUsers.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        department: u.department,
        role: (u.role || 'sales').toLowerCase(),
        createdAt: u.created_at,
        lastLogin: u.last_login,
        source: 'system',
      })),
      ...legacyUsers
        .filter(p => !sysUsernames.has((p.UserName || '').toUpperCase()))
        .map(p => ({
          id: `legacy_${p.UserID}`,
          username: p.UserName,
          fullName: p.UserName,
          department: 'Legacy (PCC)',
          role: (p.UserName || '').toUpperCase() === 'ADMIN' ? 'admin' : 'sales',
          createdAt: null,
          lastLogin: null,
          source: 'legacy',
        })),
    ];

    res.json({ ok: true, data: combined });
  } catch (err) {
    console.error('[AdminUsers API] Error listing users:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/users ──────────────────────────────────────────────────
// Create new user in system_users with bcrypt
router.post('/', async (req, res) => {
  const { username, password, fullName, department, role = 'sales' } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'];

  if (!username || !password || !fullName || !department) {
    return res.status(400).json({ ok: false, message: 'All fields (username, password, fullName, department) are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' });
  }

  const validRole = role.toLowerCase() === 'admin' ? 'admin' : 'sales';

  try {
    const pool = await getPool();
    const upperUsername = username.trim().toUpperCase();

    // Check if username already exists in system_users
    const check = await pool.request()
      .input('u', sql.NVarChar, upperUsername)
      .query('SELECT id FROM system_users WHERE UPPER(username) = @u');

    if (check.recordset.length > 0) {
      return res.status(409).json({ ok: false, message: `Username "${upperUsername}" already exists` });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertRes = await pool.request()
      .input('u', sql.NVarChar, upperUsername)
      .input('p', sql.NVarChar, passwordHash)
      .input('n', sql.NVarChar, fullName.trim())
      .input('d', sql.NVarChar, department.trim())
      .input('r', sql.NVarChar, validRole)
      .query(`
        INSERT INTO system_users (username, password_hash, full_name, department, role, created_at)
        VALUES (@u, @p, @n, @d, @r, GETDATE());
        SELECT SCOPE_IDENTITY() AS newId;
      `);

    const newId = insertRes.recordset[0]?.newId;

    auditService.logEvent({
      category: 'AUTH',
      action: 'USER_CREATED',
      actor: req.user?.username || 'ADMIN',
      ip: clientIp,
      status: 'SUCCESS',
      severity: 'LOW',
      details: {
        createdUserId: newId,
        username: upperUsername,
        role: validRole,
        department: department.trim(),
      },
    });

    res.json({ ok: true, message: `User ${upperUsername} created successfully`, userId: newId });
  } catch (err) {
    console.error('[AdminUsers API] Error creating user:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── PUT /api/admin/users/:id/role ──────────────────────────────────────────
// Change user role (admin <-> sales)
router.put('/:id/role', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'];

  if (!id || isNaN(id)) {
    return res.status(400).json({ ok: false, message: 'Invalid user ID. Legacy users cannot be modified directly.' });
  }

  const validRole = (role || '').toLowerCase();
  if (validRole !== 'admin' && validRole !== 'sales') {
    return res.status(400).json({ ok: false, message: 'Role must be either "admin" or "sales"' });
  }

  try {
    const pool = await getPool();

    // Check user exists
    const userRes = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, username, role FROM system_users WHERE id = @id');

    const targetUser = userRes.recordset[0];
    if (!targetUser) {
      return res.status(404).json({ ok: false, message: 'User not found in system_users' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('role', sql.NVarChar, validRole)
      .query('UPDATE system_users SET role = @role WHERE id = @id');

    auditService.logEvent({
      category: 'SECURITY',
      action: 'USER_ROLE_CHANGED',
      actor: req.user?.username || 'ADMIN',
      ip: clientIp,
      status: 'SUCCESS',
      severity: 'HIGH',
      details: {
        targetUserId: id,
        username: targetUser.username,
        oldRole: targetUser.role,
        newRole: validRole,
      },
    });

    res.json({ ok: true, message: `Updated role for ${targetUser.username} to ${validRole}` });
  } catch (err) {
    console.error('[AdminUsers API] Error updating role:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/admin/users/:id/reset-password ───────────────────────────────
// Reset user password in system_users
router.post('/:id/reset-password', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { newPassword } = req.body;
  const clientIp = req.ip || req.headers['x-forwarded-for'];

  if (!id || isNaN(id)) {
    return res.status(400).json({ ok: false, message: 'Invalid user ID. Legacy users cannot be modified directly.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ ok: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const pool = await getPool();

    const userRes = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT id, username FROM system_users WHERE id = @id');

    const targetUser = userRes.recordset[0];
    if (!targetUser) {
      return res.status(404).json({ ok: false, message: 'User not found in system_users' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.request()
      .input('id', sql.Int, id)
      .input('pwd', sql.NVarChar, passwordHash)
      .query('UPDATE system_users SET password_hash = @pwd WHERE id = @id');

    // Revoke any active sessions for this user so they must log in with new password
    const sessions = auditService.getActiveSessions();
    for (const s of sessions) {
      if (s.username === targetUser.username.toUpperCase()) {
        auditService.killSession(s.sessionId, 'SYSTEM_PASSWORD_RESET');
      }
    }

    auditService.logEvent({
      category: 'SECURITY',
      action: 'USER_PASSWORD_RESET',
      actor: req.user?.username || 'ADMIN',
      ip: clientIp,
      status: 'SUCCESS',
      severity: 'HIGH',
      details: {
        targetUserId: id,
        username: targetUser.username,
      },
    });

    res.json({ ok: true, message: `Password reset successfully for ${targetUser.username}. Active sessions revoked.` });
  } catch (err) {
    console.error('[AdminUsers API] Error resetting password:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
