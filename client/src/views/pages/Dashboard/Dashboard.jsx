import React, { useState, useMemo, useCallback } from 'react';
import { RECENT_APPS } from '../../../models/apps.js';
import { REQUEST_TILES, ALL_REQUESTS, DEFAULT_REQUEST_IDS } from '../../../models/requests.js';
import { EVENT_TABS, EVENTS } from '../../../models/events.js';
import { SHIFT_START, SHIFT_END, getTodayDate } from '../../../models/shift.js';
import { useClock } from '../../../controllers/useClock.js';
import { useTabs } from '../../../controllers/useTabs.js';
import { formatTime, formatDate } from '../../../controllers/format.js';
import { Icon } from '../../components/Icon/Icon.jsx';
import { TaskBox } from '../TaskBox/TaskBox.jsx';
import './Dashboard.css';

/* ── Request Sidebar Panel ── */
function RequestSidebar({ mode, onClose, selectedIds, onSave }) {
  const [search, setSearch] = useState('');
  const [checkedIds, setCheckedIds] = useState(selectedIds || []);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_REQUESTS;
    return ALL_REQUESTS.filter(r =>
      r.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const toggleCheck = useCallback((id) => {
    setCheckedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleSave = () => {
    onSave(checkedIds);
    onClose();
  };

  const isViewAll = mode === 'view';

  return (
    <>
      {/* Backdrop overlay */}
      <div className="nx-sidebar-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="nx-sidebar-panel">
        {/* Header */}
        <div className="nx-sidebar-panel__header">
          <div>
            <h3 className="nx-sidebar-panel__title">
              {isViewAll ? 'All Requests' : 'Add to List'}
            </h3>
            {!isViewAll && (
              <p className="nx-sidebar-panel__subtitle">
                Select your preferred requests for easy access
              </p>
            )}
          </div>
          <button className="nx-sidebar-panel__close" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Search (View All mode) */}
        {isViewAll && (
          <div className="nx-sidebar-panel__search">
            <Icon name="search" size={16} className="nx-sidebar-panel__search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="nx-sidebar-panel__search-input"
            />
          </div>
        )}

        {/* Request List */}
        <div className="nx-sidebar-panel__list">
          {filtered.map(req => (
            <div
              key={req.id}
              className={`nx-sidebar-item ${isViewAll ? 'nx-sidebar-item--hoverable' : ''}`}
              onClick={!isViewAll ? () => toggleCheck(req.id) : undefined}
            >
              <div className={`nx-sidebar-item__icon nx-sidebar-item__icon--${req.color}`}>
                <Icon name={req.icon} size={18} />
              </div>
              <span className="nx-sidebar-item__label">{req.label}</span>

              {!isViewAll && (
                <div className={`nx-sidebar-checkbox ${checkedIds.includes(req.id) ? 'nx-sidebar-checkbox--checked' : ''}`}>
                  {checkedIds.includes(req.id) && <Icon name="check" size={14} />}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer (Add to List mode) */}
        {!isViewAll && (
          <div className="nx-sidebar-panel__footer">
            <span className="nx-sidebar-panel__count">
              <strong>{checkedIds.length < 10 ? `0${checkedIds.length}` : checkedIds.length}</strong> requests added
            </span>
            <div className="nx-sidebar-panel__actions">
              <button className="nx-sidebar-btn nx-sidebar-btn--cancel" onClick={onClose}>Cancel</button>
              <button className="nx-sidebar-btn nx-sidebar-btn--save" onClick={handleSave}>Save</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Dashboard ── */
export function Dashboard() {
  const clock = useClock();
  const tabs = useTabs('birthdays');

  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState(null); // null | 'view' | 'add'
  const [userSelectedIds, setUserSelectedIds] = useState(DEFAULT_REQUEST_IDS);

  // Visible request tiles based on user selection
  const visibleRequests = useMemo(() => {
    return ALL_REQUESTS.filter(r => userSelectedIds.includes(r.id));
  }, [userSelectedIds]);

  // calculate progress
  const startHour = parseInt(SHIFT_START.split(':')[0]);
  const endHour = parseInt(SHIFT_END.split(':')[0]);
  const nowHour = clock.now.getHours() + clock.now.getMinutes() / 60;
  let progress = ((nowHour - startHour) / (endHour - startHour)) * 100;
  progress = Math.max(0, Math.min(100, progress));

  return (
    <>
      {/* Left Column */}
      <div className="nx-col-main nx-grid-9">
        
        {/* Welcome Card */}
        <div className="nx-card nx-welcome-card">
          <div className="nx-welcome-card__content">
            <h1 className="nx-welcome-card__title">
              Hello there! <Icon name="sparkle" size={20} className="nx-welcome-card__sparkle" />
            </h1>
            <p className="nx-welcome-card__subtitle">Ready for another productive day?</p>
          </div>
        </div>

        {/* Recent Apps */}
        <div className="nx-apps-section">
          <div className="nx-apps-header">
            <h2 className="nx-h2">Recent Apps</h2>
            <button className="nx-btn-link">View All</button>
          </div>
          <div className="nx-apps-grid">
            {RECENT_APPS.map(app => (
              <div key={app.id} className="nx-app-tile">
                <div className="nx-app-tile__icon-box">
                  <Icon name={app.icon} size={24} />
                </div>
                <span className="nx-app-tile__label">{app.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Focus / Team Pulse */}
        <div className="nx-focus-section">
          <div className="nx-apps-header">
            <h2 className="nx-h2">Daily Focus</h2>
          </div>
          <div className="nx-focus-grid">
            <div className="nx-card nx-focus-card nx-focus-card--mood">
              <h4 className="nx-focus-card__title">How's your mood?</h4>
              <div className="nx-focus-mood-options">
                <button className="nx-mood-btn" title="Great"><Icon name="sparkle" size={20} /></button>
                <button className="nx-mood-btn" title="Good"><Icon name="thumbs-up" size={20} /></button>
                <button className="nx-mood-btn" title="Okay"><Icon name="message-square" size={20} /></button>
              </div>
              <div className="nx-focus-mood-input-box">
                <input type="text" placeholder="Tell us more..." className="nx-focus-mood-input" />
                <button className="nx-mood-submit-btn">Submit</button>
              </div>
            </div>
            <div className="nx-card nx-focus-card nx-focus-card--goal">
              <div className="nx-focus-goal-header">
                <h4 className="nx-focus-card__title">Company Highlights</h4>
                <span className="nx-focus-goal-tag">NEW</span>
              </div>
              <p className="nx-focus-goal-text">Monthly Townhall scheduled for Friday at 10 AM.</p>
              <button className="nx-btn-link">Read More</button>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column */}
      <div className="nx-col-side nx-grid-3">
        
        {/* Time Tracker */}
        <div className="nx-card nx-time-tracker">
          <div className="nx-time-tracker__header">
            <h3 className="nx-h3">Let's Get the Ball Rolling</h3>
            <div className={`nx-status-pill ${clock.clockedIn ? 'nx-status-pill--active' : ''}`}>
              <span className="nx-status-dot"></span>
              {clock.clockedIn ? 'ON THE CLOCK' : 'OFF THE CLOCK'}
            </div>
          </div>
          
          <div className="nx-time-tracker__clock-row">
            <div className="nx-time-tracker__date">{formatDate(getTodayDate())}</div>
            <div className="nx-time-tracker__time">{formatTime(clock.now)}</div>
          </div>

          <div className="nx-time-tracker__progress">
            <div className="nx-time-tracker__progress-bar" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="nx-time-tracker__fields">
            <div className="nx-time-tracker__field">
              <span className="nx-time-tracker__label">Clock In</span>
              <span className="nx-time-tracker__val">{formatTime(clock.clockInTime)}</span>
            </div>
            <div className="nx-time-tracker__field">
              <span className="nx-time-tracker__label">Clock Out</span>
              <span className="nx-time-tracker__val">{formatTime(clock.clockOutTime)}</span>
            </div>
          </div>

          <button 
            className={`nx-clock-btn ${clock.clockedIn ? 'nx-clock-btn--out' : 'nx-clock-btn--in'}`}
            onClick={clock.clockedIn ? clock.clockOut : clock.clockIn}
          >
            {clock.clockedIn ? 'Clock Out' : 'Clock In'} <Icon name="play" size={16} />
          </button>

          <div className="nx-time-tracker__footer">
            <span className="nx-p">Shift: {SHIFT_START} - {SHIFT_END}</span>
            <button className="nx-btn-link">View Policies</button>
          </div>
        </div>

        {/* Requests Section */}
        <div className="nx-requests-section">
          <div className="nx-requests-header">
            <h3 className="nx-h3">Requests</h3>
            <div className="nx-requests-header__actions">
              <button 
                className="nx-btn-link" 
                onClick={() => setSidebarMode('view')}
              >
                View All
              </button>
              <button 
                className="nx-requests-dots-btn"
                onClick={() => setSidebarMode('add')}
                title="Add to list"
              >
                <Icon name="dots-vertical" size={18} />
              </button>
            </div>
          </div>

          <div className="nx-requests-grid">
            {visibleRequests.map((req, idx) => {
              const isFeatured = idx === 0;
              return (
                <div key={req.id} className={`nx-card nx-request-card ${isFeatured ? 'nx-request-card--featured' : ''}`}>
                  <div className={`nx-request-icon nx-request-icon--${req.color}`}>
                    <Icon name={req.icon} size={20} />
                  </div>
                  <span className="nx-request-label">{req.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Events */}
        <div className="nx-card nx-events-card">
          <div className="nx-events-tabs">
            {EVENT_TABS.map(tab => (
              <button 
                key={tab.id}
                className={`nx-tab ${tabs.active === tab.id ? 'nx-tab--active' : ''}`}
                onClick={() => tabs.setActive(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="nx-events-list">
            {EVENTS[tabs.active]?.map(event => (
              <div key={event.id} className="nx-event-row">
                <div className="nx-event-avatar">
                  {event.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="nx-event-info">
                  <div className="nx-event-name">{event.name}</div>
                  <div className="nx-event-sub">{event.subtitle}</div>
                </div>
                <Icon name={event.icon} size={16} className="nx-event-icon" />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sidebar Panel */}
      {sidebarMode && (
        <RequestSidebar
          mode={sidebarMode}
          onClose={() => setSidebarMode(null)}
          selectedIds={userSelectedIds}
          onSave={setUserSelectedIds}
        />
      )}
    </>
  );
}