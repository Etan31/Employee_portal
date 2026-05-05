import React from 'react';
import { useNavigation } from './controllers/useNavigation.js';
import { NAV_ITEMS } from './models/nav.js';
import { DashboardLayout } from './views/layouts/DashboardLayout/DashboardLayout.jsx';
import { Dashboard } from './views/pages/Dashboard/Dashboard.jsx';
import { TaskBox } from './views/pages/TaskBox/TaskBox.jsx';
import { Profile } from './views/pages/Profile/Profile.jsx';
import { PageStub } from './views/pages/PageStub/PageStub.jsx';

import './styles/global.css';

export default function App() {
  const { active } = useNavigation();

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
