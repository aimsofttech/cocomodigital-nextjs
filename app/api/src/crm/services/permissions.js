'use strict';

/**
 * Flat permission catalog + default role bundles.
 * Roles store an array of these keys; middleware/crmAuth.requirePermission
 * checks membership. Admin role implicitly has everything via '*'.
 */

const PERMISSIONS = [
  'leads:read', 'leads:create', 'leads:update', 'leads:delete',
  'leads:assign', 'leads:convert', 'leads:import', 'leads:export',
  'contacts:read', 'contacts:create', 'contacts:update', 'contacts:delete',
  'companies:read', 'companies:manage',
  'deals:read', 'deals:create', 'deals:update', 'deals:delete', 'pipelines:manage',
  'calls:read', 'calls:create', 'calls:update', 'calls:delete',
  // Bulk / automated dialling is deliberately separate from calls:create. One
  // agent placing one call is routine; queueing a thousand robocalls carries
  // real cost and regulatory exposure, so it is a Manager-and-above action.
  'calls:bulk', 'calls:recordings',
  'messages:read', 'messages:send',
  'templates:manage',
  'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete',
  'followups:manage',
  'documents:read', 'documents:manage',
  'automations:manage',
  'dashboard:view', 'reports:view',
  'notifications:read',
  'users:manage', 'roles:manage', 'settings:manage', 'audit:read',
];

const READ_ONLY = PERMISSIONS.filter((p) => p.endsWith(':read')).concat([
  'dashboard:view', 'reports:view', 'notifications:read',
]);

const AGENT = [
  'leads:read', 'leads:create', 'leads:update', 'leads:convert',
  'contacts:read', 'contacts:create', 'contacts:update',
  'companies:read', 'companies:manage',
  'deals:read', 'deals:create', 'deals:update',
  'calls:read', 'calls:create', 'calls:update', 'calls:recordings',
  'messages:read', 'messages:send',
  'tasks:read', 'tasks:create', 'tasks:update',
  'followups:manage',
  'documents:read', 'documents:manage',
  'dashboard:view', 'reports:view', 'notifications:read',
];

const MANAGER = PERMISSIONS.filter(
  (p) => !['users:manage', 'roles:manage', 'settings:manage', 'audit:read'].includes(p)
);

const DEFAULT_ROLES = [
  { name: 'Admin', isSystem: true, ownScope: false, permissions: ['*'] },
  { name: 'Manager', isSystem: true, ownScope: false, permissions: MANAGER },
  { name: 'Sales Agent', isSystem: true, ownScope: true, permissions: AGENT },
  { name: 'Viewer', isSystem: true, ownScope: false, permissions: READ_ONLY },
];

const hasPermission = (role, perm) => {
  if (!role || !Array.isArray(role.permissions)) return false;
  return role.permissions.includes('*') || role.permissions.includes(perm);
};

module.exports = { PERMISSIONS, DEFAULT_ROLES, hasPermission };
