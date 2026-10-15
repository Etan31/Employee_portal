const route = (id, label, permission, extra = {}) => ({
  id, label, route: `#/${id}`, icon: 'layout-dashboard', permissions: [permission], ...extra,
});

export const SHARED_ROUTES = [
  route('dashboard', 'Dashboard', 'dashboard.read', { home: 5 }),
  route('task-box', 'Task Box', 'task.self', { icon: 'list-checks' }),
  route('profile', 'Profile', 'profile.self', { icon: 'user' }),
  route('time-management', 'Time management', 'time.self', { icon: 'clock' }),
  route('employees', 'Employees', 'directory.read', { icon: 'users' }),
  route('calendar', 'Calendar', 'calendar.read', { icon: 'calendar' }),
  route('hr-policies', 'HR Policies', 'policy.read', { icon: 'file-text' }),
  route('helpdesk', 'Helpdesk', 'ticket.self', { icon: 'message-square' }),
  route('org-view', 'Org View', 'org.read', { icon: 'network' }),
  route('settings', 'Settings', 'preferences.self', { icon: 'settings', hidden: true }),
];

export const WORKSPACES = [
  { id: 'admin', label: 'System Administration', permission: 'admin.workspace', home: 1,
    description: 'Manage account access and system configuration.',
    modules: [['accounts', 'Accounts', 'account.read'], ['roles', 'Roles & Permissions', 'role.assign'], ['organization', 'Organization Configuration', 'org.configure'], ['feature-flags', 'Feature Flags', 'system.configure'], ['integrations', 'Integrations', 'integration.manage'], ['audit', 'Security Audit', 'audit.read_security'], ['health', 'System Health', 'system.health']] },
  { id: 'hr', label: 'HR Administration', permission: 'hr.workspace', home: 2,
    description: 'People operations and employee records within your authorized scope.',
    modules: [['employees', 'HR People Directory', 'employee.read_private'], ['employee-records', 'Employee Records', 'employee.read_private'], ['lifecycle', 'Onboarding & Offboarding', 'employee.update_employment'], ['leave-policies', 'Leave Policies', 'leave.policy.manage'], ['leave-adjustments', 'Leave Adjustments', 'leave.adjust'], ['holidays', 'Holiday Calendar', 'holiday.manage'], ['policies', 'Policies & Acknowledgments', 'policy.publish'], ['requests', 'HR Requests', 'hr.request.read'], ['reports', 'HR Reports', 'hr.report.read']] },
  { id: 'manager', label: 'Manager Workspace', permission: 'manager.workspace', home: 3,
    description: 'Team operations and approvals within your reporting scope.',
    modules: [['team', 'Team Overview', 'team.read'], ['calendar', 'Team Calendar', 'team.read'], ['leave-approvals', 'Leave Approvals', 'leave.approve'], ['attendance-exceptions', 'Attendance Exceptions', 'attendance.review'], ['tasks', 'Team Tasks', 'task.assign_team'], ['reports', 'Team Reports', 'team.report.read']] },
  { id: 'support', label: 'Support Operations', permission: 'support.workspace', home: 4,
    description: 'Service requests and support operations for your assigned queues.',
    modules: [['queues', 'Queue Inbox', 'ticket.triage'], ['my-tickets', 'My Assigned Tickets', 'ticket.assigned'], ['escalations', 'SLAs & Escalations', 'ticket.escalate'], ['knowledge-base', 'Knowledge Base', 'knowledge.manage'], ['reports', 'Queue Analytics', 'queue.report.read']] },
];

export const ROUTES = [
  ...SHARED_ROUTES,
  ...WORKSPACES.flatMap((workspace) => [
    route(workspace.id, workspace.label, workspace.permission, { home: workspace.home, workspace: workspace.id }),
    ...workspace.modules.map(([id, label, permission]) => route(`${workspace.id}/${id}`, label, permission, {
      workspace: workspace.id, hidden: true, available: workspace.id === 'admin' && ['accounts', 'roles', 'audit'].includes(id),
      permissions: [workspace.permission, permission],
    })),
  ]),
];
export const NAV_ITEMS = ROUTES.filter((item) => !item.hidden);
export const HIDDEN_ROUTES = ROUTES.filter((item) => item.hidden);
