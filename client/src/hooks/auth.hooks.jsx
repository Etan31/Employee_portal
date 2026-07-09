// src/hooks/auth.hooks.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  loginUser,
  logoutUser,
  getUserProfile,
  registerUser,
} from "../api/auth.api.js";
import { normalizeRole } from "../utils/authPermissions.js";
import { logError } from "../utils/logger.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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
      logError("Critical: Unable to load profile:", error);
      setProfile(null);
      setRole("employee");
    }
  }, []);

  useEffect(() => {
    const handleSession = async (currentSession) => {
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // Load profile asynchronously without blocking loading state
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
        setRole("employee");
      }
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      handleSession(currentSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        handleSession(session);
      })
      .catch((error) => {
        logError("Supabase session initialization failed:", error);
        setLoading(false);
      });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  // Re-fetch the signed-in user's profile (e.g. after a profile edit).
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    try {
      return await loginUser({ email, password });
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email, password, profileData = {}) => {
    setLoading(true);
    try {
      return await registerUser({ email, password, profileData });
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await logoutUser();
    } catch (error) {
      logError("Logout failed:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin: role === "admin",
        isManager: role === "manager",
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
