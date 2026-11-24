/** Synchronize Auth bans after the transaction has already revoked application access. */
export async function syncIdentityAccounts(supabase) {
  const { data: jobs, error } = await supabase.from('identity_sync_jobs').select('user_id,revision').order('requested_at').limit(100);
  if (error) throw new Error('Identity sync queue unavailable');
  let completed = 0;
  for (const job of jobs) {
    const { data: staff, error: staffError } = await supabase.from('employees').select('account_status').eq('auth_user_id', job.user_id).single();
    if (staffError || !staff) continue;
    const { error: authError } = await supabase.auth.admin.updateUserById(job.user_id, {
      ban_duration: staff.account_status === 'active' ? 'none' : '876000h',
    });
    if (authError) continue;
    // A newer transition must remain queued even if Auth completed an older update.
    const { error: deleteError } = await supabase.from('identity_sync_jobs').delete().eq('user_id', job.user_id).eq('revision', job.revision);
    if (!deleteError) completed++;
  }
  return { attempted: jobs.length, completed };
}
