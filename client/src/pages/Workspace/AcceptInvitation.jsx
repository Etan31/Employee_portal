import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { staffRpc } from '../../api/staff.api.js';
import './Workspace.css';

export function AcceptInvitation() {
  const { user, loading, refreshProfile, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function accept(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      await staffRpc('accept_staff_invitation');
      await refreshProfile(); window.location.hash = '#/dashboard';
    } catch (err) { setError(err.message || 'Onboarding failed. Ask your administrator to check the invitation.'); }
    finally { setBusy(false); }
  }
  return <main className="nx-workspace nx-onboarding"><h1 className="nx-h1">Complete your account setup</h1>
    {loading ? <p role="status">Checking your session…</p> : !user ? <p>Open the invitation link in your work email to verify your identity. If it expired, ask your administrator for a new invitation. <a href="#/login">Back to sign in</a></p> : <>
      <p>Signed in as {user.email}. Set your password and confirm that this is your assigned work account.</p>
      {error && <p role="alert">{error}</p>}<form className="nx-workspace__form" onSubmit={accept}>
        <label>New password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label className="nx-workspace__check"><input type="checkbox" required checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I confirm that this is my work account.</label>
        <button className="nx-workspace__button nx-workspace__button--primary" disabled={busy || !confirmed}>{busy ? 'Completing setup…' : 'Complete account setup'}</button>
      </form><button className="nx-workspace__button" disabled={busy} onClick={() => signOut().catch(() => setError('Sign out failed. Please retry.'))}>Sign out</button></>}
  </main>;
}
