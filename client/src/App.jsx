import React, { useEffect } from "react";
import { useNavigation } from "./hooks/useNavigation.js";
import { NAV_ITEMS } from "./data/nav.js";
import { DashboardLayout } from "./layouts/DashboardLayout/DashboardLayout.jsx";
import { Dashboard } from "./pages/Dashboard/Dashboard.jsx";
import { TaskBox } from "./pages/TaskBox/TaskBox.jsx";
import { Profile } from "./pages/Profile/Profile.jsx";
import { PageStub } from "./pages/PageStub/PageStub.jsx";
import { Login } from "./pages/Login/Login.jsx";
import { useAuth } from "./hooks/auth.hooks.js";
import { filterNavItemsByRole } from "./utils/authPermissions.js";

import "./styles/global.css";

export default function App() {
  const { active } = useNavigation();
  const { user, loading, role } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user && active !== "login") {
        window.location.hash = "#/login";
      }
      if (user && active === "login") {
        window.location.hash = "#/dashboard";
      }
    }
  }, [active, loading, user]);

  if (loading) {
    return <div className="nx-loading-screen">Loading authentication...</div>;
  }

  if (!user) {
    return active === "login" ? <Login /> : null;
  }

  const permittedNav = filterNavItemsByRole(NAV_ITEMS, role);
  const activeItem = permittedNav.find((item) => item.id === active) ||
    permittedNav[0] || { label: "Page" };

  let PageComponent;
  if (active === "dashboard") {
    PageComponent = <Dashboard />;
  } else if (active === "task-box") {
    PageComponent = <TaskBox />;
  } else if (active === "profile") {
    PageComponent = <Profile />;
  } else {
    PageComponent = <PageStub title={activeItem.label} />;
  }

  return (
    <DashboardLayout activeRoute={active} navItems={permittedNav}>
      {PageComponent}
    </DashboardLayout>
  );
}
