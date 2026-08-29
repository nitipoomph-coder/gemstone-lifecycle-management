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

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Direct comparison for plain text password from legacy system
    if (password !== user.Password) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Map role based on username: only "admin" or "sales"
    const role = user.UserName.toUpperCase() === 'ADMIN' ? 'admin' : 'sales';
    const fullName = user.UserName;

    // Ensure JWT_SECRET is configured — refuse to run with a weak fallback
    if (!process.env.JWT_SECRET) {
      console.error('[FATAL] JWT_SECRET is not set in .env — refusing to issue tokens');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: user.UserID, username: user.UserName, role: role, name: fullName },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({ success: true, role: role, username: user.UserName, name: fullName, token });
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
