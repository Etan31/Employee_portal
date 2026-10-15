/** Validate the database access contract before trusting grants on client or server. */
export function resolveAccessContext(value, userId) {
  if (!value || typeof value !== 'object' || typeof value.active !== 'boolean') {
    throw new Error('Invalid access response');
  }
  if (!value.active) return null;
  if (!Array.isArray(value.roles) || !Array.isArray(value.permissions) ||
      value.roles.some(role => !role || typeof role.code !== 'string' || !/^[a-z][a-z0-9_]*$/.test(role.code)) ||
      value.permissions.some(permission => typeof permission !== 'string' || !/^[a-z][a-z0-9_.:]*$/.test(permission))) {
    throw new Error('Invalid access grants');
  }
  if (!value.roles.length || !value.permissions.length) return null;
  if (!value.profile || value.profile.id !== userId) throw new Error('Access identity mismatch');
  return {
    active: true,
    profile: value.profile,
    roles: value.roles,
    permissions: [...new Set(value.permissions)],
  };
}
