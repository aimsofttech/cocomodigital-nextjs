const crypto = require('crypto');
const User = require('../../models/User');
const AdminRole = require('../../models/AdminRole');
const { paginateQuery } = require('../../utils/helpers');
const { sendMail, isConfigured } = require('../../services/mailer');
const logger = require('../../utils/logger');

/* User Management — Super Admin only. The route is additionally guarded by
 * `superAdminOnly`, and the module is marked superAdminOnly in the catalog, so
 * there are two independent barriers between another role and this file.
 */

const SUPER_ADMIN_KEY = 'super_admin';

/** Roles a Super Admin may hand out. Super Admin itself is deliberately not in
 *  the list: promoting someone to unrestricted access should be a database-level
 *  decision, not one click in a table. */
const ASSIGNABLE_ROLES = ['admin_manager', 'editor', 'custom'];

/**
 * A password nobody has to invent. Ambiguous characters are left out because
 * this string gets read off a screen and typed by hand.
 */
const generatePassword = (length = 14) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const specials = '!@#$%&*?';
  const pick = (set) => set[crypto.randomInt(0, set.length)];
  const body = Array.from({ length: length - 2 }, () => pick(alphabet)).join('');
  // Guarantee at least one digit and one symbol whatever the draw.
  const out = `${body}${pick('23456789')}${pick(specials)}`;
  // Shuffle so the guaranteed characters aren't always last.
  return out.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');
};

/** Shape a user for the admin table. Never includes the password hash. */
const present = (user, roleMap) => {
  const role = roleMap.get(user.roleKey);
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    roleKey: user.roleKey,
    roleName: role ? role.name : user.roleKey,
    profileImage: user.profileImage || '',
    status: user.status ?? 1,
    lastLoginAt: user.lastLoginAt || null,
    mustChangePassword: !!user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const roleMap = async () => {
  const roles = await AdminRole.find({}).lean();
  return new Map(roles.map((r) => [r.key, r]));
};

/** GET /admin/api/users */
const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';

  const filter = { deletedAt: null };
  if (req.query.status !== undefined && req.query.status !== '') {
    filter.status = parseInt(req.query.status);
  }
  if (req.query.roleKey) filter.roleKey = req.query.roleKey;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const result = await paginateQuery(User, filter, {
    page, limit, sort: { createdAt: -1 }, select: '-password',
  });
  const roles = await roleMap();

  res.json({
    status: 'success',
    data: result.data.map((u) => present(u, roles)),
    pagination: result.pagination,
  });
};

/** GET /admin/api/users/:id */
const show = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null }).select('-password');
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
  const roles = await roleMap();
  res.json({ status: 'success', data: present(user, roles) });
};

/**
 * POST /admin/api/users
 * Creates the account and returns the generated password ONCE, so the Super
 * Admin can hand it over. It is hashed on the way into the database by the
 * User model's pre-save hook and can never be read back afterwards.
 */
const store = async (req, res) => {
  const { name, email, roleKey } = req.body;

  if (!name || !email) {
    return res.status(400).json({ status: 'error', message: 'Name and email are required' });
  }
  if (!ASSIGNABLE_ROLES.includes(roleKey)) {
    return res.status(400).json({
      status: 'error',
      message: `User type must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
    });
  }

  const normalised = String(email).trim().toLowerCase();
  const clash = await User.findOne({ email: normalised });
  if (clash) {
    return res.status(409).json({
      status: 'error',
      message: clash.deletedAt
        ? 'A removed account already uses this email. Restore it instead of creating a new one.'
        : 'That email is already registered',
    });
  }

  const password = generatePassword();

  const user = await User.create({
    name: String(name).trim(),
    email: normalised,
    password,
    roleKey,
    status: 1,
    /* Keep the legacy field consistent with the new role so anything still
     * reading `role` sees something sensible. */
    role: roleKey === 'editor' ? 'editor' : 'admin',
    mustChangePassword: true,
    profileImage: req.body.profileImage || '',
    createdByUserId: req.user._id,
  });

  // Best effort: if SMTP is configured the new user gets their own copy.
  let emailed = false;
  if (isConfigured()) {
    try {
      await sendMail({
        to: normalised,
        subject: 'Your Cocoma Digital admin account',
        html: `<p>Hi ${user.name},</p>
               <p>An admin account has been created for you.</p>
               <p><strong>Email:</strong> ${normalised}<br/>
                  <strong>Temporary password:</strong> ${password}</p>
               <p>Please sign in and change your password from your profile page.</p>`,
      });
      emailed = true;
    } catch (err) {
      logger.error(`Could not email credentials to ${normalised}: ${err.message}`);
    }
  }

  const roles = await roleMap();
  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      ...present(user, roles),
      /* Shown to the Super Admin once, on the screen that created the account.
       * Not stored anywhere in plain text and never returned again. */
      credentials: { email: normalised, password },
      emailed,
    },
  });
};

/** PUT /admin/api/users/:id */
const update = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

  const isSelf = String(user._id) === String(req.user._id);
  const wasSuperAdmin = user.roleKey === SUPER_ADMIN_KEY;

  if (req.body.name !== undefined) user.name = String(req.body.name).trim();

  if (req.body.email !== undefined) {
    const normalised = String(req.body.email).trim().toLowerCase();
    if (normalised !== user.email) {
      const clash = await User.findOne({ email: normalised, _id: { $ne: user._id } });
      if (clash) {
        return res.status(409).json({ status: 'error', message: 'That email is already registered' });
      }
      user.email = normalised;
    }
  }

  if (req.body.roleKey !== undefined && req.body.roleKey !== user.roleKey) {
    /* A Super Admin cannot be demoted from this screen, and nobody can be
     * promoted into one. Both directions of that change belong at the database
     * level, where it is deliberate. */
    if (wasSuperAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'A Super Admin’s role cannot be changed here',
      });
    }
    if (!ASSIGNABLE_ROLES.includes(req.body.roleKey)) {
      return res.status(400).json({
        status: 'error',
        message: `User type must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
      });
    }
    user.roleKey = req.body.roleKey;
    user.role = req.body.roleKey === 'editor' ? 'editor' : 'admin';
  }

  if (req.body.status !== undefined) {
    const next = parseInt(req.body.status);
    if (wasSuperAdmin && next === 0) {
      return res.status(403).json({ status: 'error', message: 'A Super Admin cannot be deactivated' });
    }
    if (isSelf && next === 0) {
      return res.status(400).json({ status: 'error', message: 'You cannot deactivate your own account' });
    }
    user.status = next;
  }

  if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;

  await user.save();
  const roles = await roleMap();
  res.json({ status: 'success', message: 'Updated successfully', data: present(user, roles) });
};

/**
 * DELETE /admin/api/users/:id
 * Soft delete. Records across this database carry the id of the user who
 * created them, so removing the row would orphan that history; the account is
 * hidden and barred from signing in instead.
 */
const destroy = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

  if (user.roleKey === SUPER_ADMIN_KEY) {
    return res.status(403).json({ status: 'error', message: 'A Super Admin cannot be deleted' });
  }
  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ status: 'error', message: 'You cannot delete your own account' });
  }

  user.deletedAt = new Date();
  user.status = 0;
  /* Free the address so it can be used again, while keeping the original on the
   * record for the audit trail. */
  user.set('deletedEmail', user.email);
  user.email = `${user.email}.deleted.${Date.now()}`;
  await user.save();

  res.json({ status: 'success', message: 'User removed successfully' });
};

/** POST /admin/api/users/:id/reset-password — issue a fresh generated password. */
const resetPassword = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

  const password = generatePassword();
  user.password = password;
  user.mustChangePassword = true;
  await user.save();

  let emailed = false;
  if (isConfigured()) {
    try {
      await sendMail({
        to: user.email,
        subject: 'Your Cocoma Digital admin password was reset',
        html: `<p>Hi ${user.name},</p>
               <p>Your admin password has been reset.</p>
               <p><strong>Email:</strong> ${user.email}<br/>
                  <strong>Temporary password:</strong> ${password}</p>
               <p>Please sign in and change it from your profile page.</p>`,
      });
      emailed = true;
    } catch (err) {
      logger.error(`Could not email the new password to ${user.email}: ${err.message}`);
    }
  }

  res.json({
    status: 'success',
    message: 'Password reset successfully',
    data: { credentials: { email: user.email, password }, emailed },
  });
};

/** GET /admin/api/users/roles — the assignable user types, for the form. */
const assignableRoles = async (req, res) => {
  const roles = await AdminRole.find({ key: { $in: ASSIGNABLE_ROLES } })
    .sort({ displayOrder: 1 })
    .lean();
  res.json({
    status: 'success',
    data: roles.map((r) => ({ key: r.key, name: r.name, description: r.description })),
  });
};

module.exports = {
  index, show, store, update, destroy, resetPassword, assignableRoles,
  generatePassword, ASSIGNABLE_ROLES,
};
