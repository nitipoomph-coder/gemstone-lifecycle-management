const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username.toUpperCase())
      .query('SELECT UserID, UserName, Password, UserType FROM dbo.PCCUser WHERE UPPER(UserName) = @username');

    let user = result.recordset[0];
    let isAuthenticated = false;
    let role = 'sales';
    let fullName = username;
    let userId = null;

    if (user && password === user.Password) {
      isAuthenticated = true;
      role = user.UserName.toUpperCase() === 'ADMIN' ? 'admin' : 'sales';
      fullName = user.UserName;
      userId = user.UserID;
    } else {
      // Check system_users table (registered users with bcrypt)
      try {
        const sysUserRes = await pool.request()
          .input('sysUsername', sql.NVarChar, username.toUpperCase())
          .query('SELECT id, username, password_hash, full_name, role FROM system_users WHERE UPPER(username) = @sysUsername');
        const sysUser = sysUserRes.recordset[0];
        if (sysUser && sysUser.password_hash) {
          const match = await bcrypt.compare(password, sysUser.password_hash);
          if (match) {
            isAuthenticated = true;
            role = (sysUser.role || 'sales').toLowerCase();
            fullName = sysUser.full_name || sysUser.username;
            userId = sysUser.id;
          }
        }
      } catch (sysErr) {
        // If system_users table is not accessible, proceed to failure
      }
    }

    if (!isAuthenticated) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Ensure JWT_SECRET is configured — refuse to run with a weak fallback
    if (!process.env.JWT_SECRET) {
      console.error('[FATAL] JWT_SECRET is not set in .env — refusing to issue tokens');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: userId, username: username.toUpperCase(), role: role, name: fullName },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({ success: true, role: role, username: username.toUpperCase(), name: fullName, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/verify-admin', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  const adminPwd = process.env.APP_ADMIN_PASSWORD;
  if (!adminPwd) {
    return res.status(500).json({ success: false, message: 'Admin password not configured' });
  }
  // Constant-time comparison to prevent timing attacks
  const crypto = require('crypto');
  const a = Buffer.from(password);
  const b = Buffer.from(adminPwd);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin Password' });
});

// Register — restricted to admin users only
const { authMiddleware: regAuth, requireRole: regRole } = require('../middleware/authMiddleware');
router.post('/register', regAuth, regRole('admin'), async (req, res) => {
  const { fullName, username, password, department } = req.body;

  if (!fullName || !username || !password || !department) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const pool = await getPool();
    const upperUsername = username.toUpperCase();

    // Check if user exists
    const checkUser = await pool.request()
      .input('username', sql.NVarChar, upperUsername)
      .query('SELECT id FROM system_users WHERE UPPER(username) = @username');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user (default role: sales)
    await pool.request()
      .input('username', sql.NVarChar, upperUsername)
      .input('pwd', sql.NVarChar, passwordHash)
      .input('name', sql.NVarChar, fullName)
      .input('dept', sql.NVarChar, department)
      .input('role', sql.NVarChar, 'sales')
      .query('INSERT INTO system_users (username, password_hash, full_name, department, role) VALUES (@username, @pwd, @name, @dept, @role)');

    return res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
