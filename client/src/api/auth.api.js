import { supabase } from '../lib/supabaseClient.js';

export const loginUser = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};
export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/** The same database resolver supplies browser and Express permissions. */
export const getAccessContext = async () => {
  const { data, error } = await supabase.rpc('get_access_context').abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId, updates) => {
  const fields = ['first_name', 'last_name', 'avatar_url'];
  if (!updates || Object.keys(updates).some((key) => !fields.includes(key))) {
    throw new Error('Only personal profile fields can be updated here.');
  }
  const { data, error } = await supabase.from('profiles').update(updates)
    .eq('id', userId).select('id,email,first_name,last_name,avatar_url').single();
  if (error) throw error;
  return data;
};

export const getRoleAdministration = async () => {
  const { data, error } = await supabase.rpc('get_role_administration');
  if (error) throw error;
  return data;
};
export const setUserRoles = async (userId, roleIds, reason) => {
  const { error } = await supabase.rpc('set_user_roles', {
    target_user: userId, assigned_roles: roleIds, grant_reason: reason,
  });
  if (error) throw error;
};
export const getAccessAudit = async () => {
  const { data, error } = await supabase.rpc('get_access_audit');
  if (error) throw error;
  return data;
};
