export const ROLE_NAME_MAP = {
  1: "admin",
  2: "manager",
  3: "employee",
  admin: "admin",
  manager: "manager",
  employee: "employee",
  hr: "hr",
  finance: "finance",
};

export const normalizeRole = (role) => {
  if (!role) return "employee";
  const key = typeof role === "string" ? role.toLowerCase() : role;
  return ROLE_NAME_MAP[key] || "employee";
};

export const filterNavItemsByRole = (items, role) => {
  const normalized = normalizeRole(role);
  return items.filter((item) => {
    if (!item.allowedRoles || item.allowedRoles.length === 0) {
      return true;
    }
    return item.allowedRoles.includes(normalized);
  });
};

export const isAdminRole = (role) => normalizeRole(role) === "admin";
export const isManagerRole = (role) => normalizeRole(role) === "manager";
