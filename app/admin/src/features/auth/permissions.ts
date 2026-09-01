import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';

/**
 * What the signed-in user is allowed to do, and where.
 *
 * The permission map arrives with the login response and is refreshed from
 * /admin/api/profile on every app load, so a role change a Super Admin makes
 * lands on the next refresh rather than the next sign-in.
 *
 * Everything here is a convenience for the interface — hiding a menu item the
 * user cannot use, or a button that would only fail. It is not the security
 * boundary. Every one of these modules is enforced again on the server by
 * middleware/adminAccess.js, so a hidden button and a hand-typed URL reach the
 * same answer.
 *
 * MODULES must stay in step with app/api/src/config/adminModules.js — the keys
 * are the contract between the two.
 */

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'export' | 'import';

export interface ModuleDef {
  key: string;
  label: string;
  /** Admin router path prefixes that belong to this module. */
  routePrefixes: string[];
  superAdminOnly?: boolean;
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', routePrefixes: ['/dashboard'] },
  { key: 'home', label: 'Home', routePrefixes: ['/home', '/settings'] },
  { key: 'marketing', label: 'Marketing Campaigns', routePrefixes: ['/marketing'] },
  { key: 'creative', label: 'Creative House', routePrefixes: ['/creative'] },
  { key: 'development', label: 'Development House', routePrefixes: ['/development'] },
  { key: 'group-service', label: 'Group Services', routePrefixes: ['/group-service'] },
  { key: 'growth-services', label: 'Growth Services', routePrefixes: ['/growth-services'] },
  { key: 'podcast', label: 'Podcast', routePrefixes: ['/podcast'] },
  { key: 'blog', label: 'Blog', routePrefixes: ['/blog'] },
  { key: 'gallery', label: 'Gallery', routePrefixes: ['/gallery'] },
  { key: 'templates', label: 'Common Templates', routePrefixes: ['/templates'] },
  { key: 'jobs', label: 'Jobs', routePrefixes: ['/jobs'] },
  { key: 'contact', label: 'Contact', routePrefixes: ['/contact'] },
  { key: 'users', label: 'User Management', routePrefixes: ['/users'], superAdminOnly: true },
  { key: 'roles', label: 'Roles & Permissions', routePrefixes: ['/roles'], superAdminOnly: true },
];

/** Paths every signed-in admin may reach whatever their role. */
const ALWAYS_ALLOWED = ['/profile', '/unauthorized'];

export type PermissionMap = Record<string, Partial<Record<PermissionAction, boolean>>>;

const under = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

/** Longest-prefix match, so /group-service-item never resolves to the wrong row. */
export function moduleForPath(path: string): ModuleDef | null {
  let best: { mod: ModuleDef; len: number } | null = null;
  for (const mod of MODULES) {
    for (const prefix of mod.routePrefixes) {
      if (under(path, prefix) && (!best || prefix.length > best.len)) {
        best = { mod, len: prefix.length };
      }
    }
  }
  return best ? best.mod : null;
}

export const isAlwaysAllowedPath = (path: string) =>
  ALWAYS_ALLOWED.some((p) => under(path, p));

export interface Permissions {
  /** Unrestricted: every check short-circuits to true. */
  isSuperAdmin: boolean;
  roleKey: string;
  roleName: string;
  /** Can the user perform `action` in `moduleKey`? */
  can: (moduleKey: string | null | undefined, action: PermissionAction) => boolean;
  /** Is the module visible at all? */
  canView: (moduleKey: string | null | undefined) => boolean;
  /** Can the user open this admin route? */
  canOpenPath: (path: string) => boolean;
  /** The module a path belongs to, or null. */
  moduleForPath: (path: string) => ModuleDef | null;
  /** Permissions for the route currently on screen. */
  current: {
    module: ModuleDef | null;
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    export: boolean;
    import: boolean;
  };
}

export function usePermissions(): Permissions {
  const { user, permissions } = useAppSelector((state) => state.auth);
  const { pathname } = useLocation();

  return useMemo(() => {
    const isSuperAdmin = Boolean(user?.isSuperAdmin) || user?.roleKey === 'super_admin';
    const map: PermissionMap = permissions || {};

    const can = (moduleKey: string | null | undefined, action: PermissionAction) => {
      if (isSuperAdmin) return true;
      if (!moduleKey) return false;
      const mod = MODULES.find((m) => m.key === moduleKey);
      if (mod?.superAdminOnly) return false;
      return Boolean(map[moduleKey]?.[action]);
    };

    const canView = (moduleKey: string | null | undefined) => can(moduleKey, 'view');

    const canOpenPath = (path: string) => {
      if (isAlwaysAllowedPath(path)) return true;
      const mod = moduleForPath(path);
      /* A path no module claims (a stray or not-found route) is left alone —
         the router's own catch-all decides what to show, and blocking it here
         would turn a 404 into a confusing "no access". */
      if (!mod) return true;
      return canView(mod.key);
    };

    const mod = moduleForPath(pathname);
    return {
      isSuperAdmin,
      roleKey: user?.roleKey || '',
      roleName: user?.roleName || '',
      can,
      canView,
      canOpenPath,
      moduleForPath,
      current: {
        module: mod,
        view: canView(mod?.key),
        create: can(mod?.key, 'create'),
        update: can(mod?.key, 'update'),
        delete: can(mod?.key, 'delete'),
        export: can(mod?.key, 'export'),
        import: can(mod?.key, 'import'),
      },
    };
  }, [user, permissions, pathname]);
}
