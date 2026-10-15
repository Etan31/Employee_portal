import { useEffect } from 'react';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { useNavigation } from '../../hooks/useNavigation.js';
import { ROUTES } from '../../data/nav.js';
import { homeRoute, loginDestination, isRouteAuthorized } from '../../utils/access.js';
import { AuthError, ErrorPage } from '../../pages/ErrorPage/ErrorPage.jsx';

/** Guard authentication and optional role/capability policies before mounting children. */
export function ProtectedRoute({ children, route, requiredRoles = [], requiredPermissions = [], publicOnly = false }) {
  const { user, roles, permissions, loading, accessError, signOut, refreshProfile } = useAuth();
  const { active } = useNavigation();
  const home = homeRoute(ROUTES, permissions);

  useEffect(() => {
    if (loading || accessError) return;
    if (!user && !publicOnly) {
      if (ROUTES.some(item => item.route === `#/${active}`)) sessionStorage.setItem('nx:returnTo', active);
      window.location.replace('#/login');
    } else if (user && publicOnly && home) {
      const destination = loginDestination(ROUTES, permissions, sessionStorage.getItem('nx:returnTo'));
      sessionStorage.removeItem('nx:returnTo');
      window.location.replace(destination);
    }
  }, [active, user, publicOnly, loading, accessError, home, permissions]);

  if (loading) return <div className="nx-loading-screen" role="status">
    <span className="nx-loading-brand">Nexus</span><div className="nx-loading-spinner" />
    <p className="nx-loading-text">Signing you in…</p>
  </div>;
  if (accessError || (user && !home)) return <ErrorPage code={accessError || 403} standalone
    detail={accessError === 503 ? 'Access could not be verified. Please retry.' : 'Your account needs active role permissions. Contact your administrator.'}
    primaryAction={{ label: 'Retry', onClick: refreshProfile }}
    secondaryAction={{ label: 'Sign out', onClick: () => signOut().catch(() => window.location.reload()) }} />;
  if (publicOnly) return user ? null : children;
  if (!user) return <AuthError code={401} />;
  if (!isRouteAuthorized({ route, requiredRoles, requiredPermissions }, { roles, permissions })) return <AuthError code={403} />;
  return children;
}
