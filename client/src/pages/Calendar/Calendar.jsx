import { useState, useMemo, useRef, useEffect } from 'react';
import './Calendar.css';
import {
  MONTH_NAMES,
  DAY_NAMES,
  VIEW_OPTIONS,
  LEGEND,
  PH_HOLIDAYS,
  LEAVE_EVENTS,
  ANNIVERSARY_EVENTS,
  BIRTHDAY_EVENTS,
} from '../../data/calendarEvents.js';

const TODAY = new Date();

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildGrid(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: new Date(year, month, i - firstWeekday + 1), current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  let next = 1;
  while (cells.length < 35 || cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, next++), current: false });
    if (cells.length >= 42) break;
  }
  return cells;
}

function getEventsForDate(date, filter) {
  const str = toDateStr(date);
  const events = [];

  if (filter === 'all') {
    for (const h of PH_HOLIDAYS) {
      if (h.date === str) events.push({ ...h, eventType: 'holiday' });
    }
  }

  const showLeave = ['all', 'leave', 'team', 'mine', 'pending'].includes(filter);
  if (showLeave) {
    for (const l of LEAVE_EVENTS) {
      if (str >= l.startDate && str <= l.endDate) {
        if (filter === 'mine' && !l.isMe) continue;
        if (filter === 'pending' && l.status !== 'pending') continue;
        events.push({ ...l, eventType: 'leave' });
      }
    }
  }

  if (filter === 'all' || filter === 'birthdays') {
    for (const b of BIRTHDAY_EVENTS) {
      if (b.date === str) events.push({ ...b, eventType: 'birthday' });
    }
  }

  if (filter === 'all' || filter === 'anniversary') {
    for (const a of ANNIVERSARY_EVENTS) {
      if (a.date === str) events.push({ ...a, eventType: 'anniversary' });
    }
  }

  return events;
}

// Single source for the tone used by day-cell chips, upcoming dots, and the legend.
function eventTone(ev) {
  if (ev.eventType === 'holiday')     return 'holiday';
  if (ev.eventType === 'birthday')    return 'birthday';
  if (ev.eventType === 'anniversary') return 'anniversary';
  if (ev.status === 'sick')           return 'sick';
  if (ev.status === 'pending')        return 'pending';
  return 'approved';
}

function eventLabel(ev) {
  return ev.eventType === 'holiday' ? ev.title : ev.person;
}

function eventTypeLabel(ev) {
  if (ev.eventType === 'holiday')     return 'Public Holiday';
  if (ev.eventType === 'birthday')    return 'Birthday';
  if (ev.eventType === 'anniversary') return `Work Anniversary · ${ev.years} yr${ev.years !== 1 ? 's' : ''}`;
  if (ev.status === 'sick')           return 'Sick Leave';
  if (ev.status === 'pending')        return 'Pending Leave';
  return ev.leaveType || 'Vacation Leave';
}

/* ── Icons ── */
function ChevronLeft() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ChevronDown() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ── Calendar Cell ── */
function CalCell({ cell, filter, isToday }) {
  const events = useMemo(() => getEventsForDate(cell.date, filter), [cell.date, filter]);
  const MAX = 2;
  const shown = events.slice(0, MAX);
  const overflow = events.length - MAX;
  const isSun = cell.date.getDay() === 0;
  const isSat = cell.date.getDay() === 6;

  return (
    <div className={[
      'cal-cell',
      !cell.current ? 'cal-cell--other' : '',
      isToday ? 'cal-cell--today' : '',
      isSun || isSat ? 'cal-cell--weekend' : '',
    ].filter(Boolean).join(' ')}>
      <span className="cal-day-num">{cell.date.getDate()}</span>
      <div className="cal-events">
        {shown.map(ev => (
          <div key={ev.id} className={`cal-ev cal-ev--${eventTone(ev)}`} title={`${eventLabel(ev)} — ${eventTypeLabel(ev)}`}>
            {eventLabel(ev)}
          </div>
        ))}
        {overflow > 0 && (
          <div className="cal-ev-more">+{overflow} more</div>
        )}
      </div>
    </div>
  );
}

/* ── Upcoming events sidebar section ── */
function UpcomingList({ filter }) {
  const groups = useMemo(() => {
    const result = [];
    for (let d = 0; d <= 30; d++) {
      const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + d);
      const evs = getEventsForDate(date, filter);
      if (evs.length) result.push({ date, evs });
    }
    return result.slice(0, 8);
  }, [filter]);

  function fmt(date) {
    const DAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (isSameDay(date, TODAY)) return 'Today';
    const tom = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1);
    if (isSameDay(date, tom)) return 'Tomorrow';
    return `${DAY[date.getDay()]}, ${MON[date.getMonth()]} ${date.getDate()}`;
  }

  if (!groups.length) {
    return <p className="upcoming-empty">No upcoming events in the next 30 days.</p>;
  }

  return (
    <div className="upcoming-list">
      {groups.map(({ date, evs }) => (
        <div key={toDateStr(date)} className="upcoming-group">
          <div className="upcoming-date-label">{fmt(date)}</div>
          {evs.map(ev => (
            <div key={ev.id} className="upcoming-event">
              <span className={`upcoming-dot upcoming-dot--${eventTone(ev)}`} />
              <div className="upcoming-event-body">
                <div className="upcoming-event-type">{eventTypeLabel(ev).toUpperCase()}</div>
                <div className="upcoming-event-name">{eventLabel(ev)}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Main Calendar component ── */
export function Calendar() {
  const [year, setYear]         = useState(TODAY.getFullYear());
  const [month, setMonth]       = useState(TODAY.getMonth());
  const [filter, setFilter]     = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    function onMouseDown(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const grid = useMemo(() => buildGrid(year, month), [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(TODAY.getFullYear());
    setMonth(TODAY.getMonth());
  }

  const activeLabel = VIEW_OPTIONS.find(o => o.id === filter)?.label ?? 'View All';

  return (
    <div className="calendar-page">
      <header className="cal-page-header">
        <div>
          <h1 className="cal-page-title">Calendar</h1>
          <p className="cal-page-sub">Company events, leave, birthdays, and public holidays.</p>
        </div>
        <button className="cal-today-btn" onClick={goToday}>Today</button>
      </header>

      <div className="calendar-layout">
        {/* ── Main grid area ── */}
        <div className="calendar-main">
          <div className="cal-nav">
            <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft />
            </button>
            <h2 className="cal-month-label">{MONTH_NAMES[month]} {year}</h2>
            <button className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">
              <ChevronRight />
            </button>
          </div>

          <div className="cal-card">
            <div className="cal-weekday-row">
              {DAY_NAMES.map(d => (
                <div key={d} className={`cal-weekday${d === 'Sun' || d === 'Sat' ? ' cal-weekday--weekend' : ''}`}>{d}</div>
              ))}
            </div>
            <div className="cal-grid">
              {grid.map((cell, i) => (
                <CalCell
                  key={i}
                  cell={cell}
                  filter={filter}
                  isToday={isSameDay(cell.date, TODAY)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="calendar-sidebar">
          {/* Filter dropdown */}
          <div className="sidebar-filter-wrap" ref={filterRef}>
            <button
              className="sidebar-filter-btn"
              onClick={() => setFilterOpen(o => !o)}
              aria-expanded={filterOpen}
            >
              <span>{activeLabel}</span>
              <ChevronDown />
            </button>
            {filterOpen && (
              <div className="sidebar-filter-menu">
                {VIEW_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    className={`sidebar-filter-opt${filter === opt.id ? ' active' : ''}`}
                    onClick={() => { setFilter(opt.id); setFilterOpen(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="cal-legend">
            {LEGEND.map(l => (
              <div key={l.tone} className="legend-row">
                <span className={`legend-dot legend-dot--${l.tone}`} />
                <span className="legend-label">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Upcoming events */}
          <div className="sidebar-upcoming">
            <h3 className="upcoming-heading">Upcoming</h3>
            <UpcomingList filter={filter} />
          </div>
        </aside>
      </div>
    </div>
  );
}
