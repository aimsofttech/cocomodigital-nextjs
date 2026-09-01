const AdminRole = require('../../models/AdminRole');
const User = require('../../models/User');
const { MODULES, ACTIONS } = require('../../config/adminModules');

/* Roles & Permissions — Super Admin only.
 *
 * Permissions are stored against the role, so saving here changes what every
 * user holding that role can do, immediately and without touching a single
 * user record.
 */

/** The catalog the matrix screen renders its columns and rows from. */
const catalog = async (req, res) => {
  res.json({
    status: 'success',
    data: {
      actions: ACTIONS,
      modules: MODULES.map((m) => ({
        key: m.key,
        label: m.label,
        actions: m.actions,
        superAdminOnly: !!m.superAdminOnly,
      })),
    },
  });
};

/** GET /admin/api/roles */
const index = async (req, res) => {
  const roles = await AdminRole.find({}).sort({ displayOrder: 1 }).lean();

  // How many people hold each role — shown in the list so the Super Admin can
  // see the blast radius of a change before making it.
  const counts = await User.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: '$roleKey', count: { $sum: 1 } } },
  ]);
  const countByKey = new Map(counts.map((c) => [c._id, c.count]));

  res.json({
    status: 'success',
    data: roles.map((r) => ({
      _id: r._id,
      key: r.key,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      fullAccess: r.fullAccess,
      permissions: r.permissions,
      userCount: countByKey.get(r.key) || 0,
      displayOrder: r.displayOrder,
      status: r.status,
      updatedAt: r.updatedAt,
    })),
  });
};

/** GET /admin/api/roles/:key */
const show = async (req, res) => {
  const role = await AdminRole.findOne({ key: req.params.key }).lean();
  if (!role) return res.status(404).json({ status: 'error', message: 'Role not found' });
  res.json({ status: 'success', data: role });
};

/**
 * PUT /admin/api/roles/:key
 * Replaces the permission matrix for one role.
 *
 * Only the matrix, the name and the description are writable — `key`,
 * `isSystem` and `fullAccess` define what a role *is* and are not editable
 * from the panel.
 */
const update = async (req, res) => {
  const role = await AdminRole.findOne({ key: req.params.key });
  if (!role) return res.status(404).json({ status: 'error', message: 'Role not found' });

  if (role.key === 'super_admin') {
    /* Refused rather than silently ignored: the Super Admin's access is what
     * guarantees this screen stays reachable, so an edit that looked like it
     * saved and did nothing would be worse than a clear no. */
    return res.status(403).json({
      status: 'error',
      message: 'Super Admin permissions are fixed — the role always has full access.',
    });
  }

  if (req.body.name !== undefined && String(req.body.name).trim()) {
    role.name = String(req.body.name).trim();
  }
  if (req.body.description !== undefined) role.description = String(req.body.description);

  if (Array.isArray(req.body.permissions)) {
    const allowed = new Map(MODULES.map((m) => [m.key, m]));
    const next = [];
    for (const row of req.body.permissions) {
      const mod = allowed.get(row && row.module);
      if (!mod) continue;                 // ignore unknown modules
      if (mod.superAdminOnly) continue;   // never grantable to another role
      const entry = { module: mod.key };
      for (const action of ACTIONS) {
        // A module only gets the actions it actually supports.
        entry[action] = mod.actions.includes(action) ? Boolean(row[action]) : false;
      }
      /* Any action implies being able to see the module — a role that can edit
       * a page it cannot open is a configuration that cannot be used. */
      if (mod.actions.some((a) => a !== 'view' && entry[a])) entry.view = true;
      next.push(entry);
    }
    // Modules the client didn't send stay as they were rather than being wiped.
    const sent = new Set(next.map((p) => p.module));
    const kept = (role.permissions || []).filter((p) => !sent.has(p.module));
    role.permissions = [...next, ...kept];
  }

  await role.save();
  res.json({ status: 'success', message: 'Permissions updated successfully', data: role });
};

module.exports = { catalog, index, show, update };
