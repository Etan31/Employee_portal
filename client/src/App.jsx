import { useEffect } from "react";
import { useNavigation } from "./hooks/useNavigation.js";
import { NAV_ITEMS } from "./data/nav.js";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout.jsx";
import { Dashboard } from "./pages/Dashboard/Dashboard.jsx";
import { TaskBox } from "./pages/TaskBox/TaskBox.jsx";
import { Profile } from "./pages/Profile/Profile.jsx";
import { PageStub } from "./pages/PageStub/PageStub.jsx";
import { TimeManagement } from "./pages/TimeManagement/TimeManagement.jsx";
import Organization from "./pages/Organization/Organization.jsx";
import { Calendar } from "./pages/Calendar/Calendar.jsx";
import { Login } from "./pages/Login/Login.jsx";
import { NotFound, AuthError } from "./pages/ErrorPage/ErrorPage.jsx";
import { useAuth } from "./hooks/auth.hooks.jsx";
import { filterNavItemsByRole } from "./utils/authPermissions.js";

import "./styles/global.css";

const LAST_ROUTE_KEY = "nx:lastValidRoute";

export default function App() {
  const { active } = useNavigation();
  const { user, loading, role } = useAuth();

  // Look up against the full nav list (not the role-filtered one) so a restricted-but-known
  // route can be told apart from a route that doesn't exist at all.
  const permittedNav = filterNavItemsByRole(NAV_ITEMS, role);
  const requestedItem = NAV_ITEMS.find((item) => item.id === active);
  const isPermitted = permittedNav.some((item) => item.id === active);

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

  if (!requestedItem) {
    return (
      <DashboardLayout activeRoute={active} navItems={permittedNav}>
        <NotFound />
      </DashboardLayout>
    );
  }

  if (!isPermitted) {
    return (
      <DashboardLayout activeRoute={active} navItems={permittedNav}>
        <AuthError code={403} />
      </DashboardLayout>
    );
  }

  let PageComponent;
  if (active === "dashboard") {
    PageComponent = <Dashboard key={active} />;
  } else if (active === "task-box") {
    PageComponent = <TaskBox key={active} />;
  } else if (active === "profile") {
    PageComponent = <Profile key={active} />;
  } else if (active === "time-management") {
    PageComponent = <TimeManagement key={active} />;
  } else if (active === "org-view") {
    PageComponent = <Organization key={active} />;
  } else if (active === "calendar") {
    PageComponent = <Calendar key={active} />;
  } else {
    PageComponent = <PageStub key={active} title={requestedItem.label} />;
  }

  return (
    <DashboardLayout activeRoute={active} navItems={permittedNav}>
      {PageComponent}
    </DashboardLayout>
  );
}
