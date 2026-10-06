import { supabase } from "../lib/supabaseClient.js";

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
    .select("*, roles(name)")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? { ...data, role: data.roles?.name || "employee" } : null;
};

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data;
};

export const registerUser = async ({ email, password, profileData = {} }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
      },
    },
  });
  if (error) {
    throw error;
  }

  return data;
};
