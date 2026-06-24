const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const user = username.toUpperCase();
  const salesPwd = process.env.APP_SALES_PASSWORD;
  const adminPwd = process.env.APP_ADMIN_PASSWORD;

  if (user === 'SALES' && password === salesPwd) {
    const token = jwt.sign({ username: 'SALES', role: 'sales' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, role: 'sales', username: 'SALES', token });
  }

  if (user === 'ADMIN' && password === adminPwd) {
    const token = jwt.sign({ username: 'ADMIN', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, role: 'admin', username: 'ADMIN', token });
  }

  return res.status(401).json({ success: false, message: 'Invalid username or password' });
});

router.post('/verify-admin', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required' });
  }

  const adminPwd = process.env.APP_ADMIN_PASSWORD;
  
  if (password === adminPwd) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: 'Invalid Admin Password' });
});

module.exports = router;
