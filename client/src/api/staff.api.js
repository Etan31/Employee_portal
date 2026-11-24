import { supabase } from '../lib/supabaseClient.js';

export async function staffRpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args).abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  return data;
}
export async function getDirectory(teamOnly = false) {
  const rows = await staffRpc('staff_directory', { team_only: teamOnly });
  return rows.map(row => ({ ...row, key: row.id, name: `${row.first_name} ${row.last_name}`.trim() || row.work_email,
    position: row.job_title || 'Job title not set', unit: row.department || 'Department not set', email: row.work_email,
    hasReports: rows.some(other => other.manager_id === row.id) }));
}
export async function sendInvitation(staffId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in again to send an invitation.');
  const response = await fetch(`/api/protected/invitations/${encodeURIComponent(staffId)}/send`, {
    method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Invitation delivery failed.');
  return body;
}
