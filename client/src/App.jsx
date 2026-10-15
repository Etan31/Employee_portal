import { lazy, Suspense, useEffect } from "react";
import { useNavigation } from "./hooks/useNavigation.js";
import { NAV_ITEMS, ROUTES } from "./data/nav.js";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout.jsx";
import { Login } from "./pages/Login/Login.jsx";
import { NotFound } from "./pages/ErrorPage/ErrorPage.jsx";
import { useAuth } from "./hooks/auth.hooks.jsx";
import { canAccess, permittedItems } from './utils/access.js';
import { ProtectedRoute } from './components/ProtectedRoute/ProtectedRoute.jsx';
import { DashboardHome } from './pages/Workspace/DashboardHome.jsx';
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
  'my-dashboard': Dashboard,
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
  return active === 'login'
    ? <ProtectedRoute publicOnly><Login /></ProtectedRoute>
    : <ProtectedRoute><ProtectedApplication active={active} /></ProtectedRoute>;
}

function ProtectedApplication({ active }) {
  const { user, permissions } = useAuth();
  const permittedNav = permittedItems(NAV_ITEMS, permissions);
  const requestedItem = ROUTES.find(item => item.route === `#/${active}`);
  const isPermitted = canAccess(requestedItem, permissions);
  useEffect(() => {
    if (requestedItem && isPermitted) sessionStorage.setItem(LAST_ROUTE_KEY, active);
  }, [active, requestedItem, isPermitted]);

  return <AppDataProvider key={user.id}>
    <DashboardLayout activeRoute={active} navItems={permittedNav}>
      {requestedItem ? <ProtectedRoute route={requestedItem}>
        <RouteContent item={requestedItem} />
      </ProtectedRoute> : <NotFound />}
    </DashboardLayout>
  </AppDataProvider>;
}

function RouteContent({ item }) {
  let content;
  if (item.id === 'dashboard') content = <DashboardHome employeeDashboard={<Dashboard />} />;
  else if (item.id === 'admin/roles' || item.id === 'admin/accounts') content = <RoleAdministration key={item.id} readOnly={item.id === 'admin/accounts'} />;
  else if (item.id === 'admin/audit') content = <AccessAudit />;
  else {
    const PageComponent = PAGE_COMPONENTS[item.id];
    content = PageComponent ? <PageComponent key={item.id} /> : <PageStub key={item.id} title={item.label} />;
  }
  return <Suspense fallback={<div className="nx-page-loading"><div className="nx-page-loading__spinner" /></div>}>{content}</Suspense>;
}
