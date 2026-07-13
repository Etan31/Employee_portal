import { lazy, Suspense, useEffect } from "react";
import { useNavigation } from "./hooks/useNavigation.js";
import { NAV_ITEMS, HIDDEN_ROUTES } from "./data/nav.js";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout.jsx";
import { Login } from "./pages/Login/Login.jsx";
import { NotFound, AuthError } from "./pages/ErrorPage/ErrorPage.jsx";
import { useAuth } from "./hooks/auth.hooks.jsx";
import { filterNavItemsByRole } from "./utils/authPermissions.js";

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
  const { user, loading, role } = useAuth();

  // Look up against the full route set (not the role-filtered one) so a
  // restricted-but-known route can be told apart from a route that doesn't exist.
  const permittedNav = filterNavItemsByRole(NAV_ITEMS, role);
  const requestedItem =
    NAV_ITEMS.find((item) => item.id === active) ||
    HIDDEN_ROUTES.find((item) => item.id === active);
  const isPermitted =
    permittedNav.some((item) => item.id === active) ||
    HIDDEN_ROUTES.some((item) => item.id === active);

  useEffect(() => {
    if (!loading && !user && active !== "login") {
      window.location.hash = "#/login";
    }
  }, [active, loading, user]);

  useEffect(() => {
    if (!loading && user && active === "login") {
      window.location.hash = "#/dashboard";
    }
  }, [active, loading, user]);

  // Remember the last route that actually rendered, so error pages can offer
  // "go back to where you were" even after a hard reload on a broken hash.
  useEffect(() => {
    if (user && requestedItem && isPermitted) {
      sessionStorage.setItem(LAST_ROUTE_KEY, active);
    }
  }, [active, user, requestedItem, isPermitted]);

  if (loading) {
    return (
      <div className="nx-loading-screen">
        <span className="nx-loading-brand">Nexus</span>
        <div className="nx-loading-spinner" />
        <p className="nx-loading-text">Signing you in…</p>
      </div>
    );
  }

  if (!user) {
    return active === "login" ? <Login /> : <AuthError code={401} />;
  }

  if (active === "login") {
    // Authenticated but the hash hasn't flipped to #/dashboard yet (see effect above).
    return null;
  }

  let pageContent;
  if (!requestedItem) {
    pageContent = <NotFound />;
  } else if (!isPermitted) {
    pageContent = <AuthError code={403} />;
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
    <DashboardLayout activeRoute={active} navItems={permittedNav}>
      {pageContent}
    </DashboardLayout>
  );
}
