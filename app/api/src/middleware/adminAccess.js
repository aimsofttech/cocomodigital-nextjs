const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminRole = require('../models/AdminRole');
const {
  moduleForApiPath,
  actionForRequest,
  isAlwaysAllowed,
  isUploadPath,
} = require('../config/adminModules');

/**
 * Authentication and authorization for the whole admin API.
 *
 * Mounted once, at the /admin/api prefix, ahead of every module's routes. That
 * is deliberate: the panel has around eighty mounts, and a guard that has to be
 * remembered on each of them is a guard that will eventually be forgotten on a
 * new one. Here a route is protected by existing, and a module that isn't in
 * config/adminModules is denied rather than quietly open.
 *
 * The per-route `protect` in each router stays exactly where it is. It now
 * reuses the user this middleware already loaded, so nothing behaves
 * differently and the routers still work standalone.
 *
 * Failure codes are distinct on purpose: 401 means "sign in again" and the
 * admin app clears the session on it, 403 means "you are signed in but this
 * isn't yours" and must not log anybody out.
 */

const deny = (res, code, message) =>
  res.status(code).json({ status: 'error', message });

/** Resolve the bearer token to a live, enabled admin user. */
const loadUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  /* CRM tokens carry `kind: 'crm'` and are issued against a different user
   * collection. Refuse them here so a CRM session can never be replayed
   * against the admin API. */
  if (decoded.kind && decoded.kind !== 'admin') return { error: 'Not an admin token' };

  const user = await User.findById(decoded.id).select('-password');
  if (!user) return { error: 'User not found' };
  if (user.deletedAt) return { error: 'This account has been removed' };
  if (user.status === 0) return { error: 'This account has been deactivated' };
  return { user };
};

/**
 * Everything below /admin/api passes through here.
 */
const authorizeAdmin = async (req, res, next) => {
  // `req.path` is already relative to the mount, e.g. "/podcast/page/123".
  const path = req.path || '/';

  // Signing in has to be reachable without a session.
  if (isAlwaysAllowed(path) && !req.headers.authorization) {
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return deny(res, 401, 'Not authorized, no token');

  let resolved;
  try {
    resolved = await loadUser(token);
  } catch (err) {
    return deny(res, 401, 'Not authorized, invalid token');
  }
  if (resolved.error) return deny(res, 401, resolved.error);

  const { user } = resolved;
  // Hand the loaded user downstream so the routers' own `protect` is a no-op
  // rather than a second database round trip on every request.
  req.user = user;

  const role = await AdminRole.findOne({ key: user.roleKey || 'custom' });
  req.adminRole = role;

  /* The Super Admin bypasses the matrix entirely. This is what stops a badly
   * configured permission set from locking the owner out of the screen they
   * would need in order to fix it. */
  const isSuperAdmin = user.roleKey === 'super_admin' || (role && role.fullAccess);
  req.isSuperAdmin = isSuperAdmin;
  if (isSuperAdmin) return next();

  // Your own session and your own profile are always yours.
  if (isAlwaysAllowed(path)) return next();

  if (!role || role.status === 0) {
    return deny(res, 403, 'Your role is not configured. Ask a Super Admin to set it up.');
  }

  const action = actionForRequest(req.method, path);

  /* The shared uploader belongs to no single module — every form uses it. Allow
   * it to anyone who can create or update something, so a view-only role can't
   * use it to push files into the bucket. */
  if (isUploadPath(path)) {
    const canWriteSomething = (role.permissions || []).some((p) => p.create || p.update);
    if (canWriteSomething) return next();
    return deny(res, 403, 'You do not have permission to upload files');
  }

  const mod = moduleForApiPath(path);
  if (!mod) {
    /* An admin mount that no module claims. Denying is the safe default: a new
     * mount is invisible to the permission matrix until it is added to
     * config/adminModules, so it can never ship silently world-open. */
    return deny(res, 403, 'This area is not available for your role');
  }

  // Super-Admin-only modules never appear in anyone else's matrix.
  if (mod.superAdminOnly) {
    return deny(res, 403, 'Only a Super Admin can access this area');
  }

  const granted = role.permissionsFor(mod.key);
  if (!granted[action]) {
    return deny(
      res,
      403,
      `You do not have permission to ${action} in ${mod.label}`,
    );
  }

  return next();
};

/** Route-level guard for the two Super-Admin-only areas. */
const superAdminOnly = (req, res, next) => {
  if (req.isSuperAdmin || (req.user && req.user.roleKey === 'super_admin')) return next();
  return deny(res, 403, 'Only a Super Admin can access this area');
};

module.exports = { authorizeAdmin, superAdminOnly };
