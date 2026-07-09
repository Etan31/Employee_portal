import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../../hooks/auth.hooks.jsx";
import { useAppData } from "../../hooks/appData.hooks.jsx";
import { Icon } from "../../components/Icon/Icon.jsx";
import { NexusLogo } from "../../components/NexusLogo/NexusLogo.jsx";
import { logError } from "../../utils/logger.js";
import "./DashboardLayout.css";

const NOTIFICATION_ICONS = {
  leave: "calendar",
  task: "list-checks",
  attendance: "clock",
  recognition: "award",
  system: "bell",
};

// Compact relative timestamp for the notification panel.
function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DashboardLayout({ children, activeRoute, navItems }) {
  const [expanded, setExpanded] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState(null);
  const { profile, user, signOut } = useAuth();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppData();
  const dropdownRef = useRef(null);
  const notifyRef = useRef(null);
  const searchRef = useRef(null);
  const searchBoxRef = useRef(null);

  // In the mobile drawer, labels are always shown regardless of the
  // desktop expand/collapse state.
  const showLabels = expanded || mobileNavOpen;

  // Close popovers when clicking outside them.
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setNotifyOpen(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl/Cmd+K focuses the search box (matching the visible kbd hint).
  useEffect(() => {
    function handleKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setQuery("");
        setNotifyOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Reset the mobile drawer when the viewport grows to desktop width so the
  // sidebar returns to its normal in-flow position.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const handler = (event) => {
      if (event.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Lazy-load the employee list the first time the user searches.
  const ensurePeople = () => {
    if (people) return;
    Promise.all([import("../../data/orgSample.js"), import("../../utils/orgData.js")])
      .then(([org, util]) => {
        const tree = org.default.large?.org || org.default.standard.org;
        setPeople(util.flattenOrgTree(tree));
      })
      .catch((error) => logError("Employee search index failed:", error));
  };

  const sidebarItems = navItems || [];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { nav: [], people: [] };
    const nav = sidebarItems.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
    const matchedPeople = (people || [])
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q),
      )
      .slice(0, 5);
    return { nav: nav.slice(0, 4), people: matchedPeople };
  }, [query, sidebarItems, people]);

  const hasResults = results.nav.length > 0 || results.people.length > 0;

  const navigateTo = (route) => {
    window.location.hash = route;
    setQuery("");
    setProfileOpen(false);
    setNotifyOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      const first = results.nav[0]?.route || (results.people.length > 0 ? "#/employees" : null);
      if (first) navigateTo(first);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      logError("Logout failed:", error);
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
      {/* Backdrop for the mobile drawer */}
      <div
        className={`nx-sidebar-backdrop ${mobileNavOpen ? "nx-sidebar-backdrop--visible" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`nx-sidebar ${mobileNavOpen ? "nx-sidebar--mobile-open" : ""}`}
      >
        <header className="nx-sidebar__top">
          <button
            className="nx-sidebar__apps-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse Menu" : "Expand Menu"}
          >
            <Icon name="apps" size={20} className="nx-sidebar__apps-icon" />
            {showLabels && (
              <span className="nx-sidebar__apps-label">All Apps</span>
            )}
          </button>
          <button
            className="nx-sidebar__drawer-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={20} />
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
                    title={!showLabels ? item.label : undefined}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      className="nx-sidebar__icon"
                    />
                    {showLabels && (
                      <span className="nx-sidebar__label">{item.label}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="nx-sidebar__footer">
          <div className="nx-sidebar__logo-container">
            <NexusLogo expanded={showLabels} />
          </div>
        </footer>
      </aside>

      {/* Main Content Area */}
      <div className="nx-main-area">
        {/* Header */}
        <header className="nx-header">
          <button
            className="nx-header__menu-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>

          <div className="nx-header__search-container" ref={searchBoxRef}>
            <Icon name="search" size={16} className="nx-header__search-icon" />
            <input
              ref={searchRef}
              type="text"
              className="nx-header__search"
              placeholder="Search for people, apps, requests..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={ensurePeople}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search pages and people"
            />
            <div className="nx-header__search-kbd">Ctrl K</div>

            {query.trim() && (
              <div className="nx-search-results" role="listbox">
                {results.nav.length > 0 && (
                  <div className="nx-search-results__group">
                    <p className="nx-search-results__label">Pages</p>
                    {results.nav.map((item) => (
                      <button
                        key={item.id}
                        className="nx-search-results__item"
                        onClick={() => navigateTo(item.route)}
                      >
                        <Icon name={item.icon} size={15} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.people.length > 0 && (
                  <div className="nx-search-results__group">
                    <p className="nx-search-results__label">People</p>
                    {results.people.map((p) => (
                      <button
                        key={p.key}
                        className="nx-search-results__item"
                        onClick={() => navigateTo("#/employees")}
                      >
                        <Icon name="user" size={15} />
                        <span>{p.name}</span>
                        <span className="nx-search-results__meta">
                          {p.position}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {!hasResults && (
                  <p className="nx-search-results__empty">
                    No matches for "{query.trim()}"
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="nx-header__actions">
            <div className="nx-header__notify-container" ref={notifyRef}>
              <button
                className="nx-header__btn nx-header__btn--notify"
                onClick={() => setNotifyOpen(!notifyOpen)}
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={notifyOpen}
              >
                <Icon name="bell" size={20} />
                {unreadCount > 0 && (
                  <span className="nx-badge">{unreadCount}</span>
                )}
              </button>

              {notifyOpen && (
                <div className="nx-notify-panel">
                  <div className="nx-notify-panel__header">
                    <h3 className="nx-notify-panel__title">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        className="nx-notify-panel__mark-all"
                        onClick={markAllNotificationsRead}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="nx-notify-panel__list">
                    {notifications.length === 0 && (
                      <p className="nx-notify-panel__empty">
                        You're all caught up.
                      </p>
                    )}
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        className={`nx-notify-panel__item ${n.is_read ? "" : "nx-notify-panel__item--unread"}`}
                        onClick={() => markNotificationRead(n.id)}
                      >
                        <span className="nx-notify-panel__icon">
                          <Icon
                            name={NOTIFICATION_ICONS[n.type] || "bell"}
                            size={15}
                          />
                        </span>
                        <span className="nx-notify-panel__body">
                          <span className="nx-notify-panel__item-title">
                            {n.title}
                          </span>
                          <span className="nx-notify-panel__message">
                            {n.message}
                          </span>
                          <span className="nx-notify-panel__time">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                        {!n.is_read && (
                          <span
                            className="nx-notify-panel__dot"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="nx-notify-panel__footer">
                    <button
                      className="nx-notify-panel__settings"
                      onClick={() => navigateTo("#/settings")}
                    >
                      Notification settings
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="nx-header__profile-container" ref={dropdownRef}>
              <button
                className={`nx-header__avatar-btn ${profileOpen ? "nx-header__avatar-btn--active" : ""}`}
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-label="Account menu"
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
                    <button
                      className="nx-profile-dropdown__item"
                      onClick={() => navigateTo("#/profile")}
                    >
                      <Icon
                        name="user"
                        size={16}
                        className="nx-profile-dropdown__icon"
                      />
                      <span>My Profile</span>
                    </button>
                    <button
                      className="nx-profile-dropdown__item"
                      onClick={() => navigateTo("#/settings")}
                    >
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
