// src/hooks/auth.hooks.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabase/supabaseClient.js";
import {
  loginUser,
  logoutUser,
  getUserProfile,
  registerUser,
} from "../api/auth.api.js";
import { normalizeRole } from "../utils/authPermissions.js";

/**
 * useAuth - custom React hook to manage Supabase authentication.
 * Provides signIn, signUp, signOut, loading state, and current user profile.
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
      setRole(normalizeRole(data?.role || data?.role_id || data?.role_name));
    } catch (error) {
      console.warn("Unable to load profile:", error?.message || error);
      setProfile(null);
      setRole("employee");
    }
  }, []);

  useEffect(() => {
    const handleSession = async (currentSession) => {
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await loadProfile(currentUser.id);
      } else {
        setProfile(null);
        setRole("employee");
      }
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        await handleSession(currentSession);
      },
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    try {
      return await loginUser({ email, password });
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email, password, profileData = {}) => {
    setLoading(true);
    try {
      return await registerUser({ email, password, profileData });
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    profile,
    role,
    isAdmin: role === "admin",
    isManager: role === "manager",
    loading,
    signIn,
    signUp,
    signOut,
  };
};
