const AdminRole = require('../models/AdminRole');
const User = require('../models/User');
const { MODULES } = require('./adminModules');
const logger = require('../utils/logger');

/**
 * Bring the role/permission tables up to date at boot.
 *
 * Idempotent and additive by design — it runs on every start, so it must never
 * undo a Super Admin's configuration:
 *   - a role that is missing is created with its shipped defaults
 *   - a role that exists keeps the permissions it has; only modules added to
 *     the catalog since it was created are appended, switched off
 *   - a user that has no roleKey yet is mapped from the legacy `role` field
 *   - a user that already has a roleKey is left completely alone
 *
 * This is what lets the feature ship against a live database without anyone
 * losing access or having their settings reset by a deploy.
 */

const SUPER_ADMIN_EMAIL = 'demo@gmail.com';

/* How accounts that predate the permission system are mapped. Their existing
 * `role` value is the only signal available, so it is what we go on. */
const LEGACY_ROLE_MAP = {
  admin: 'admin_manager',
  editor: 'editor',
};
const LEGACY_FALLBACK = 'custom';

/** Add rows for any module the catalog has gained since the role was stored. */
const withMissingModules = (role) => {
  const known = new Set((role.permissions || []).map((p) => p.module));
  const added = MODULES.filter((m) => !known.has(m.key)).map((m) => ({ module: m.key }));
  return added.length ? [...(role.permissions || []), ...added] : null;
};

const ensureRoles = async () => {
  let created = 0;
  let extended = 0;

  for (const def of AdminRole.DEFAULT_ROLES) {
    const existing = await AdminRole.findOne({ key: def.key });
    if (!existing) {
      await AdminRole.create(def);
      created += 1;
      continue;
    }
    const merged = withMissingModules(existing);
    if (merged) {
      existing.permissions = merged;
      await existing.save();
      extended += 1;
    }
    /* fullAccess is a property of what Super Admin *means*, not a preference,
     * so it is repaired if it was ever cleared. */
    if (def.fullAccess && !existing.fullAccess) {
      existing.fullAccess = true;
      await existing.save();
    }
  }

  return { created, extended };
};

const ensureUserRoles = async () => {
  const unmapped = await User.find({
    $or: [{ roleKey: { $exists: false } }, { roleKey: null }, { roleKey: '' }],
  }).select('name email role roleKey status');

  let mapped = 0;
  for (const user of unmapped) {
    user.roleKey = user.email === SUPER_ADMIN_EMAIL
      ? 'super_admin'
      : (LEGACY_ROLE_MAP[user.role] || LEGACY_FALLBACK);
    if (user.status === undefined || user.status === null) user.status = 1;
    /* Save without touching the password: `save()` re-hashes only when the
     * password field is modified, and it is not. */
    await user.save();
    mapped += 1;
  }

  // The panel must always have someone who can administer it.
  const superAdmins = await User.countDocuments({
    roleKey: 'super_admin',
    deletedAt: null,
    status: { $ne: 0 },
  });
  if (superAdmins === 0) {
    const fallback = await User.findOne({ email: SUPER_ADMIN_EMAIL });
    if (fallback) {
      fallback.roleKey = 'super_admin';
      fallback.status = 1;
      fallback.deletedAt = null;
      await fallback.save();
      logger.warn(`Admin access: promoted ${SUPER_ADMIN_EMAIL} — no active Super Admin existed.`);
    } else {
      logger.error(
        'Admin access: there is no active Super Admin and no ' +
        `${SUPER_ADMIN_EMAIL} account to promote. User and permission ` +
        'management will be unreachable until one is set in the database.',
      );
    }
  }

  return { mapped };
};

const bootstrapAdminAccess = async () => {
  try {
    const roles = await ensureRoles();
    const users = await ensureUserRoles();
    if (roles.created || roles.extended || users.mapped) {
      logger.info(
        `Admin access ready: ${roles.created} role(s) created, ` +
        `${roles.extended} extended, ${users.mapped} user(s) mapped to a role.`,
      );
    }
  } catch (err) {
    // Never stop the API booting over this; the guard fails closed anyway.
    logger.error(`Admin access bootstrap failed: ${err.message}`);
  }
};

module.exports = { bootstrapAdminAccess, SUPER_ADMIN_EMAIL };
