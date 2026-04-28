import React, { useState } from 'react';
import { NAV_ITEMS } from '../../../../client/src/models/nav.js';
import { ME } from '../../../../client/src/models/people.js';
import { Icon } from '../icons/Icon.jsx';
import { NexusLogo } from '../icons/NexusLogo.jsx';
import './DashboardLayout.css';

export function DashboardLayout({ children, activeRoute }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`nx-layout ${expanded ? 'nx-layout--expanded' : 'nx-layout--collapsed'}`}>
      {/* Sidebar */}
      <aside className="nx-sidebar">
        <div className="nx-sidebar__top">
          <button 
            className="nx-sidebar__apps-btn" 
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse Menu" : "Expand Menu"}
          >
            <Icon name="apps" size={20} className="nx-sidebar__apps-icon" />
            {expanded && <span className="nx-sidebar__apps-label">All Apps</span>}
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
                <Icon name={item.icon} size={18} className="nx-sidebar__icon" />
                {expanded && <span className="nx-sidebar__label">{item.label}</span>}
              </a>
            );
          })}
        </nav>

        <div className="nx-sidebar__footer">
          {expanded && (
            <div className="nx-sidebar__links">
              <a href="#/privacy" className="nx-sidebar__link">Privacy policy</a>
              <a href="#/terms" className="nx-sidebar__link">Terms of Use</a>
            </div>
          )}
          <div className="nx-sidebar__logo-container">
            <NexusLogo expanded={expanded} />
          </div>
        </div>
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
          <div className="nx-dashboard-grid">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
