const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Allow OPTIONS requests for CORS
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { username, role, iat, exp }
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token' });
  }
};

module.exports = authMiddleware;
