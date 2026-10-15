import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { loginUser, logoutUser, getAccessContext } from '../api/auth.api.js';
import { logError } from '../utils/logger.js';
import { resolveAccessContext } from '../../../shared/authorization.js';

const AuthContext = createContext(null);
const emptyAccess = { profile: null, roles: [], permissions: [] };

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ user: null, ...emptyAccess, loading: true, accessError: null });
  const generation = useRef(0);
  const currentId = useRef(null);

  const resolveSession = useCallback(async (session, background = false) => {
    const revision = ++generation.current;
    const user = session?.user ?? null;
    const sameUser = currentId.current === user?.id;
    if (sessionStorage.getItem('nx:identity') !== (user?.id || null)) {
      sessionStorage.removeItem('nx:lastValidRoute');
      sessionStorage.removeItem('nx:workspace');
      if (user) sessionStorage.setItem('nx:identity', user.id);
      else sessionStorage.removeItem('nx:identity');
    }
    currentId.current = user?.id ?? null;
    if (!background || !sameUser) setState({ user, ...emptyAccess, loading: Boolean(user), accessError: null });
    if (!user) return;
    try {
      const access = await getAccessContext();
      if (revision !== generation.current) return;
      const resolved = resolveAccessContext(access, user.id);
      setState({ user, ...(resolved || emptyAccess), loading: false, accessError: resolved ? null : 403 });
    } catch (error) {
      if (revision !== generation.current) return;
      logError('Access resolution failed:', error);
      setState({ user, ...emptyAccess, loading: false, accessError: error.code === '42501' ? 403 : 503 });
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let eventReceived = false;
    // Do not await Supabase calls inside its auth event callback (auth lock).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      eventReceived = true;
      const eventRevision = ++generation.current;
      if (!disposed && currentId.current !== session?.user?.id) {
        setState({ user: session?.user ?? null, ...emptyAccess, loading: Boolean(session?.user), accessError: null });
      }
      // Leave the Supabase auth lock before requesting the access RPC.
      window.setTimeout(() => {
        if (!disposed && eventRevision === generation.current) void resolveSession(session, true);
      }, 0);
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (disposed || eventReceived) return;
      if (error) setState({ user: null, ...emptyAccess, loading: false, accessError: 503 });
      else void resolveSession(data.session);
    }).catch(() => {
      if (!disposed && !eventReceived) setState({ user: null, ...emptyAccess, loading: false, accessError: 503 });
    });
    const refresh = async () => {
      const revision = generation.current;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (disposed || revision !== generation.current) return;
        if (error) setState(previous => ({ ...previous, ...emptyAccess, loading: false, accessError: 503 }));
        else void resolveSession(data.session, true);
      } catch {
        if (!disposed && revision === generation.current) setState(previous => ({ ...previous, ...emptyAccess, loading: false, accessError: 503 }));
      }
    };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      disposed = true;
      // This is an async request generation counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      subscription.unsubscribe();
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [resolveSession]);

  const refreshProfile = useCallback(async () => {
    const revision = generation.current;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (revision !== generation.current) return;
      if (error) throw error;
      await resolveSession(data.session, true);
    } catch {
      if (revision === generation.current) setState(previous => ({ ...previous, ...emptyAccess, loading: false, accessError: 503 }));
    }
  }, [resolveSession]);
  const signIn = useCallback((email, password) => loginUser({ email, password }), []);
  const signOut = useCallback(async () => {
    await logoutUser();
    sessionStorage.removeItem('nx:returnTo');
    await resolveSession(null);
  }, [resolveSession]);
  const role = state.roles?.map((item) => item.name).join(', ') || 'No assigned role';

  return <AuthContext.Provider value={{ ...state, role, signIn, signOut, refreshProfile,
    isAdmin: state.permissions.includes('role.assign'), isManager: state.permissions.includes('manager.workspace'),
  }}>{children}</AuthContext.Provider>;
};

// Context and its hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
