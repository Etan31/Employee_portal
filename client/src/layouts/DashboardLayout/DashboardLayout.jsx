import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../hooks/auth.hooks.jsx";
import { Icon } from "../../components/Icon/Icon.jsx";
import { NexusLogo } from "../../components/NexusLogo/NexusLogo.jsx";
import "./DashboardLayout.css";

export function DashboardLayout({ children, activeRoute, navItems }) {
  const [expanded, setExpanded] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const { profile, user, signOut } = useAuth();
  const dropdownRef = useRef(null);

  console.log("userdetails: " + user?.email);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sidebarItems = navItems || [];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const userInitials = profile?.first_name
    ? `${profile.first_name[0]}${profile.last_name?.[0] || ""}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "??";

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "User";

  return (
    <div
      className={`nx-layout ${expanded ? "nx-layout--expanded" : "nx-layout--collapsed"}`}
    >
      {/* Sidebar */}
      <aside className="nx-sidebar">
        <header className="nx-sidebar__top">
          <button
            className="nx-sidebar__apps-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse Menu" : "Expand Menu"}
          >
            <Icon name="apps" size={20} className="nx-sidebar__apps-icon" />
            {expanded && (
              <span className="nx-sidebar__apps-label">All Apps</span>
            )}
          </button>
        </header>

        <nav className="nx-sidebar__nav">
          <ul className="nx-sidebar__list">
            {sidebarItems.map((item) => {
              const isActive = activeRoute === item.route.replace("#/", "");
              return (
                <li key={item.id} className="nx-sidebar__list-item">
                  <a
                    href={item.route}
                    className={`nx-sidebar__item ${isActive ? "nx-sidebar__item--active" : ""}`}
                    title={!expanded ? item.label : undefined}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      className="nx-sidebar__icon"
                    />
                    {expanded && (
                      <span className="nx-sidebar__label">{item.label}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="nx-sidebar__footer">
          {expanded && (
            <div className="nx-sidebar__links">
              <a href="#/privacy" className="nx-sidebar__link">
                Privacy policy
              </a>
              <a href="#/terms" className="nx-sidebar__link">
                Terms of Use
              </a>
            </div>
          )}
          <div className="nx-sidebar__logo-container">
            <NexusLogo expanded={expanded} />
          </div>
        </footer>
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

            <div className="nx-header__profile-container" ref={dropdownRef}>
              <button
                className={`nx-header__avatar-btn ${profileOpen ? "nx-header__avatar-btn--active" : ""}`}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="nx-header__avatar">{userInitials}</div>
              </button>

              {profileOpen && (
                <div className="nx-profile-dropdown">
                  <div className="nx-profile-dropdown__header">
                    <div className="nx-profile-dropdown__avatar">
                      {userInitials}
                    </div>
                    <div className="nx-profile-dropdown__info">
                      <div className="nx-profile-dropdown__name">
                        {displayName}
                      </div>
                      <div className="nx-profile-dropdown__email">
                        {profile?.email || user?.email || ""}
                      </div>
                    </div>
                  </div>
                  <div className="nx-profile-dropdown__divider" />
                  <div className="nx-profile-dropdown__menu">
                    <button className="nx-profile-dropdown__item">
                      <Icon
                        name="user"
                        size={16}
                        className="nx-profile-dropdown__icon"
                      />
                      <span>My Profile</span>
                    </button>
                    <button className="nx-profile-dropdown__item">
                      <Icon
                        name="settings"
                        size={16}
                        className="nx-profile-dropdown__icon"
                      />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="nx-profile-dropdown__divider" />
                  <button
                    className="nx-profile-dropdown__logout"
                    onClick={handleLogout}
                  >
                    <Icon
                      name="logout"
                      size={16}
                      className="nx-profile-dropdown__icon"
                    />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="nx-content">
          <div className="nx-dashboard-grid">{children}</div>
        </main>
      </div>
    </div>
  );
}
