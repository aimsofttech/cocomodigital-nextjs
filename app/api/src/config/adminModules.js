/**
 * The admin panel's module catalog — the single source of truth for what can
 * be permissioned, and the map from a request path back to the module it
 * belongs to.
 *
 * Derived from the panel as it actually is: `apiPrefixes` are the mounts in
 * server.js, `routePrefixes` are the paths in the admin app's router. Adding a
 * module means adding a row here; nothing else in the authorization layer
 * needs to change.
 *
 * Keeping the mapping in one table is what lets a single middleware guard all
 * ~80 admin mounts without editing a single existing route file.
 */

/** Every action a role can be granted. Not every module uses every one. */
const ACTIONS = ['view', 'create', 'update', 'delete', 'export', 'import'];

/** The four actions every module supports. */
const CRUD = ['view', 'create', 'update', 'delete'];

/** Modules built on crudFactory also expose CSV export/import. */
const CRUD_CSV = [...CRUD, 'export', 'import'];

const MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    /* Read-only: the dashboard aggregates other modules and has no writes. */
    actions: ['view'],
    routePrefixes: ['/dashboard'],
    apiPrefixes: ['/dashboard'],
  },
  {
    key: 'home',
    label: 'Home',
    actions: CRUD_CSV,
    routePrefixes: ['/home', '/settings'],
    apiPrefixes: [
      '/top-banner', '/brands', '/service-department', '/growth-stats',
      '/service-category', '/video', '/client',
      '/home-page-section', '/home-page-section-item',
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing Campaigns',
    actions: CRUD_CSV,
    routePrefixes: ['/marketing'],
    apiPrefixes: ['/marketing-house'],
  },
  {
    key: 'creative',
    label: 'Creative House',
    actions: CRUD_CSV,
    routePrefixes: ['/creative'],
    apiPrefixes: ['/creative-house'],
  },
  {
    key: 'development',
    label: 'Development House',
    actions: CRUD_CSV,
    routePrefixes: ['/development'],
    apiPrefixes: ['/development-house'],
  },
  {
    key: 'group-service',
    label: 'Group Services',
    actions: CRUD_CSV,
    routePrefixes: ['/group-service'],
    apiPrefixes: [
      '/group-service', '/group-service-item-faq', '/creator-platform',
      '/success-stories', '/success-stories-project',
      '/monthly-performance', '/social-work',
    ],
  },
  {
    key: 'growth-services',
    label: 'Growth Services',
    actions: CRUD_CSV,
    routePrefixes: ['/growth-services'],
    apiPrefixes: ['/growth-service'],
  },
  {
    key: 'podcast',
    label: 'Podcast',
    actions: CRUD_CSV,
    routePrefixes: ['/podcast'],
    apiPrefixes: ['/podcast'],
  },
  {
    key: 'blog',
    label: 'Blog',
    actions: CRUD_CSV,
    routePrefixes: ['/blog'],
    apiPrefixes: ['/blog'],
  },
  {
    key: 'gallery',
    label: 'Gallery',
    actions: CRUD_CSV,
    routePrefixes: ['/gallery'],
    apiPrefixes: ['/gallery'],
  },
  {
    key: 'templates',
    label: 'Common Templates',
    actions: CRUD_CSV,
    routePrefixes: ['/templates'],
    apiPrefixes: ['/template', '/page', '/faq', '/whatsapp-template', '/admin-post'],
  },
  {
    key: 'jobs',
    label: 'Jobs',
    actions: CRUD_CSV,
    routePrefixes: ['/jobs'],
    apiPrefixes: ['/job'],
  },
  {
    key: 'contact',
    label: 'Contact',
    /* Enquiries and bookings arrive from the website; nothing is created here,
     * but they are answered, rescheduled and removed. */
    actions: ['view', 'update', 'delete', 'export'],
    routePrefixes: ['/contact'],
    apiPrefixes: [
      '/contact-us', '/free-consultation', '/meetings', '/meeting-availability',
    ],
  },
  {
    key: 'users',
    label: 'User Management',
    /* Super Admin only, enforced separately from the permission matrix — see
     * `superAdminOnly`. Listed here so the module appears in the matrix as
     * permanently off for every other role rather than silently missing. */
    actions: CRUD,
    routePrefixes: ['/users'],
    apiPrefixes: ['/users'],
    superAdminOnly: true,
  },
  {
    key: 'roles',
    label: 'Roles & Permissions',
    actions: ['view', 'update'],
    routePrefixes: ['/roles'],
    apiPrefixes: ['/roles'],
    superAdminOnly: true,
  },
  {
    key: 'media',
    label: 'Media Library',
    /* Caspian. This row has to exist before '/media' can leave
     * UPLOAD_PREFIXES below: moduleForApiPath() returns null for an
     * unclaimed mount and the guard then denies everything, so removing
     * the prefix without registering the module would take the library
     * offline rather than secure it. The two changes are one change.
     *
     * `routePrefixes` points at /caspian in app/web, not at the admin
     * SPA — the library's screens live on the public app behind the same
     * session, so the admin router has no matching route today. */
    actions: CRUD,
    routePrefixes: ['/caspian'],
    /* Both, explicitly. underPrefix() matches on segment boundaries, so
     * '/media-jobs' is NOT under '/media' — without this row the job
     * router would be an unclaimed mount and denied for everyone. */
    apiPrefixes: ['/media', '/media-jobs'],
  },
];

/* Mounts every signed-in admin may reach whatever their role, because they are
 * not modules in their own right:
 *   /auth     logging in and out, and reading your own session
 *   /profile  your own name, picture and password
 * Note this list does NOT include the uploader — see UPLOAD_PREFIXES below,
 * which is separately gated on the caller holding create or update somewhere,
 * so a read-only role cannot use it to push files into the bucket. */
const ALWAYS_ALLOWED_PREFIXES = ['/auth', '/profile'];
/* The shared uploader behind every other module's forms. A user who may
 * create or update anything may put a file behind it, which is why this
 * prefix short-circuits the module matrix in adminAccess.
 *
 * '/media' used to sit here too, and that was the whole of defect D1:
 * the media library is not an upload widget, it is a module with its own
 * governance, and inheriting the widget's bypass meant anyone holding
 * create-or-update on ANY module could approve, reject, delete and read
 * NDA material. It is now the 'media' module above and is graded like
 * every other mount. */
const UPLOAD_PREFIXES = ['/uploads'];

const MODULE_KEYS = MODULES.map((m) => m.key);
const MODULE_BY_KEY = new Map(MODULES.map((m) => [m.key, m]));

/** Does `path` sit under `prefix`? Exact segment match, so /job never eats
 *  /jobseeker and /podcast never eats /podcasts. */
const underPrefix = (path, prefix) =>
  path === prefix || path.startsWith(`${prefix}/`);

/** Longest-prefix match so /group-service-item-faq beats /group-service. */
const matchPrefix = (path, prefixes) => {
  let best = null;
  for (const prefix of prefixes) {
    if (underPrefix(path, prefix) && (!best || prefix.length > best.length)) best = prefix;
  }
  return best;
};

/**
 * Which module does an admin API path belong to?
 * `path` is relative to the /admin/api mount, e.g. "/marketing-house/item/12".
 * Returns null for a path no module claims, which the middleware treats as
 * "deny unless it is one of the always-allowed mounts".
 */
const moduleForApiPath = (path) => {
  let best = null;
  for (const mod of MODULES) {
    const hit = matchPrefix(path, mod.apiPrefixes);
    if (hit && (!best || hit.length > best.prefix.length)) best = { module: mod, prefix: hit };
  }
  return best ? best.module : null;
};

/** Same, for a path in the admin app's router (e.g. "/marketing/item/add"). */
const moduleForRoutePath = (path) => {
  let best = null;
  for (const mod of MODULES) {
    const hit = matchPrefix(path, mod.routePrefixes);
    if (hit && (!best || hit.length > best.prefix.length)) best = { module: mod, prefix: hit };
  }
  return best ? best.module : null;
};

/**
 * Which action is this request performing?
 *
 * The CSV routes are checked before the plain verbs because they are a POST
 * and a GET that mean something more specific than "create" and "view".
 */
/* Media routes where the HTTP verb is the wrong signal.
 *
 * Grading by verb alone makes POST mean 'create' everywhere, which in the
 * media library collapses two different rights into one: uploading a file
 * and deciding whether that file may be used. Anyone allowed to add to the
 * library would be allowed to approve their own additions, and an approval
 * queue whose uploader is also its approver is not a queue.
 *
 * So the verdict routes grade as 'update' — the right to change what an
 * asset means, not to add another one. Re-running the describer is an
 * update too: it overwrites stored description fields and costs money.
 *
 * Scoped to /media deliberately. Every other module keeps plain verb
 * grading, which is correct for CRUD screens and is what the other
 * fourteen modules were built against. */
const MEDIA_ACTION_OVERRIDES = [
  { verb: 'POST', test: /^\/media\/(bulk-approve|describe-queue)$/, action: 'update' },
  { verb: 'POST', test: /^\/media\/[^/]+\/(approve|reject|describe)$/, action: 'update' },
  /* Removing a name is the same capability as adding one, not the same as
   * deleting an asset. Graded by verb alone, DELETE /media/:id/people/:pid
   * needs `delete` — which contributors do not have — so somebody who
   * tagged the wrong person could not take it back, and a wrong name would
   * sit there until a reviewer happened to notice. The wrong name is the
   * worse outcome, and it is the one the verb default produces.
   *
   * The verb is part of the match. Without it this pattern also catches
   * GET /media/:id/people/suggestions, and a read starts demanding write
   * permission — which is how a guard that was meant to loosen one route
   * quietly tightens another. */
  { verb: 'DELETE', test: /^\/media\/[^/]+\/people\/[^/]+$/, action: 'create' },
];

const actionForRequest = (method, path) => {
  const verb = String(method || '').toUpperCase();
  if (/\/export\/csv$/.test(path)) return 'export';
  if (/\/import\/csv$/.test(path)) return 'import';
  if (/\/bulk-upload(\/|$)/.test(path)) return 'import';
  const override = MEDIA_ACTION_OVERRIDES.find((o) => o.verb === verb && o.test.test(path));
  if (override) return override.action;
  switch (verb) {
    case 'GET':
    case 'HEAD':
      return 'view';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'view';
  }
};

const isAlwaysAllowed = (path) =>
  ALWAYS_ALLOWED_PREFIXES.some((p) => underPrefix(path, p));

const isUploadPath = (path) => UPLOAD_PREFIXES.some((p) => underPrefix(path, p));

module.exports = {
  ACTIONS,
  MODULES,
  MODULE_KEYS,
  MODULE_BY_KEY,
  moduleForApiPath,
  moduleForRoutePath,
  actionForRequest,
  isAlwaysAllowed,
  isUploadPath,
};
