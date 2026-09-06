const mongoose = require('mongoose');
const { MODULES, ACTIONS } = require('../config/adminModules');

/* An admin user type, and the module-by-module permissions everyone holding it
 * gets. Permissions belong to the ROLE, never to the individual user: change a
 * role and every user assigned to it changes with it.
 *
 * Mirrors the CRM module's CrmRole (isSystem, a permission set, seeded
 * defaults) so the two authorization layers read the same way, but stores a
 * module × action matrix rather than a flat key list because the admin panel
 * is organised by module and the matrix is what the Super Admin edits.
 */

const permissionSchema = new mongoose.Schema({
  /** A key from config/adminModules. */
  module: { type: String, required: true, trim: true },
  view: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  update: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  export: { type: Boolean, default: false },
  import: { type: Boolean, default: false },
}, { _id: false });

const adminRoleSchema = new mongoose.Schema({
  /** Stable identifier stored on the user. Never changes once created. */
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['super_admin', 'admin_manager', 'editor', 'custom'],
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  /* Shipped with the product: cannot be deleted, and its key cannot change.
   * All four roles are system roles — the Super Admin edits their permissions,
   * not their identity. */
  isSystem: { type: Boolean, default: true },
  /* Super Admin only. Short-circuits every permission check, so a mistake in
   * the matrix can never lock the owner out of their own panel. */
  fullAccess: { type: Boolean, default: false },
  permissions: { type: [permissionSchema], default: [] },
  displayOrder: { type: Number, default: 0 },
  status: { type: Number, enum: [0, 1], default: 1 },
}, { timestamps: true, collection: 'admin_roles' });

/** Read one module's actions off a role, as a plain object. */
adminRoleSchema.methods.permissionsFor = function permissionsFor(moduleKey) {
  if (this.fullAccess) {
    return ACTIONS.reduce((acc, a) => ({ ...acc, [a]: true }), {});
  }
  const row = (this.permissions || []).find((p) => p.module === moduleKey);
  return ACTIONS.reduce((acc, a) => ({ ...acc, [a]: Boolean(row && row[a]) }), {});
};

/* ── Default permission sets ───────────────────────────────────────────────
 * The starting point for each role. The Super Admin can change any of it from
 * Roles & Permissions afterwards; these are only what a fresh install gets. */

const allOn = (mod) =>
  mod.actions.reduce((acc, a) => ({ ...acc, [a]: true }), { module: mod.key });

const allOff = (mod) => ({ module: mod.key });

/** Everything except the two Super-Admin-only modules. */
const managerDefaults = () =>
  MODULES.map((m) => (m.superAdminOnly ? allOff(m) : allOn(m)));

/** Content modules, but no deleting and nothing operational. */
const editorDefaults = () =>
  MODULES.map((m) => {
    if (m.superAdminOnly) return allOff(m);
    if (m.key === 'dashboard') return { module: m.key, view: true };
    // Enquiries and bookings are other people's data, not content.
    if (m.key === 'contact') return allOff(m);
    /* Media library: an editor contributes, they do not adjudicate.
     * `create` is the upload; `update` is what approve, reject and
     * bulk-approve now grade as, so withholding it is what keeps the
     * uploader and the approver two different people. A studio that
     * wants a given editor reviewing gives them `update` explicitly
     * from Roles & Permissions — a decision, not a default. */
    if (m.key === 'media') {
      return {
        module: m.key, view: true, create: true, update: false,
        delete: false, export: false, import: false,
      };
    }
    return {
      module: m.key,
      view: true,
      create: true,
      update: true,
      delete: false,
      export: m.actions.includes('export'),
      import: false,
    };
  });

/** Nothing but the dashboard until the Super Admin grants more. */
const customDefaults = () =>
  MODULES.map((m) => (m.key === 'dashboard' ? { module: m.key, view: true } : allOff(m)));

const DEFAULT_ROLES = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Unrestricted access to every module, plus user and permission management.',
    isSystem: true,
    fullAccess: true,
    permissions: MODULES.map(allOn),
    displayOrder: 1,
  },
  {
    key: 'admin_manager',
    name: 'Admin / Manager',
    description: 'Full access to every content and operations module. Cannot manage users or permissions.',
    isSystem: true,
    fullAccess: false,
    permissions: managerDefaults(),
    displayOrder: 2,
  },
  {
    key: 'editor',
    name: 'Editor / Content Manager',
    description: 'Creates and edits content. Cannot delete, and cannot see enquiries or bookings.',
    isSystem: true,
    fullAccess: false,
    permissions: editorDefaults(),
    displayOrder: 3,
  },
  {
    key: 'custom',
    name: 'Custom User',
    description: 'Starts with the dashboard only. The Super Admin chooses what this role can reach.',
    isSystem: true,
    fullAccess: false,
    permissions: customDefaults(),
    displayOrder: 4,
  },
];

const ROLE_KEYS = DEFAULT_ROLES.map((r) => r.key);

module.exports = mongoose.model('AdminRole', adminRoleSchema);
module.exports.DEFAULT_ROLES = DEFAULT_ROLES;
module.exports.ROLE_KEYS = ROLE_KEYS;
