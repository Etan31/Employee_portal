import { useState } from 'react';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { WORKSPACES } from '../../data/nav.js';
import { authorizedWorkspace } from '../../utils/access.js';
import { Workspace } from './Workspace.jsx';
import { ProtectedRoute } from '../../components/ProtectedRoute/ProtectedRoute.jsx';
import './Workspace.css';

/** One dashboard URL; the authenticated grants determine the rendered workspace. */
export function DashboardHome({ employeeDashboard }) {
  const { permissions } = useAuth();
  const [preferred, setPreferred] = useState(() => sessionStorage.getItem('nx:workspace'));
  const available = WORKSPACES.filter(workspace => permissions.includes(workspace.permission));
  const workspace = authorizedWorkspace(WORKSPACES, permissions, preferred);
  const canViewEmployee = permissions.includes('dashboard.read');
  const selected = workspace?.id || 'employee';

  const select = event => {
    const id = event.target.value;
    setPreferred(id);
    sessionStorage.setItem('nx:workspace', id);
  };

  return <>
    {available.length + Number(canViewEmployee) > 1 && <label className="nx-workspace-switcher">
      Workspace
      <select aria-label="Workspace" value={selected} onChange={select}>
        {available.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        {canViewEmployee && <option value="employee">My employee dashboard</option>}
      </select>
    </label>}
    {workspace ? <ProtectedRoute requiredPermissions={[workspace.permission]}>
      <Workspace key={workspace.id} workspaceId={workspace.id} />
    </ProtectedRoute> : <ProtectedRoute requiredPermissions={['dashboard.read']}>{employeeDashboard}</ProtectedRoute>}
  </>;
}
