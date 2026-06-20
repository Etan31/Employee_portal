/**
 * Design-sync entry point for the Nexus Employee Portal.
 * Exports all screen components and base components for Claude Design.
 *
 * Auth-dependent components (Login, DashboardLayout) are reimplemented here
 * without the Supabase dependency so the bundle works in the preview sandbox.
 */

import React, { useState, useEffect, useRef } from 'react';

// ── CSS ──────────────────────────────────────────────────────────────────────
// global.css imported here so esbuild inlines theme.css (resolving @import).
// cfg.cssEntry is set to theme.css (no @import) to avoid a dangling reference
// when the converter appends the cssEntry as raw text to _ds_bundle.css.
import '../client/src/styles/global.css';
import './login-ds.css'; /* Login.css clone with background-image url() removed */
import '../client/src/layouts/DashboardLayout/DashboardLayout.css';
import '../client/src/pages/Dashboard/Dashboard.css';
import '../client/src/pages/TaskBox/TaskBox.css';
import '../client/src/pages/Profile/Profile.css';
import '../client/src/pages/TimeManagement/TimeManagement.css';
import '../client/src/pages/Organization/Organization.css';
import '../client/src/components/Icon/Icon.css';
import '../client/src/components/OrgChartView/OrgChartView.css';

// ── Base components ───────────────────────────────────────────────────────────
export { Icon } from '../client/src/components/Icon/Icon.jsx';
export { NexusLogo } from '../client/src/components/NexusLogo/NexusLogo.jsx';
export { default as OrgChartView } from '../client/src/components/OrgChartView/OrgChartView.jsx';

// ── Screen components (auth-free) ─────────────────────────────────────────────
export { Dashboard } from '../client/src/pages/Dashboard/Dashboard.jsx';
export { TaskBox } from '../client/src/pages/TaskBox/TaskBox.jsx';
export { Profile } from '../client/src/pages/Profile/Profile.jsx';
export { TimeManagement } from '../client/src/pages/TimeManagement/TimeManagement.jsx';
export { default as Organization } from '../client/src/pages/Organization/Organization.jsx';

// ── Login page (standalone — no auth/Supabase dependency) ────────────────────
export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="login-container">
      {/* Left — video panel */}
      <div className="login-image-panel">
        <video className="login-bg-video" autoPlay muted loop playsInline>
          <source src="/truck_bg.mp4" type="video/mp4" />
        </video>
        <div className="login-image-overlay" />
        <div className="login-brand">
          <span className="login-brand-name">Nexus</span>
        </div>
        <div className="login-tagline">
          <p>Where Efficiency Meets the Road.</p>
        </div>
        <div className="login-highlight">
          <div className="login-highlight-item">
            <span>1</span>
            <p>Quick check-in and shift updates for leasing staff on the move.</p>
          </div>
          <div className="login-highlight-item">
            <span>2</span>
            <p>Track leave requests and company operations without leaving the portal.</p>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="login-form-panel">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h1>Sign In</h1>
            <p>Nexus Employee Hub</p>
          </div>

          <form className="login-form" onSubmit={e => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email" type="email" className="form-input"
                placeholder="name@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password" className="form-label">Password</label>
                <a href="#" className="forgot-link">Forgot?</a>
              </div>
              <input
                id="password" type="password" className="form-input"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-button">Log In</button>

            <p className="demo-credentials">
              <b>Demo: </b>employee@gmail.com / employee12345
            </p>
          </form>

          <p className="login-footer-text">
            &copy; {new Date().getFullYear()} Nexus. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── DashboardLayout (standalone — no auth/Supabase dependency) ────────────────
const DEFAULT_NAV = [
  { id: 'dashboard',       label: 'Dashboard',       icon: 'layout-dashboard', route: '#/dashboard' },
  { id: 'task-box',        label: 'Task Box',         icon: 'list-checks',      route: '#/task-box' },
  { id: 'profile',         label: 'Profile',          icon: 'user',             route: '#/profile' },
  { id: 'time-management', label: 'Time management',  icon: 'clock',            route: '#/time-management' },
  { id: 'employees',       label: 'Employees',        icon: 'users',            route: '#/employees' },
  { id: 'calendar',        label: 'Calendar',         icon: 'calendar',         route: '#/calendar' },
  { id: 'hr-policies',     label: 'HR Policies',      icon: 'file-text',        route: '#/hr-policies' },
  { id: 'helpdesk',        label: 'Helpdesk',         icon: 'message-square',   route: '#/helpdesk' },
  { id: 'org-view',        label: 'Org View',         icon: 'network',          route: '#/org-view' },
];

const DEFAULT_USER = { email: 'alex.morgan@nexus.com', id: 'u1' };
const DEFAULT_PROFILE = { first_name: 'Alex', last_name: 'Morgan', email: 'alex.morgan@nexus.com' };

import { Icon as _Icon } from '../client/src/components/Icon/Icon.jsx';
import { NexusLogo as _NexusLogo } from '../client/src/components/NexusLogo/NexusLogo.jsx';

export function DashboardLayout({
  children,
  activeRoute = 'dashboard',
  navItems = DEFAULT_NAV,
  user = DEFAULT_USER,
  profile = DEFAULT_PROFILE,
}) {
  const [expanded, setExpanded] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = profile?.first_name
    ? `${profile.first_name[0]}${profile.last_name?.[0] || ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '??';

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User';

  return (
    <div className={`nx-layout ${expanded ? 'nx-layout--expanded' : 'nx-layout--collapsed'}`}>
      {/* Sidebar */}
      <aside className="nx-sidebar">
        <header className="nx-sidebar__top">
          <button
            className="nx-sidebar__apps-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse Menu' : 'Expand Menu'}
          >
            <_Icon name="apps" size={20} className="nx-sidebar__apps-icon" />
            {expanded && <span className="nx-sidebar__apps-label">All Apps</span>}
          </button>
        </header>

        <nav className="nx-sidebar__nav">
          <ul className="nx-sidebar__list">
            {navItems.map(item => {
              const isActive = activeRoute === item.id;
              return (
                <li key={item.id} className="nx-sidebar__list-item">
                  <a
                    href={item.route}
                    className={`nx-sidebar__item ${isActive ? 'nx-sidebar__item--active' : ''}`}
                    title={!expanded ? item.label : undefined}
                  >
                    <_Icon name={item.icon} size={18} className="nx-sidebar__icon" />
                    {expanded && <span className="nx-sidebar__label">{item.label}</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="nx-sidebar__footer">
          {expanded && (
            <div className="nx-sidebar__links">
              <a href="#/privacy" className="nx-sidebar__link">Privacy policy</a>
              <a href="#/terms" className="nx-sidebar__link">Terms of Use</a>
            </div>
          )}
          <div className="nx-sidebar__logo-container">
            <_NexusLogo expanded={expanded} />
          </div>
        </footer>
      </aside>

      {/* Main area */}
      <div className="nx-main-area">
        <header className="nx-header">
          <div className="nx-header__search-container">
            <_Icon name="search" size={16} className="nx-header__search-icon" />
            <input
              type="text" className="nx-header__search"
              placeholder="Search for people, apps, requests..."
            />
            <div className="nx-header__search-kbd">⌘K</div>
          </div>

          <div className="nx-header__actions">
            <button className="nx-header__btn nx-header__btn--notify">
              <_Icon name="bell" size={20} />
              <span className="nx-badge"></span>
            </button>

            <div className="nx-header__profile-container" ref={dropdownRef}>
              <button
                className={`nx-header__avatar-btn ${profileOpen ? 'nx-header__avatar-btn--active' : ''}`}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="nx-header__avatar">{userInitials}</div>
              </button>

              {profileOpen && (
                <div className="nx-profile-dropdown">
                  <div className="nx-profile-dropdown__header">
                    <div className="nx-profile-dropdown__avatar">{userInitials}</div>
                    <div className="nx-profile-dropdown__info">
                      <div className="nx-profile-dropdown__name">{displayName}</div>
                      <div className="nx-profile-dropdown__email">{profile?.email || user?.email || ''}</div>
                    </div>
                  </div>
                  <div className="nx-profile-dropdown__divider" />
                  <div className="nx-profile-dropdown__menu">
                    <button className="nx-profile-dropdown__item">
                      <_Icon name="user" size={16} className="nx-profile-dropdown__icon" />
                      <span>My Profile</span>
                    </button>
                    <button className="nx-profile-dropdown__item">
                      <_Icon name="settings" size={16} className="nx-profile-dropdown__icon" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="nx-profile-dropdown__divider" />
                  <button className="nx-profile-dropdown__logout">
                    <_Icon name="logout" size={16} className="nx-profile-dropdown__icon" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="nx-content">
          <div className="nx-dashboard-grid">{children}</div>
        </main>
      </div>
    </div>
  );
}
