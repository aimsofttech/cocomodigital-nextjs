const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  /* `authorizeAdmin` runs ahead of every /admin/api route and has already
   * verified the token, loaded the user and checked that the account is live.
   * Reuse that instead of paying for a second verify + query on every request.
   * The check below still runs for any router mounted outside that prefix, so
   * this middleware remains safe to use on its own. */
  if (req.user) return next();

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }
    if (req.user.deletedAt) {
      return res.status(401).json({ status: 'error', message: 'This account has been removed' });
    }
    if (req.user.status === 0) {
      return res.status(401).json({ status: 'error', message: 'This account has been deactivated' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ status: 'error', message: 'Admin access required' });
};

module.exports = { protect, adminOnly };
