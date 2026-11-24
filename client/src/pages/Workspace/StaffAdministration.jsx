import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { staffRpc, sendInvitation } from '../../api/staff.api.js';
import './Workspace.css';

const blank = { employee_no: '', first_name: '', last_name: '', work_email: '', job_title: '', hire_date: '', department_id: '', manager_id: '' };
const statusLabel = value => ({ pending_onboarding: 'Awaiting onboarding', invited: 'Invited', active: 'Active', suspended: 'Suspended', deactivated: 'Deactivated', terminated: 'Terminated', requested: 'Requested', sending: 'Sending / retry pending', sent: 'Sent', accepted: 'Accepted', cancelled: 'Cancelled' })[value] || 'Not requested';
export function StaffAdministration({ accounts = false }) {
  const { permissions } = useAuth();
  const hr = !accounts && permissions.includes('employee.update_employment');
  const [data, setData] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(undefined);
  const [fields, setFields] = useState(blank);
  const [reason, setReason] = useState('');
  const [department, setDepartment] = useState('');
  const [transition, setTransition] = useState(null);
  useEffect(() => {
    let current = true;
    staffRpc('staff_administration').then(value => { if (current) { setData(value); setError(''); } })
      .catch(() => { if (current) setError('Staff records could not be loaded. Check your access and retry.'); });
    return () => { current = false; };
  }, [attempt]);
  async function run(action, message) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await action(); setNotice(result?.reconciled ? 'The previously invited identity is now linked. Ask the staff member to use their invitation email.' : message); setAttempt(value => value + 1); setEditing(undefined); setTransition(null); setReason('');
    } catch (err) { setError(err.code === '23505' ? 'That staff number, email or department already exists.' : err.message || 'The change could not be saved. Retry.'); }
    finally { setBusy(false); }
  }
  function edit(row) {
    setEditing(row?.id ?? null); setFields(row ? Object.fromEntries(Object.keys(blank).map(key => [key, row[key] || ''])) : blank);
    setReason(''); setTransition(null);
  }
  return <section className="nx-workspace"><header><h1 className="nx-h1">{accounts ? 'Invitations & Accounts' : 'Employee Lifecycle'}</h1>
    <p>{accounts ? 'Send requested invitations and manage account eligibility. Elevated roles are assigned in Roles & Permissions.' : 'Create staff records, maintain reporting relationships, then request account provisioning.'}</p></header>
    {error && <div role="alert">{error} <button className="nx-workspace__button" onClick={() => setAttempt(value => value + 1)}>Retry loading</button></div>}
    {notice && <p role="status">{notice}</p>}
    {!data && !error && <p role="status">Loading staff records…</p>}
    {hr && <div className="nx-workspace__actions"><button className="nx-workspace__button nx-workspace__button--primary" disabled={busy} onClick={() => edit(null)}>Add staff member</button></div>}
    {hr && <details><summary>Departments</summary><form className="nx-workspace__form" onSubmit={event => { event.preventDefault(); void run(async () => {
      await staffRpc('create_department', { department_name: department.trim() }); setDepartment('');
    }, 'Department created.'); }}><label>Department name<input required maxLength={100} value={department} onChange={event => setDepartment(event.target.value)} /></label>
      <button className="nx-workspace__button" disabled={busy || !department.trim()}>Create department</button></form></details>}
    {hr && editing !== undefined && <form className="nx-workspace__form" onSubmit={event => { event.preventDefault(); void run(() => staffRpc('save_staff_record', {
      record_id: editing, fields, change_reason: reason.trim(),
    }), 'Staff record saved.'); }}><h2 className="nx-h2">{editing ? 'Edit staff record' : 'New staff record'}</h2>
      <fieldset disabled={busy}><legend>Employment details</legend>
        {Object.entries({ employee_no: 'Staff number', first_name: 'First name', last_name: 'Last name', work_email: 'Work email', job_title: 'Job title', hire_date: 'Start date' }).map(([key, label]) =>
          <label key={key}>{label}<input required maxLength={150} type={key === 'hire_date' ? 'date' : key === 'work_email' ? 'email' : 'text'} readOnly={key === 'work_email' && Boolean(editing)}
            value={fields[key]} onChange={event => setFields(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}
        <label>Department<select aria-label="Department" required value={fields.department_id} onChange={event => setFields(previous => ({ ...previous, department_id: event.target.value }))}>
          <option value="">Choose department</option>{data?.departments.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label>Reporting manager<select aria-label="Reporting manager" value={fields.manager_id} onChange={event => setFields(previous => ({ ...previous, manager_id: event.target.value }))}>
          <option value="">No assigned manager</option>{data?.employees.filter(row => row.id !== editing && row.employment_status === 'active').map(row => <option key={row.id} value={row.id}>{row.first_name} {row.last_name} ({row.work_email})</option>)}</select></label>
      </fieldset><label>Reason<textarea required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <div className="nx-workspace__actions"><button className="nx-workspace__button nx-workspace__button--primary" disabled={busy}>Save staff record</button><button type="button" className="nx-workspace__button" onClick={() => setEditing(undefined)}>Cancel</button></div></form>}
    {data && <div className="nx-workspace__table-wrap"><table><caption>{accounts ? 'Account provisioning' : 'Company staff'}</caption><thead><tr><th>Staff member</th><th>Status</th><th>Invitation</th><th>Actions</th></tr></thead>
      <tbody>{data.employees.map(row => <tr key={row.id}><td>{row.first_name} {row.last_name}<br />{row.work_email}</td><td>{statusLabel(row.employment_status || row.account_status)}</td><td>{statusLabel(row.invitation_state)}</td>
        <td><div className="nx-workspace__actions">{hr && <><button className="nx-workspace__button" disabled={busy} onClick={() => edit(row)}>Edit staff</button>
          {row.employment_status === 'pending_onboarding' && !row.invitation_state && <button className="nx-workspace__button" disabled={busy} onClick={() => run(() => staffRpc('request_staff_invitation', { staff_id: row.id }), 'Provisioning requested. A system administrator can now send the invitation.')}>Request account</button>}</>}
          {accounts && permissions.includes('account.invite') && ['requested', 'sending', 'sent'].includes(row.invitation_state) && <button className="nx-workspace__button" disabled={busy} onClick={() => run(() => sendInvitation(row.id), 'Invitation sent. Staff access remains blocked until verified onboarding is complete.')}>{row.invitation_state === 'sent' ? 'Resend invitation' : 'Send invitation'}</button>}
          {accounts && permissions.includes('account.deactivate') && row.account_status !== 'deactivated' && <>
            {row.account_status !== 'invited' && <button className="nx-workspace__button" disabled={busy} onClick={() => { setTransition({ row, status: row.account_status === 'suspended' ? 'active' : 'suspended' }); setReason(''); }}>{row.account_status === 'suspended' ? 'Restore access' : 'Suspend'}</button>}
            <button className="nx-workspace__button" disabled={busy} onClick={() => { setTransition({ row, status: 'deactivated' }); setReason(''); }}>Deactivate</button></>}
        </div></td></tr>)}</tbody></table>{!data.employees.length && <p>No staff records yet. HR can add the first staff member.</p>}</div>}
    {transition && <form className="nx-workspace__form" onSubmit={event => { event.preventDefault(); void run(() => staffRpc('set_staff_access', {
      staff_id: transition.row.id, new_status: transition.status, change_reason: reason.trim(),
    }), 'Account access updated.'); }}><h2 className="nx-h2">Set {transition.row.work_email} to {transition.status}</h2>
      <p>{transition.status === 'deactivated' ? 'This ends employment eligibility and revokes every role. Rehiring requires a reviewed provisioning workflow.' : 'The new status applies to current sessions immediately on their next protected request.'}</p>
      <label>Reason<textarea required minLength={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <div className="nx-workspace__actions"><button className="nx-workspace__button" disabled={busy}>Confirm access change</button><button type="button" className="nx-workspace__button" onClick={() => setTransition(null)}>Cancel</button></div></form>}
  </section>;
}
