import React, { useState } from 'react';
import { NAV_ITEMS } from '../../../models/nav.js';
import { ME } from '../../../models/people.js';
import { Icon } from '../../components/Icon/Icon.jsx';
import { NexusLogo } from '../../components/NexusLogo/NexusLogo.jsx';
import './DashboardLayout.css';

export function DashboardLayout({ children, activeRoute }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="nx-layout">
      {/* Sidebar */}
      <aside className={`nx-sidebar ${expanded ? 'nx-sidebar--expanded' : 'nx-sidebar--collapsed'}`}>
        <div className="nx-sidebar__top">
          <button className="nx-sidebar__toggle" onClick={() => setExpanded(!expanded)}>
            <NexusLogo expanded={expanded} />
          </button>
        </div>

        <nav className="nx-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.route.replace('#/', '');
            return (
              <a 
                key={item.id} 
                href={item.route} 
                className={`nx-sidebar__item ${isActive ? 'nx-sidebar__item--active' : ''}`}
                title={!expanded ? item.label : undefined}
              >
                <Icon name={item.icon} size={20} className="nx-sidebar__icon" />
                {expanded && <span className="nx-sidebar__label">{item.label}</span>}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="nx-main-area">
        {/* Header */}
        <header className="nx-header">
          <div className="nx-header__search-container">
            <Icon name="search" size={16} className="nx-header__search-icon" />
            <input 
              type="text" 
              className="nx-header__search" 
              placeholder="Search for people, apps, requests..."
            />
            <div className="nx-header__search-kbd">⌘K</div>
          </div>

          <div className="nx-header__actions">
            <button className="nx-header__btn nx-header__btn--notify">
              <Icon name="bell" size={20} />
              <span className="nx-badge"></span>
            </button>
            <div className="nx-header__avatar">
              {ME.initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="nx-content">
          {children}
        </main>
      </div>
    </div>
  );
}
