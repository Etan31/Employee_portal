import React from 'react';
import { RECENT_APPS } from '../../../models/apps.js';
import { REQUEST_TILES } from '../../../models/requests.js';
import { EVENT_TABS, EVENTS } from '../../../models/events.js';
import { SHIFT_START, SHIFT_END, getTodayDate } from '../../../models/shift.js';
import { useClock } from '../../../controllers/useClock.js';
import { useTabs } from '../../../controllers/useTabs.js';
import { formatTime, formatDate } from '../../../controllers/format.js';
import { Icon } from '../../components/Icon/Icon.jsx';
import './Dashboard.css';

export function Dashboard() {
  const clock = useClock();
  const tabs = useTabs('birthdays');

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
              Wrap Up with Excellence! <Icon name="sparkle" size={24} className="nx-welcome-card__sparkle" />
            </h1>
            <p className="nx-welcome-card__subtitle">You're making great progress today.</p>
          </div>
          <div className="nx-welcome-card__illustration">
            {/* Simple inline SVG illustration */}
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <rect x="20" y="30" width="80" height="50" rx="4" fill="#e2e8f0" />
              <rect x="25" y="35" width="70" height="40" rx="2" fill="#fff" />
              <path d="M40 80L80 80L90 90H30L40 80Z" fill="#cbd5e1" />
              <path d="M70 20L85 10L90 25Z" fill="#38bdf8" opacity="0.8" />
            </svg>
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

        {/* Requests */}
        <div className="nx-requests-grid">
          {REQUEST_TILES.map((req, idx) => {
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
    </>
  );
}