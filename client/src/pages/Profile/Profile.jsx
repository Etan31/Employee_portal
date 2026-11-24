import { useState } from 'react';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { staffRpc } from '../../api/staff.api.js';
import { updateUserProfile } from '../../api/auth.api.js';
import './Profile.css';
import '../Workspace/Workspace.css';

export function Profile() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const { data: staff, loading, error } = useAsyncData(() => staffRpc('my_staff_record'));
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(profile?.first_name || '');
  const [last, setLast] = useState(profile?.last_name || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await updateUserProfile(user.id, { first_name: first.trim(), last_name: last.trim() });
      await refreshProfile(); setEditing(false); setMessage('Display name updated. Employment records are maintained by HR.');
    } catch { setMessage('Your profile could not be saved. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="ph-page nx-workspace">
    <header className="ph-hero"><div className="ph-hero-banner" /><div className="ph-hero-body">
      <div className="ph-avatar" aria-hidden="true">{`${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}` || 'N'}</div>
      <div className="ph-identity"><h1 className="ph-name">{`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email}</h1>
        <p>{staff?.job_title || 'Job title not set'} · {staff?.department || 'Department not set'}</p><p>{user.email}</p></div>
      <button className="nx-workspace__button" onClick={() => setEditing(value => !value)}>Edit display name</button>
    </div></header>
    {message && <p role="status">{message}</p>}
    {editing && <form className="nx-workspace__form" onSubmit={save}>
      <label>First name<input required maxLength={100} value={first} onChange={event => setFirst(event.target.value)} /></label>
      <label>Last name<input required maxLength={100} value={last} onChange={event => setLast(event.target.value)} /></label>
      <button className="nx-workspace__button nx-workspace__button--primary" disabled={busy}>{busy ? 'Saving…' : 'Save display name'}</button>
    </form>}
    {loading && <p role="status">Loading employment details…</p>}
    {error && <p role="alert">Employment details could not be loaded. Refresh to retry.</p>}
    {staff && <section><h2 className="nx-h2">Employment details</h2><p>Contact HR to correct your employment or reporting information.</p>
      <dl className="ph-data-grid">{Object.entries({ 'Staff number': staff.employee_no, Company: staff.company, Department: staff.department,
        'Job title': staff.job_title, 'Reporting manager': staff.manager_name, 'Start date': staff.hire_date,
        Status: staff.employment_status, 'Company timezone': staff.timezone }).map(([label,value]) => <div className="ph-data-item" key={label}><dt className="ph-data-label">{label}</dt><dd className="ph-data-value">{value || 'Not set'}</dd></div>)}</dl>
    </section>}
    <section><h2 className="nx-h2">Portal roles</h2><p>{roles.map(role => role.name).join(', ')}</p></section>
  </section>;
}
