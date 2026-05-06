import React from 'react';
import { useNavigation } from './hooks/useNavigation.js';
import { NAV_ITEMS } from './data/nav.js';
import { DashboardLayout } from './layouts/DashboardLayout/DashboardLayout.jsx';
import { Dashboard } from './pages/Dashboard/Dashboard.jsx';
import { TaskBox } from './pages/TaskBox/TaskBox.jsx';
import { Profile } from './pages/Profile/Profile.jsx';
import { PageStub } from './pages/PageStub/PageStub.jsx';
import { Login } from './pages/Login/Login.jsx';

import './styles/global.css';

export default function App() {
  const { active } = useNavigation();

  // If login route, don't wrap in DashboardLayout
  if (active === 'login') {
    return <Login />;
  }

  // Find the active item to get its label for the stub
  const activeItem = NAV_ITEMS.find(item => item.id === active) || NAV_ITEMS[0];

  let PageComponent;
  if (active === 'dashboard') {
    PageComponent = <Dashboard />;
  } else if (active === 'task-box') {
    PageComponent = <TaskBox />;
  } else if (active === 'profile') {
    PageComponent = <Profile />;
  } else {
    PageComponent = <PageStub title={activeItem.label} />;
  }

  return (
    <DashboardLayout activeRoute={active}>
      {PageComponent}
    </DashboardLayout>
  );
}
