/** Auth delivery is external to PostgreSQL; a leased attempt keeps retries fail-closed. */
export async function sendStaffInvitation(supabase, actor, staffId, redirectTo) {
  const { data: claim, error: claimError } = await supabase.rpc('claim_staff_invitation', { actor, staff_id: staffId });
  if (claimError) throw Object.assign(new Error('Invitation unavailable or already being sent.'), { status: 409 });
  let invitedUser = claim.recovery_user_id || null;
  try {
    if (!invitedUser) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(claim.email, { redirectTo });
      if (error || !data?.user?.id) throw new Error('Invitation delivery failed');
      invitedUser = data.user.id;
    }
  } catch {
    await supabase.rpc('finish_staff_invitation', { actor, staff_id: staffId, attempt: claim.attempt_id, invited_user: null });
    throw Object.assign(new Error('Invitation could not be delivered. Retry from Accounts.'), { status: 502 });
  }
  const { error } = await supabase.rpc('finish_staff_invitation', {
    actor, staff_id: staffId, attempt: claim.attempt_id, invited_user: invitedUser,
  });
  if (error) throw Object.assign(new Error('Email sent, but account linking needs reconciliation. Access remains blocked.'), { status: 409 });
  return { sent: !claim.recovery_user_id, reconciled: Boolean(claim.recovery_user_id) };
}
