import { useEffect, useMemo, useState } from "react";
import { useAsyncData } from "../../hooks/useAsyncData.js";
import "./Settings.css";

const CHANNELS = [
  { key: "email", flag: "hasEmail", label: "Email" },
  { key: "emailCc", flag: "hasEmailCc", label: "Email CC" },
  { key: "mobile", flag: "hasMobile", label: "Mobile" },
  { key: "bell", flag: "hasBell", label: "Bell" },
];

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function defaultNotificationPrefs(events) {
  const prefs = {};
  for (const event of events) {
    prefs[event.id] = {
      email: event.hasEmail,
      emailCc: event.hasEmailCc,
      mobile: event.hasMobile,
      bell: event.hasBell,
    };
  }
  return prefs;
}

export function Settings() {
  const { data, loading, error } = useAsyncData(() => import("../../data/settings.js"));
  const [tab, setTab] = useState("notifications");
  // Local edits layer on top of the localStorage-hydrated defaults below, so no
  // effect is needed to seed state once the async data module resolves.
  const [notifOverride, setNotifOverride] = useState(null);
  const [datetimeOverride, setDatetimeOverride] = useState(null);
  const [saved, setSaved] = useState(false);

  const defaultNotifPrefs = useMemo(
    () => (data ? loadJson(data.SETTINGS_STORAGE_KEYS.notifications, defaultNotificationPrefs(data.NOTIFICATION_EVENTS)) : null),
    [data],
  );
  const defaultDatetimePrefs = useMemo(
    () => (data ? loadJson(data.SETTINGS_STORAGE_KEYS.datetime, data.DEFAULT_DATETIME_PREFS) : null),
    [data],
  );
  const notifPrefs = notifOverride ?? defaultNotifPrefs;
  const datetimePrefs = datetimeOverride ?? defaultDatetimePrefs;

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(timer);
  }, [saved]);

  const eventsByCategory = useMemo(() => {
    if (!data) return [];
    return data.NOTIFICATION_CATEGORIES.map((cat) => ({
      ...cat,
      events: data.NOTIFICATION_EVENTS.filter((e) => e.categoryId === cat.id),
    })).filter((cat) => cat.events.length > 0);
  }, [data]);

  if (loading) {
    return (
      <div className="set-page">
        <div className="nx-page-loading">
          <div className="nx-page-loading__spinner" />
        </div>
      </div>
    );
  }

  if (error || !data || !notifPrefs || !datetimePrefs) {
    return (
      <div className="set-page">
        <h1 className="nx-h1">Settings</h1>
        <p className="set-load-error">Could not load settings. Please refresh the page.</p>
      </div>
    );
  }

  const toggleChannel = (eventId, channelKey) => {
    const next = {
      ...notifPrefs,
      [eventId]: { ...notifPrefs[eventId], [channelKey]: !notifPrefs[eventId][channelKey] },
    };
    setNotifOverride(next);
    localStorage.setItem(data.SETTINGS_STORAGE_KEYS.notifications, JSON.stringify(next));
    setSaved(true);
  };

  const updateDatetime = (field, value) => {
    const next = { ...datetimePrefs, [field]: Number(value) };
    setDatetimeOverride(next);
    localStorage.setItem(data.SETTINGS_STORAGE_KEYS.datetime, JSON.stringify(next));
    setSaved(true);
  };

  return (
    <div className="set-page">
      <header className="set-header">
        <h1 className="nx-h1">Settings</h1>
        <p className="set-sub">Manage how Nexus notifies you and displays dates and time.</p>
      </header>

      <div className="set-tabs" role="tablist" aria-label="Settings sections">
        <button
          role="tab"
          aria-selected={tab === "notifications"}
          className={`set-tab ${tab === "notifications" ? "set-tab--active" : ""}`}
          onClick={() => setTab("notifications")}
        >
          Notifications
        </button>
        <button
          role="tab"
          aria-selected={tab === "preferences"}
          className={`set-tab ${tab === "preferences" ? "set-tab--active" : ""}`}
          onClick={() => setTab("preferences")}
        >
          Preferences
        </button>
        <span className={`set-saved ${saved ? "set-saved--visible" : ""}`} role="status">
          Saved
        </span>
      </div>

      {tab === "notifications" ? (
        <div className="set-notif-groups">
          {eventsByCategory.map((cat) => (
            <section key={cat.id} className="nx-card set-notif-group">
              <h2 className="nx-h3 set-notif-group__title">{cat.name}</h2>
              <div className="set-notif-table">
                <div className="set-notif-row set-notif-row--head">
                  <span className="set-notif-row__desc" />
                  {CHANNELS.map((ch) => (
                    <span key={ch.key} className="set-notif-row__channel-label">
                      {ch.label}
                    </span>
                  ))}
                </div>
                {cat.events.map((event) => (
                  <div key={event.id} className="set-notif-row">
                    <span className="set-notif-row__desc">{event.description}</span>
                    {CHANNELS.map((ch) =>
                      event[ch.flag] ? (
                        <button
                          key={ch.key}
                          type="button"
                          role="switch"
                          aria-checked={notifPrefs[event.id][ch.key]}
                          aria-label={`${ch.label} for ${event.description}`}
                          className={`set-toggle ${notifPrefs[event.id][ch.key] ? "set-toggle--on" : ""}`}
                          onClick={() => toggleChannel(event.id, ch.key)}
                        >
                          <span className="set-toggle__knob" />
                        </button>
                      ) : (
                        <span key={ch.key} className="set-notif-row__dash" aria-hidden="true">
                          &ndash;
                        </span>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="nx-card set-prefs">
          <div className="set-prefs__field">
            <label className="set-prefs__label" htmlFor="set-date-format">
              Date format
            </label>
            <select
              id="set-date-format"
              className="set-prefs__select"
              value={datetimePrefs.dateFormatId}
              onChange={(e) => updateDatetime("dateFormatId", e.target.value)}
            >
              {data.DATE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.formatCode} ({opt.example})
                </option>
              ))}
            </select>
          </div>
          <div className="set-prefs__field">
            <label className="set-prefs__label" htmlFor="set-time-format">
              Time format
            </label>
            <select
              id="set-time-format"
              className="set-prefs__select"
              value={datetimePrefs.timeFormatId}
              onChange={(e) => updateDatetime("timeFormatId", e.target.value)}
            >
              {data.TIME_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="set-prefs__field">
            <label className="set-prefs__label" htmlFor="set-timezone">
              Timezone
            </label>
            <select
              id="set-timezone"
              className="set-prefs__select"
              value={datetimePrefs.timezoneId}
              onChange={(e) => updateDatetime("timezoneId", e.target.value)}
            >
              {data.TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
