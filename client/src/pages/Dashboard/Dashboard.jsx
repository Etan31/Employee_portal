import { useState, useMemo, useCallback } from 'react';
import { RECENT_APPS } from '../../data/apps.js';
import { ALL_REQUESTS, DEFAULT_REQUEST_IDS } from '../../data/requests.js';
import { LEAVE_EVENTS, BIRTHDAY_EVENTS, ANNIVERSARY_EVENTS } from '../../data/calendarEvents.js';
import { SHIFT_START, SHIFT_END, getTodayDate } from '../../data/shift.js';
import { useClock } from '../../hooks/useClock.js';
import { useTabs } from '../../hooks/useTabs.js';
import { useAppData } from '../../hooks/appData.hooks.jsx';
import { formatTime, formatDate } from '../../utils/format.js';
import { Icon } from '../../components/Icon/Icon.jsx';
import './Dashboard.css';

function navigateTo(route) {
  window.location.hash = route;
}

const EVENT_TABS = [
  { id: 'leave', label: 'Leave' },
  { id: 'birthdays', label: 'Birthdays' },
  { id: 'anniversaries', label: 'Anniversaries' },
];

// Days from today until a date's next yearly occurrence (handles month/day wraparound).
function daysUntilNextOccurrence(dateStr, from) {
  const target = new Date(dateStr + 'T00:00:00');
  const next = new Date(from.getFullYear(), target.getMonth(), target.getDate());
  if (next < from) next.setFullYear(from.getFullYear() + 1);
  return Math.round((next - from) / (1000 * 60 * 60 * 24));
}

// Pulls the dashboard's "upcoming" preview for each event tab straight from the
// same calendar dataset the Calendar page renders, so the two stay in sync.
function useUpcomingEvents() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);
  return useMemo(() => {
    const leave = LEAVE_EVENTS
      .filter((l) => l.startDate >= todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 2)
      .map((l) => ({ id: l.id, name: l.person, subtitle: l.leaveType, icon: 'plane' }));

    const birthdays = [...BIRTHDAY_EVENTS]
      .sort((a, b) => daysUntilNextOccurrence(a.date, today) - daysUntilNextOccurrence(b.date, today))
      .slice(0, 2)
      .map((b) => ({ id: b.id, name: b.person, subtitle: formatDate(new Date(b.date + 'T00:00:00')), icon: 'cake' }));

    const anniversaries = [...ANNIVERSARY_EVENTS]
      .sort((a, b) => daysUntilNextOccurrence(a.date, today) - daysUntilNextOccurrence(b.date, today))
      .slice(0, 2)
      .map((a) => ({ id: a.id, name: a.person, subtitle: `${a.years} Year${a.years !== 1 ? 's' : ''}`, icon: 'award' }));

    return { leave, birthdays, anniversaries };
  }, [today, todayStr]);
}

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

/* ── Mood check-in (local-only; no backend for team mood yet) ── */
function MoodCard() {
  const MOODS = [
    { id: 'great', label: 'Great', icon: 'sparkle' },
    { id: 'good', label: 'Good', icon: 'thumbs-up' },
    { id: 'okay', label: 'Okay', icon: 'message-square' },
  ];
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!mood) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <article className="nx-card nx-focus-card nx-focus-card--mood">
        <h4 className="nx-focus-card__title">How's your mood?</h4>
        <div className="nx-mood-thanks">
          <Icon name="check" size={18} />
          <span>Thanks for sharing how you're feeling today.</span>
        </div>
      </article>
    );
  }

  return (
    <article className="nx-card nx-focus-card nx-focus-card--mood">
      <h4 className="nx-focus-card__title">How's your mood?</h4>
      <div className="nx-focus-mood-options">
        {MOODS.map((m) => (
          <button
            key={m.id}
            className={`nx-mood-btn ${mood === m.id ? 'nx-mood-btn--active' : ''}`}
            title={m.label}
            aria-pressed={mood === m.id}
            onClick={() => setMood(m.id)}
          >
            <Icon name={m.icon} size={20} />
          </button>
        ))}
      </div>
      <div className="nx-focus-mood-input-box">
        <input
          type="text"
          placeholder="Tell us more..."
          className="nx-focus-mood-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="nx-mood-submit-btn" onClick={handleSubmit} disabled={!mood}>
          Submit
        </button>
      </div>
    </article>
  );
}

/* ── Dashboard ── */
export function Dashboard() {
  const clock = useClock();
  const tabs = useTabs('birthdays');
  const { leaveRequests } = useAppData();
  const upcoming = useUpcomingEvents();

  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState(null); // null | 'view' | 'add'
  const [userSelectedIds, setUserSelectedIds] = useState(DEFAULT_REQUEST_IDS);

  // Visible request tiles based on user selection
  const visibleRequests = useMemo(() => {
    return ALL_REQUESTS.filter(r => userSelectedIds.includes(r.id));
  }, [userSelectedIds]);

  const pendingLeaveCount = leaveRequests.filter((r) => r.status === 'pending').length;

  const eventsByTab = { leave: upcoming.leave, birthdays: upcoming.birthdays, anniversaries: upcoming.anniversaries };

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
        <section className="nx-apps-section">
          <header className="nx-apps-header">
            <h2 className="nx-h2">Quick Links</h2>
          </header>
          <ul className="nx-apps-grid">
            {RECENT_APPS.map(app => (
              <li key={app.id}>
                <article
                  className="nx-app-tile"
                  onClick={() => navigateTo(app.route)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigateTo(app.route)}
                >
                  <div className="nx-app-tile__icon-box">
                    <Icon name={app.icon} size={24} />
                  </div>
                  <span className="nx-app-tile__label">{app.label}</span>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {/* Daily Focus / Team Pulse */}
        <section className="nx-focus-section">
          <header className="nx-apps-header">
            <h2 className="nx-h2">Daily Focus</h2>
          </header>
          <div className="nx-focus-grid">
            <MoodCard />
            <article className="nx-card nx-focus-card nx-focus-card--goal">
              <header className="nx-focus-goal-header">
                <h4 className="nx-focus-card__title">Company Highlights</h4>
                <span className="nx-focus-goal-tag">NEW</span>
              </header>
              <p className="nx-focus-goal-text">Monthly Townhall scheduled for Friday at 10 AM.</p>
            </article>
          </div>
        </section>

      </div>

      {/* Right Column */}
      <div className="nx-col-side nx-grid-3">

        {/* Time Tracker */}
        <section className="nx-card nx-time-tracker">
          <header className="nx-time-tracker__header">
            <h3 className="nx-h3">Let's Get the Ball Rolling</h3>
            <div className={`nx-clock-status ${clock.clockedIn ? 'nx-clock-status--active' : ''}`}>
              <span className="nx-clock-status__dot"></span>
              {clock.clockedIn ? 'ON THE CLOCK' : 'OFF THE CLOCK'}
            </div>
          </header>

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

          <footer className="nx-time-tracker__footer">
            <span className="nx-p">Shift: {SHIFT_START} - {SHIFT_END}</span>
            <button className="nx-btn-link" onClick={() => navigateTo('#/hr-policies')}>View Policies</button>
          </footer>
        </section>

        {/* Requests Section */}
        <section className="nx-requests-section">
          <header className="nx-requests-header">
            <div className="nx-requests-header__title-row">
              <h3 className="nx-h3">Requests</h3>
              {pendingLeaveCount > 0 && (
                <span className="nx-status-pill nx-status-pill--warning">
                  {pendingLeaveCount} pending
                </span>
              )}
            </div>
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
          </header>

          <ul className="nx-requests-grid">
            {visibleRequests.map((req, idx) => {
              const isFeatured = idx === 0;
              return (
                <li key={req.id}>
                  <article
                    className={`nx-card nx-request-card ${isFeatured ? 'nx-request-card--featured' : ''}`}
                    onClick={req.route ? () => navigateTo(req.route) : undefined}
                    role={req.route ? 'button' : undefined}
                    tabIndex={req.route ? 0 : undefined}
                  >
                    <div className={`nx-request-icon nx-request-icon--${req.color}`}>
                      <Icon name={req.icon} size={20} />
                    </div>
                    <span className="nx-request-label">{req.label}</span>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Events */}
        <section className="nx-card nx-events-card">
          <nav className="nx-events-tabs">
            {EVENT_TABS.map(tab => (
              <button
                key={tab.id}
                className={`nx-tab ${tabs.active === tab.id ? 'nx-tab--active' : ''}`}
                onClick={() => tabs.setActive(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <ul className="nx-events-list">
            {eventsByTab[tabs.active]?.length ? (
              eventsByTab[tabs.active].map(event => (
                <li key={event.id}>
                  <article className="nx-event-row">
                    <div className="nx-event-avatar">
                      {event.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="nx-event-info">
                      <div className="nx-event-name">{event.name}</div>
                      <div className="nx-event-sub">{event.subtitle}</div>
                    </div>
                    <Icon name={event.icon} size={16} className="nx-event-icon" />
                  </article>
                </li>
              ))
            ) : (
              <li className="nx-events-empty">Nothing coming up.</li>
            )}
          </ul>
        </section>

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
