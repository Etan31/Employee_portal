/** Permissions are supplied by the database; role labels never grant access. */
export function canAccess(item, permissions = []) {
  return Array.isArray(item?.permissions) && item.permissions.length > 0 &&
    item.permissions.every((permission) => permissions.includes(permission));
}

export function permittedItems(items, permissions) {
  return items.filter((item) => canAccess(item, permissions));
}

export function homeRoute(routes, permissions, preferred) {
  const allowed = permittedItems(routes, permissions);
  const saved = allowed.find((item) => item.id === preferred && item.home);
  return saved?.route || [...allowed].filter((item) => item.home)
    .sort((a, b) => a.home - b.home)[0]?.route || allowed[0]?.route || null;
}

/** Accept only exact, registered local destinations after sign-in. */
export function loginDestination(routes, permissions, requested, preferred) {
  const target = routes.find((item) => item.id === requested);
  return canAccess(target, permissions) ? target.route : homeRoute(routes, permissions, preferred);
}
