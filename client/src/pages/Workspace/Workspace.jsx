import { useAuth } from '../../hooks/auth.hooks.jsx';
import { ROUTES, WORKSPACES } from '../../data/nav.js';
import { permittedItems } from '../../utils/access.js';
import './Workspace.css';

export function Workspace({ workspaceId }) {
  const { permissions } = useAuth();
  const workspace = WORKSPACES.find(item => item.id === workspaceId);
  const modules = permittedItems(ROUTES, permissions).filter(item => item.workspace === workspaceId && !item.home);
  return <section className="nx-workspace">
    <header><h1 className="nx-h1">{workspace.label}</h1><p>{workspace.description}</p></header>
    <div className="nx-card nx-workspace__panel">
      <h2 className="nx-h2">Workspace tools</h2>
      <ul className="nx-workspace__modules">{modules.map(item => <li key={item.id}>
        {item.available ? <a href={item.route}>{item.label}<span>Open →</span></a> :
          <div><span>{item.label}</span><span className="nx-workspace__status">Not yet available</span></div>}
      </li>)}</ul>
      {!modules.length && <p>No tools have been assigned to this workspace.</p>}
    </div>
    {permissions.includes('dashboard.read') && <a href="#/my-dashboard">My employee dashboard</a>}
  </section>;
}
