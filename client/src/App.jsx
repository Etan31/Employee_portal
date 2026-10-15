import { lazy, Suspense, useEffect } from "react";
import { useNavigation } from "./hooks/useNavigation.js";
import { NAV_ITEMS, ROUTES } from "./data/nav.js";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout.jsx";
import { Login } from "./pages/Login/Login.jsx";
import { NotFound, AuthError, ErrorPage } from "./pages/ErrorPage/ErrorPage.jsx";
import { useAuth } from "./hooks/auth.hooks.jsx";
import { canAccess, permittedItems, homeRoute, loginDestination } from './utils/access.js';
import { Workspace } from './pages/Workspace/Workspace.jsx';
import { RoleAdministration, AccessAudit } from './pages/Workspace/RoleAdministration.jsx';
import { AppDataProvider } from './hooks/appData.hooks.jsx';

import "./styles/global.css";

// Pages are lazy so each route ships as its own chunk. Login + ErrorPage stay
// eager: auth/error paths must not depend on a chunk fetch succeeding.
const Dashboard = lazy(() =>
  import("./pages/Dashboard/Dashboard.jsx").then((m) => ({
    default: m.Dashboard,
  })),
);
const TaskBox = lazy(() =>
  import("./pages/TaskBox/TaskBox.jsx").then((m) => ({ default: m.TaskBox })),
);
const Profile = lazy(() =>
  import("./pages/Profile/Profile.jsx").then((m) => ({ default: m.Profile })),
);
const TimeManagement = lazy(() =>
  import("./pages/TimeManagement/TimeManagement.jsx").then((m) => ({
    default: m.TimeManagement,
  })),
);
const Organization = lazy(
  () => import("./pages/Organization/Organization.jsx"),
);
const Calendar = lazy(() =>
  import("./pages/Calendar/Calendar.jsx").then((m) => ({
    default: m.Calendar,
  })),
);
const Employees = lazy(() =>
  import("./pages/Employees/Employees.jsx").then((m) => ({
    default: m.Employees,
  })),
);
const HRPolicies = lazy(() =>
  import("./pages/HRPolicies/HRPolicies.jsx").then((m) => ({
    default: m.HRPolicies,
  })),
);
const Helpdesk = lazy(() =>
  import("./pages/Helpdesk/Helpdesk.jsx").then((m) => ({
    default: m.Helpdesk,
  })),
);
const Settings = lazy(() =>
  import("./pages/Settings/Settings.jsx").then((m) => ({
    default: m.Settings,
  })),
);
const PageStub = lazy(() =>
  import("./pages/PageStub/PageStub.jsx").then((m) => ({
    default: m.PageStub,
  })),
);

const LAST_ROUTE_KEY = "nx:lastValidRoute";

const PAGE_COMPONENTS = {
  dashboard: Dashboard,
  "task-box": TaskBox,
  profile: Profile,
  "time-management": TimeManagement,
  "org-view": Organization,
  calendar: Calendar,
  employees: Employees,
  "hr-policies": HRPolicies,
  helpdesk: Helpdesk,
  settings: Settings,
};

export default function App() {
  const { active } = useNavigation();
  const { user, loading, permissions, accessError, signOut, refreshProfile } = useAuth();

  const permittedNav = permittedItems(NAV_ITEMS, permissions);
  const requestedItem = ROUTES.find((item) => item.id === active);
  const isPermitted = canAccess(requestedItem, permissions);
  const home = homeRoute(ROUTES, permissions, sessionStorage.getItem('nx:workspace'));

  useEffect(() => {
    if (!loading && !accessError && !user && active !== "login") {
      if (ROUTES.some(item => item.id === active)) sessionStorage.setItem('nx:returnTo', active);
      window.location.hash = "#/login";
    }
  }, [active, loading, user, accessError]);

  useEffect(() => {
    if (!loading && !accessError && user && active === "login") {
      const destination = loginDestination(ROUTES, permissions, sessionStorage.getItem('nx:returnTo'), sessionStorage.getItem('nx:workspace'));
      sessionStorage.removeItem('nx:returnTo');
      if (destination) window.location.hash = destination;
    }
  }, [active, loading, user, accessError, permissions]);

  // Remember the last route that actually rendered, so error pages can offer
  // "go back to where you were" even after a hard reload on a broken hash.
  useEffect(() => {
    if (!loading && !accessError && user && requestedItem && isPermitted) {
      sessionStorage.setItem(LAST_ROUTE_KEY, active);
      if (requestedItem.home) sessionStorage.setItem('nx:workspace', active);
    }
  }, [active, user, requestedItem, isPermitted, loading, accessError]);

  if (loading) {
    return (
      <div className="nx-loading-screen">
        <span className="nx-loading-brand">Nexus</span>
        <div className="nx-loading-spinner" />
        <p className="nx-loading-text">Signing you in…</p>
      </div>
    );
  }

  if (accessError || (user && !home)) {
    return <ErrorPage code={accessError || 403} standalone
      detail={accessError === 503 ? 'Access could not be verified. Please retry.' : 'Your account needs active role permissions. Contact your administrator.'}
      primaryAction={{ label: 'Retry', onClick: refreshProfile }}
      secondaryAction={{ label: 'Sign out', onClick: () => signOut().catch(() => window.location.reload()) }} />;
  }

  if (!user) {
    return active === "login" ? <Login /> : <AuthError code={401} />;
  }

  if (active === "login") {
    // Wait for the centralized permission-aware login destination.
    return null;
  }

  let pageContent;
  if (!requestedItem) {
    pageContent = <NotFound />;
  } else if (!isPermitted) {
    pageContent = <AuthError code={403} />;
  } else if (requestedItem.home && requestedItem.workspace) {
    pageContent = <Workspace workspaceId={requestedItem.workspace} />;
  } else if (active === 'admin/roles' || active === 'admin/accounts') {
    pageContent = <RoleAdministration key={active} readOnly={active === 'admin/accounts'} />;
  } else if (active === 'admin/audit') {
    pageContent = <AccessAudit />;
  } else {
    const PageComponent = PAGE_COMPONENTS[active];
    pageContent = (
      <Suspense
        fallback={
          <div className="nx-page-loading">
            <div className="nx-page-loading__spinner" />
          </div>
        }
      >
        {PageComponent ? (
          <PageComponent key={active} />
        ) : (
          <PageStub key={active} title={requestedItem.label} />
        )}
      </Suspense>
    );
  }

  return (
    <AppDataProvider key={user.id}><DashboardLayout activeRoute={active} navItems={permittedNav}>
      {pageContent}
    </DashboardLayout></AppDataProvider>
  );
}
