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
      .query('SELECT * FROM system_users WHERE UPPER(username) = @username');

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Update last login
    await pool.request()
      .input('id', sql.Int, user.id)
      .query('UPDATE system_users SET last_login = GETDATE() WHERE id = @id');

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.full_name },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '12h' }
    );

    return res.json({ success: true, role: user.role, username: user.username, name: user.full_name, token });
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

  const adminPwd = process.env.APP_ADMIN_PASSWORD || 'admin';
  if (password === adminPwd) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin Password' });
});

router.post('/register', async (req, res) => {
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
