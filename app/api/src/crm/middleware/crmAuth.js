'use strict';

const jwt = require('jsonwebtoken');
const { CrmUser, CrmRole, CrmAuditLog } = require('../models');
const { hasPermission } = require('../services/permissions');

/** Same JWT pattern as the existing admin API, with a `kind: 'crm'` claim so
 *  admin-panel tokens and CRM tokens can never be used interchangeably. */
const crmProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.kind !== 'crm') {
      return res.status(401).json({ status: 'error', message: 'Not a CRM token' });
    }
    const user = await CrmUser.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ status: 'error', message: 'User not found or deactivated' });
    }
    req.crmUser = user;
    req.crmRole = await CrmRole.findById(user.roleId).lean();
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Not authorized, invalid token' });
  }
};

const requirePermission = (perm) => (req, res, next) => {
  if (hasPermission(req.crmRole, perm)) return next();
  return res.status(403).json({ status: 'error', message: `Permission required: ${perm}` });
};

/** Own-scope filter: Sales Agents only see records they own. */
const scopeFilter = (req, field = 'ownerId') =>
  (req.crmRole && req.crmRole.ownScope ? { [field]: req.crmUser._id } : {});

/** Best-effort audit trail for mutating requests. */
const audit = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  res.on('finish', () => {
    if (!req.crmUser || res.statusCode >= 400) return;
    if (req.originalUrl.includes('/auth/')) return;
    const body = { ...(req.body || {}) };
    delete body.password;
    CrmAuditLog.create({
      userId: req.crmUser._id,
      userName: req.crmUser.name,
      action: `${req.method} ${req.originalUrl.split('?')[0]}`,
      method: req.method,
      path: req.originalUrl,
      body,
      ip: req.ip,
    }).catch(() => {});
  });
  next();
};

module.exports = { crmProtect, requirePermission, scopeFilter, audit };
