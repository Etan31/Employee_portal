/** Permissions are supplied by the database; role labels never grant capabilities. */
export function canAccess(item, permissions = []) {
  if (!item || !Array.isArray(permissions)) return false;
  const all = Array.isArray(item.permissions) ? item.permissions : [];
  const any = Array.isArray(item.anyPermissions) ? item.anyPermissions : [];
  return (all.length > 0 || any.length > 0) &&
    all.every(permission => permissions.includes(permission)) &&
    (!any.length || any.some(permission => permissions.includes(permission)));
}

/** Role checks are optional; route capability checks remain authoritative when supplied. */
export function isRouteAuthorized({ route, requiredRoles = [], requiredPermissions = [] }, { roles = [], permissions = [] }) {
  return (route === undefined || canAccess(route, permissions)) &&
    Array.isArray(requiredRoles) && (!requiredRoles.length || roles.some(role => requiredRoles.includes(role.code))) &&
    Array.isArray(requiredPermissions) && requiredPermissions.every(permission => permissions.includes(permission));
}

export function permittedItems(items, permissions) {
  return items.filter(item => canAccess(item, permissions));
}

export function homeRoute(routes, permissions) {
  const allowed = permittedItems(routes, permissions);
  return allowed.find(item => item.id === 'dashboard')?.route || allowed[0]?.route || null;
}

/** Choose dashboard content from grants without encoding the workspace in the URL. */
export function authorizedWorkspace(workspaces, permissions, preferred) {
  const allowed = workspaces.filter(workspace => permissions.includes(workspace.permission));
  if (preferred === 'employee' && permissions.includes('dashboard.read')) return null;
  return allowed.find(workspace => workspace.id === preferred) || [...allowed].sort((a,b) => a.home - b.home)[0] || null;
}

/** Accept only exact, registered local destinations after sign-in. */
export function loginDestination(routes, permissions, requested) {
  const target = routes.find(item => item.id === requested || item.route === `#/${requested}`);
  return canAccess(target, permissions) ? target.route : homeRoute(routes, permissions);
}
