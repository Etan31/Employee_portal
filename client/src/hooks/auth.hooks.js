// src/hooks/auth.hooks.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase/supabaseClient';

/**
 * useAuth - custom React hook to manage Supabase authentication.
 * Provides signIn, signUp, signOut, loading state, and current user session.
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync session changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );
    // Retrieve initial session
    const currentSession = supabase.auth.getSession();
    currentSession.then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('SignIn error:', error.message);
      setLoading(false);
      throw error;
    }
    // session/user will be updated via onAuthStateChange
    setLoading(false);
    return data;
  }, []);

  const signUp = useCallback(async (email, password, firstName = null, lastName = null, roleId = null) => {
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('SignUp error:', error.message);
      setLoading(false);
      throw error;
    }
    // After successful signup, insert profile record (if attributes provided)
    if (firstName || lastName || roleId) {
      const profile = {
        id: data.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role_id: roleId
      };
      const { error: profileErr } = await supabase.from('profiles').upsert(profile);
      if (profileErr) {
        console.warn('Profile creation error (non‑critical):', profileErr.message);
      }
    }
    setLoading(false);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('SignOut error:', error.message);
      setLoading(false);
      throw error;
    }
    // auth listener will clear user/session
    setLoading(false);
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };
};