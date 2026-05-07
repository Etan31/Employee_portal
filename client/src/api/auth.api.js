import { supabase } from "../../../supabase/supabaseClient.js";

export const loginUser = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    throw error;
  }
  return data;
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const registerUser = async ({ email, password, profileData = {} }) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    throw error;
  }

  if (data?.user && Object.keys(profileData).length > 0) {
    await supabase
      .from("profiles")
      .upsert({ id: data.user.id, email, ...profileData });
  }

  return data;
};
