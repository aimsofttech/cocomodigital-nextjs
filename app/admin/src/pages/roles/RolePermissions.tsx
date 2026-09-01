import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import ContentLoader from '@/components/ui/ContentLoader';
import { adminRoleApi } from '@/services/adminApi';

/* Roles & Permissions — Super Admin only.
 *
 * One matrix per user type: modules down the side, actions across the top.
 * Saving changes what every user holding that role can do, immediately — there
 * is no per-user configuration anywhere in the system.
 *
 * Built from the existing card/table/button classes so it sits inside the panel
 * without introducing a new visual language.
 */

type Action = 'view' | 'create' | 'update' | 'delete' | 'export' | 'import';

interface ModuleDef { key: string; label: string; actions: Action[]; superAdminOnly: boolean }
interface PermissionRow { module: string; [action: string]: any }
interface Role {
  _id: string;
  key: string;
  name: string;
  description: string;
  fullAccess: boolean;
  permissions: PermissionRow[];
  userCount: number;
  updatedAt?: string;
}

const ACTION_LABEL: Record<Action, string> = {
  view: 'View',
  create: 'Add',
  update: 'Update',
  delete: 'Delete',
  export: 'Export',
  import: 'Import',
};

export default function RolePermissions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState<ModuleDef[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeKey, setActiveKey] = useState('');
  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({});

  const load = async () => {
    try {
      const [cat, list] = await Promise.all([adminRoleApi.catalog(), adminRoleApi.getAll()]);
      setModules(cat.data.data.modules);
      setActions(cat.data.data.actions);
      const rows: Role[] = list.data.data;
      setRoles(rows);
      setActiveKey((k) => k || rows.find((r) => !r.fullAccess)?.key || rows[0]?.key || '');
    } catch {
      toast.error('Could not load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const active = roles.find((r) => r.key === activeKey) || null;

  // Reset the working copy whenever a different role is opened.
  useEffect(() => {
    if (!active) return;
    const byModule = new Map(active.permissions.map((p) => [p.module, p]));
    const next: Record<string, Record<string, boolean>> = {};
    for (const mod of modules) {
      const row = byModule.get(mod.key);
      next[mod.key] = mod.actions.reduce((acc, a) => {
        acc[a] = active.fullAccess || Boolean(row && row[a]);
        return acc;
      }, {} as Record<string, boolean>);
    }
    setDraft(next);
  }, [activeKey, roles, modules]);

  const dirty = useMemo(() => {
    if (!active || active.fullAccess) return false;
    const byModule = new Map(active.permissions.map((p) => [p.module, p]));
    return modules.some((mod) =>
      mod.actions.some((a) => {
        const saved = Boolean(byModule.get(mod.key)?.[a]);
        return Boolean(draft[mod.key]?.[a]) !== saved;
      }));
  }, [draft, active, modules]);

  const toggle = (moduleKey: string, action: Action) => {
    setDraft((prev) => {
      const row = { ...(prev[moduleKey] || {}) };
      const next = !row[action];
      row[action] = next;
      /* Any other action implies being able to open the module — a role that
         can edit a page it cannot reach is a setting that cannot be used. */
      if (next && action !== 'view') row.view = true;
      // Turning View off turns the rest off with it, for the same reason.
      if (!next && action === 'view') {
        Object.keys(row).forEach((k) => { row[k] = false; });
      }
      return { ...prev, [moduleKey]: row };
    });
  };

  const setModuleAll = (moduleKey: string, on: boolean) => {
    const mod = modules.find((m) => m.key === moduleKey);
    if (!mod) return;
    setDraft((prev) => ({
      ...prev,
      [moduleKey]: mod.actions.reduce((acc, a) => ({ ...acc, [a]: on }), {}),
    }));
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const permissions = modules
        .filter((m) => !m.superAdminOnly)
        .map((m) => ({ module: m.key, ...draft[m.key] }));
      await adminRoleApi.update(active.key, { permissions });
      toast.success(`${active.name} permissions saved`);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ContentLoader />;

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Roles & Permissions' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Roles */}
        <div className="card p-3 lg:sticky lg:top-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-1 mb-2">
            User Types
          </p>
          <ul className="space-y-1">
            {roles.map((role) => {
              const isActive = role.key === activeKey;
              return (
                <li key={role.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(role.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary-600 text-white' : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span className="block text-sm font-medium truncate">{role.name}</span>
                    <span className={`block text-xs truncate ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                      {role.userCount} user{role.userCount === 1 ? '' : 's'}
                      {role.fullAccess ? ' · full access' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Matrix */}
        <div className="lg:col-span-3 space-y-4">
          {active && (
            <>
              <div className="card">
                <h2 className="text-base font-semibold text-gray-900">{active.name}</h2>
                <p className="mt-1 text-xs text-gray-500">{active.description}</p>
                {active.fullAccess && (
                  <p className="mt-3 flex items-start gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <LockClosedIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                    <span>
                      Super Admin always has every permission, and that cannot be edited. It is what
                      guarantees somebody can always reach this screen to fix a mistake made on the
                      others.
                    </span>
                  </p>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left font-semibold text-gray-700 py-2.5 pr-4 min-w-[190px]">Module</th>
                        {actions.map((a) => (
                          <th key={a} className="font-semibold text-gray-700 py-2.5 px-3 text-center whitespace-nowrap">
                            {ACTION_LABEL[a]}
                          </th>
                        ))}
                        <th className="py-2.5 pl-3 text-right whitespace-nowrap" />
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod) => {
                        const locked = active.fullAccess || mod.superAdminOnly;
                        const row = draft[mod.key] || {};
                        const allOn = mod.actions.every((a) => row[a]);
                        return (
                          <tr key={mod.key} className="border-b border-gray-100 last:border-0">
                            <td className="py-2.5 pr-4">
                              <span className="font-medium text-gray-900">{mod.label}</span>
                              {mod.superAdminOnly && (
                                <span className="block text-[11px] text-gray-400">Super Admin only</span>
                              )}
                            </td>
                            {actions.map((a) => {
                              const supported = mod.actions.includes(a);
                              if (!supported) {
                                return <td key={a} className="py-2.5 px-3 text-center text-gray-300">—</td>;
                              }
                              const on = mod.superAdminOnly ? false : Boolean(row[a]);
                              return (
                                <td key={a} className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => toggle(mod.key, a)}
                                    aria-pressed={on}
                                    aria-label={`${ACTION_LABEL[a]} ${mod.label}`}
                                    className={`w-6 h-6 rounded-md border inline-flex items-center justify-center transition-colors ${
                                      on
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'bg-white border-gray-300 text-transparent hover:border-primary-400'
                                    } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
                                  </button>
                                </td>
                              );
                            })}
                            <td className="py-2.5 pl-3 text-right">
                              {!locked && (
                                <button
                                  type="button"
                                  onClick={() => setModuleAll(mod.key, !allOn)}
                                  className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap"
                                >
                                  {allOn ? 'Clear' : 'All'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {!active.fullAccess && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    Applies to all {active.userCount} user{active.userCount === 1 ? '' : 's'} with this
                    type, as soon as they reload.
                  </p>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || !dirty}
                    className="btn-primary btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
