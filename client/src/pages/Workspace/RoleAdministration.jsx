import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { getRoleAdministration, setUserRoles, getAccessAudit } from '../../api/auth.api.js';
import './Workspace.css';

export function RoleAdministration({ readOnly = false }) {
  const { permissions, refreshProfile } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [roles, setRoles] = useState([]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const editable = !readOnly && permissions.includes('role.assign');
  useEffect(() => {
    let active = true;
    getRoleAdministration().then(value => { if (active) { setData(value); setError(''); } })
      .catch(() => { if (active) setError('Account access could not be loaded.'); });
    return () => { active = false; };
  }, [attempt]);
  const choose = (account) => {
    setSelected(account.id); setRoles(account.role_ids); setReason(''); setNotice(''); setError('');
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      await setUserRoles(selected, roles, reason.trim());
      setNotice('Role assignments saved.');
      setSelected(''); setReason('');
      await refreshProfile();
      setAttempt(value => value + 1);
    } catch (err) {
      setError(err.code === '22023' ? err.message : 'Roles could not be saved. Refresh access and try again.');
    } finally { setSaving(false); }
  };
  return <section className="nx-workspace">
    <header><a href="#/admin">System Administration</a><h1 className="nx-h1">{readOnly ? 'Accounts' : 'Roles & Permissions'}</h1>
      <p>{readOnly ? 'Account status and assigned roles.' : 'Assign one or more roles. Each change requires a reason and is recorded in the security audit.'}</p></header>
    {error && <div role="alert"><p>{error}</p><button className="nx-workspace__button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div>}
    {notice && <p role="status">{notice}</p>}
    {!data && !error && <p role="status">Loading account access…</p>}
    {data && <div className="nx-card nx-workspace__panel">
      <div className="nx-workspace__table-wrap"><table><caption>Staff account access</caption><thead><tr><th>Account</th><th>Status</th><th>Roles</th>{editable && <th>Action</th>}</tr></thead>
        <tbody>{data.accounts.map(account => <tr key={account.id}><td>{account.email}</td><td>{account.is_active ? 'Active' : 'Inactive'}</td>
          <td>{data.roles.filter(role => account.role_ids.includes(role.id)).map(role => role.name).join(', ') || 'Unassigned'}</td>
          {editable && <td><button className="nx-workspace__button" disabled={saving} onClick={() => choose(account)} aria-label={`Edit roles for ${account.email}`}>Edit roles</button></td>}
        </tr>)}</tbody></table></div>
      {editable && selected && <form className="nx-workspace__form" onSubmit={save}>
        <fieldset disabled={saving}><legend>Roles for {data.accounts.find(account => account.id === selected)?.email}</legend>
          {data.roles.map(role => <label key={role.id} className="nx-workspace__check"><input type="checkbox" checked={roles.includes(role.id)}
            onChange={event => setRoles(previous => event.target.checked ? [...previous, role.id] : previous.filter(id => id !== role.id))} />{role.name}</label>)}
        </fieldset>
        {!roles.length && <p>Removing every role will block this account from accessing the portal.</p>}
        <label>Reason for change<textarea required minLength={3} maxLength={500} value={reason} disabled={saving} onChange={event => setReason(event.target.value)} /></label>
        <div className="nx-workspace__actions"><button className="nx-workspace__button nx-workspace__button--primary" disabled={saving || reason.trim().length < 3}>{saving ? 'Saving…' : 'Save role assignments'}</button>
          <button type="button" className="nx-workspace__button" disabled={saving} onClick={() => setSelected('')}>Cancel</button></div>
      </form>}
    </div>}
    {!readOnly && data && <details className="nx-card nx-workspace__panel"><summary>Permissions by role</summary>
      {data.roles.map(role => <div key={role.id}><h2 className="nx-h2">{role.name}</h2><p>{role.permissions.join(', ') || 'No permissions assigned'}</p></div>)}</details>}
  </section>;
}

export function AccessAudit() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getAccessAudit().then(data => { if (active) { setRows(data); setError(''); } }).catch(() => { if (active) setError('Audit records could not be loaded.'); });
    return () => { active = false; };
  }, [attempt]);
  return <section className="nx-workspace"><header><a href="#/admin">System Administration</a><h1 className="nx-h1">Security Audit</h1><p>The latest 100 role-assignment changes.</p></header>
    {error && <div role="alert">{error} <button className="nx-workspace__button" onClick={() => setAttempt(value => value + 1)}>Retry</button></div>}
    {!rows && !error && <p role="status">Loading audit records…</p>}
    {rows && <div className="nx-card nx-workspace__panel">{rows.length ? <ol className="nx-workspace__audit">{rows.map(row => <li key={row.id}>
      <time dateTime={row.occurred_at}>{new Date(row.occurred_at).toLocaleString()}</time><p>{row.reason}</p>
      <small>Account: {row.target_user_id}<br />Changed by: {row.actor_id}<br />Roles: {row.old_roles.join(', ') || 'None'} → {row.new_roles.join(', ') || 'None'}</small>
    </li>)}</ol> : <p>No role changes have been recorded yet.</p>}</div>}
  </section>;
}
