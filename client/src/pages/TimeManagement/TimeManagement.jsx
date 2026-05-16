import React, { useState, useRef } from "react";
import { Icon } from "../../components/Icon/Icon.jsx";
import {
  LEAVE_TYPES,
  LEAVE_REASONS,
  RECIPIENTS,
  LEAVE_REQUESTS,
  HOLIDAYS,
  LEAVE_BALANCES,
  ATTENDANCE_WEEK,
  ATTENDANCE_MONTH,
  QUICK_STATS,
} from "../../data/timeManagement.js";
import { formatShortDate } from "../../utils/format.js";
import "./TimeManagement.css";

// ─── Circular Progress Ring ────────────────────────────────────────────────

function RingProgress({ pct, color, size = 56, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="nx-tm-ring">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--nx-border)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// ─── Attendance SVG Chart ──────────────────────────────────────────────────

function AttendanceChart({ data, viewMode }) {
  const [tooltip, setTooltip] = useState(null);

  const MAX_HOURS = 10;
  const CHART_H = 72;
  const BAR_W = viewMode === "month" ? 7 : 11;
  const GAP = viewMode === "month" ? 4 : 10;
  const PAD = { top: 10, right: 12, bottom: 28, left: 28 };

  const totalW = data.length * (BAR_W + GAP) - GAP + PAD.left + PAD.right;

  return (
    <div className="nx-tm-chart-wrapper">
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${CHART_H + PAD.top + PAD.bottom}`}
        className="nx-tm-chart-svg"
        preserveAspectRatio="xMinYMid meet"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--nx-primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--nx-primary)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="lateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {[2, 4, 6, 8, 10].map((h) => {
          const y = PAD.top + CHART_H - (h / MAX_HOURS) * CHART_H;
          return (
            <g key={h}>
              <line x1={PAD.left} x2={totalW - PAD.right} y1={y} y2={y}
                stroke="var(--nx-border)" strokeDasharray="3 3" strokeWidth="0.8" />
              <text x={PAD.left - 5} y={y + 4} textAnchor="end"
                fontSize="8.5" fill="var(--nx-text-muted)" fontFamily="inherit">
                {h}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = PAD.left + i * (BAR_W + GAP);
          const isGray = d.type !== "normal";
          const rawH = isGray ? 0 : (d.loggedHours / MAX_HOURS) * CHART_H;
          const barH = Math.max(rawH, isGray ? 4 : 2);
          const lateH = (d.lateMinutes / 60 / MAX_HOURS) * CHART_H;
          const barY = PAD.top + CHART_H - barH;
          const rx = viewMode === "month" ? 3 : 5;

          return (
            <g key={`${d.date}-${i}`}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: d })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}>
              <rect x={x} y={isGray ? PAD.top + CHART_H - 4 : barY}
                width={BAR_W} height={barH} rx={rx}
                fill={isGray ? "url(#none)" : "url(#barGrad)"}
                style={{ fill: isGray ? "var(--nx-border)" : undefined }}
                opacity={isGray ? 0.5 : 1}
              />
              {!isGray && lateH > 0 && (
                <rect x={x} y={barY - lateH + 4} width={BAR_W}
                  height={Math.max(lateH, 3)} rx={rx}
                  fill="url(#lateGrad)" />
              )}
              {(viewMode === "week" || i % 5 === 0) && (
                <text x={x + BAR_W / 2} y={PAD.top + CHART_H + 18}
                  textAnchor="middle" fontSize="8.5"
                  fill="var(--nx-text-muted)" fontFamily="inherit">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div className="nx-tm-chart-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y - 48 }}>
          <span className="nx-tm-tooltip-date">{tooltip.data.date}</span>
          {tooltip.data.type === "weekend" && <span>Weekend / Day Off</span>}
          {tooltip.data.type === "leave" && <span>On Leave</span>}
          {tooltip.data.type === "normal" && (
            <>
              <span className="nx-tm-tooltip-row">
                <span className="nx-tm-tooltip-dot nx-tm-tooltip-dot--blue" />
                Logged: <b>{tooltip.data.loggedHours}h</b>
              </span>
              {tooltip.data.lateMinutes > 0 && (
                <span className="nx-tm-tooltip-row">
                  <span className="nx-tm-tooltip-dot nx-tm-tooltip-dot--orange" />
                  Late: <b>{tooltip.data.lateMinutes} min</b>
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attendance Panel ──────────────────────────────────────────────────────

function AttendancePanel() {
  const [viewMode, setViewMode] = useState("week");
  const data = viewMode === "week" ? ATTENDANCE_WEEK : ATTENDANCE_MONTH;

  const metrics = [
    { label: "Avg. Work Duration", value: "9:06:00", accent: "blue" },
    { label: "Avg. Late By",       value: "00:04:00", accent: "orange" },
    { label: "Avg. Overtime",      value: "00:00:00", accent: "green" },
  ];

  return (
    <section className="nx-card nx-tm-attendance-panel">
      <header className="nx-tm-panel-header">
        <div>
          <h3 className="nx-tm-panel-title">Attendance Metrics</h3>
          <p className="nx-tm-panel-subtitle">Weekly performance overview</p>
        </div>
        <div className="nx-tm-toggle">
          {["week", "month"].map((v) => (
            <button key={v}
              className={`nx-tm-toggle-btn${viewMode === v ? " nx-tm-toggle-btn--active" : ""}`}
              onClick={() => setViewMode(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="nx-tm-metrics-row">
        {metrics.map((m) => (
          <div key={m.label} className={`nx-tm-metric-tile nx-tm-metric-tile--${m.accent}`}>
            <span className="nx-tm-metric-tile__value">{m.value}</span>
            <span className="nx-tm-metric-tile__label">{m.label}</span>
          </div>
        ))}
      </div>

      <AttendanceChart data={data} viewMode={viewMode} />

      <div className="nx-tm-chart-legend">
        {[
          { cls: "gray", label: "Weekly Off / Holiday / Leave" },
          { cls: "blue", label: "Logged Hours" },
          { cls: "orange", label: "Late By" },
        ].map((l) => (
          <span key={l.cls} className={`nx-tm-legend-item nx-tm-legend-item--${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Leave Balances Panel ──────────────────────────────────────────────────

const BALANCE_COLORS = {
  blue:   "#2563eb",
  amber:  "#f59e0b",
  violet: "#8b5cf6",
  green:  "#16a34a",
};

function LeaveBalancesPanel({ onApply }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? LEAVE_BALANCES : LEAVE_BALANCES.slice(0, 2);

  return (
    <section className="nx-card nx-tm-balances-panel">
      <header className="nx-tm-panel-header">
        <h3 className="nx-tm-panel-title">Leave Balances</h3>
        <button className="nx-tm-link-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show Less" : "View All"}
        </button>
      </header>

      <div className="nx-tm-balances-list">
        {visible.map((bal) => {
          const remaining = bal.total - bal.used;
          const pct = Math.round((remaining / bal.total) * 100);
          const color = BALANCE_COLORS[bal.color] || BALANCE_COLORS.blue;

          return (
            <div key={bal.id} className="nx-tm-balance-card"
              style={{ "--bal-color": color }}>
              <div className="nx-tm-balance-card__body">
                <RingProgress pct={pct} color={color} size={52} stroke={5} />
                <div className="nx-tm-balance-card__info">
                  <span className="nx-tm-balance-count">{remaining}</span>
                  <span className="nx-tm-balance-label">{bal.label}</span>
                  <span className="nx-tm-balance-sub">{bal.used} used of {bal.total}</span>
                </div>
              </div>
              <button className="nx-tm-balance-apply" title={`Apply ${bal.label}`}
                onClick={() => onApply(bal.label)}>
                <Icon name="plus-circle" size={14} />
                Apply
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Holidays Panel ────────────────────────────────────────────────────────

function HolidaysPanel() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? HOLIDAYS : HOLIDAYS.slice(0, 4);

  return (
    <section className="nx-card nx-tm-holidays-panel">
      <header className="nx-tm-panel-header">
        <h3 className="nx-tm-panel-title">Upcoming Time Off</h3>
        <button className="nx-tm-link-btn" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show Less" : "View All"}
        </button>
      </header>

      <ul className="nx-tm-holidays-list">
        {visible.map((h, idx) => {
          const d = new Date(h.date + "T00:00:00");
          const month = d.toLocaleString("default", { month: "short" });
          const day = d.getDate();
          const weekday = d.toLocaleString("default", { weekday: "short" });
          return (
            <li key={h.id} className="nx-tm-holiday-row">
              <div className="nx-tm-holiday-date">
                <span className="nx-tm-holiday-month">{month}</span>
                <span className="nx-tm-holiday-day">{day}</span>
                <span className="nx-tm-holiday-wd">{weekday}</span>
              </div>
              <div className="nx-tm-holiday-info">
                <span className="nx-tm-holiday-name">{h.name}</span>
                <span className="nx-tm-holiday-type">{h.type}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Leave Request Sidebar ─────────────────────────────────────────────────

function LeaveRequestSidebar({ onClose, onSubmit, defaultLeaveType = "" }) {
  const [form, setForm] = useState({
    leaveType: defaultLeaveType,
    dateFrom: "",
    dateTo: "",
    reason: "",
    message: "",
  });
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const filteredRecipients = RECIPIENTS.filter(
    (r) =>
      !selectedRecipients.find((s) => s.id === r.id) &&
      r.name.toLowerCase().includes(recipientInput.toLowerCase())
  );

  const addRecipient = (r) => {
    setSelectedRecipients((prev) => [...prev, r]);
    setRecipientInput("");
  };
  const removeRecipient = (id) =>
    setSelectedRecipients((prev) => prev.filter((r) => r.id !== id));

  const addFiles = (incoming) => {
    setFiles((prev) => [...prev, ...Array.from(incoming)].slice(0, 3));
  };
  const handleFiles = (e) => { addFiles(e.target.files); e.target.value = ""; };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };
  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    const errs = {};
    if (!form.leaveType) errs.leaveType = "Select a leave type.";
    if (!form.dateFrom) errs.dateFrom = "Select a start date.";
    if (!form.dateTo) errs.dateTo = "Select an end date.";
    if (form.dateFrom && form.dateTo && form.dateFrom > form.dateTo)
      errs.dateTo = "End date must be after start date.";
    if (!form.reason) errs.reason = "Select a reason.";
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({
      ...form,
      recipients: selectedRecipients,
      attachments: files.map((f) => f.name),
      status: "pending",
    });
    onClose();
  };

  const field = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <>
      <div className="nx-tm-overlay" onClick={onClose} />
      <div className="nx-tm-panel" role="dialog" aria-modal="true">
        {/* Header */}
        <header className="nx-tm-panel__header">
          <div className="nx-tm-panel__header-icon">
            <Icon name="calendar-plus" size={18} />
          </div>
          <div className="nx-tm-panel__header-text">
            <h3 className="nx-tm-panel__title">New Leave Request</h3>
            <p className="nx-tm-panel__subtitle">Submit a request to your manager</p>
          </div>
          <button className="nx-tm-panel__close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={17} />
          </button>
        </header>

        <div className="nx-tm-panel__body">
          {/* Leave Type */}
          <div className="nx-tm-form-group">
            <label className="nx-tm-form-label">Leave Type</label>
            <select
              className={`nx-tm-form-select${errors.leaveType ? " nx-tm-form-select--error" : ""}`}
              value={form.leaveType}
              onChange={(e) => field("leaveType", e.target.value)}>
              <option value="">Select leave type…</option>
              {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.leaveType && <span className="nx-tm-form-error">{errors.leaveType}</span>}
          </div>

          {/* Recipients */}
          <div className="nx-tm-form-group" style={{ position: "relative" }}>
            <label className="nx-tm-form-label">Recipient(s)</label>
            <div className="nx-tm-chip-input">
              {selectedRecipients.map((r) => (
                <span key={r.id} className="nx-tm-chip">
                  {r.name}
                  <button type="button" className="nx-tm-chip__remove"
                    onClick={() => removeRecipient(r.id)}>
                    <Icon name="x" size={9} />
                  </button>
                </span>
              ))}
              <input type="text" className="nx-tm-chip-input__field"
                placeholder={selectedRecipients.length === 0 ? "Search by name…" : ""}
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)} />
            </div>
            {recipientInput && filteredRecipients.length > 0 && (
              <ul className="nx-tm-suggestions">
                {filteredRecipients.map((r) => (
                  <li key={r.id} className="nx-tm-suggestions__item"
                    onClick={() => addRecipient(r)}>
                    <div className="nx-tm-suggestions__avatar">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <span className="nx-tm-suggestions__name">{r.name}</span>
                      <span className="nx-tm-suggestions__role">{r.role}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Date row */}
          <div className="nx-tm-form-row">
            <div className="nx-tm-form-group">
              <label className="nx-tm-form-label">Date From</label>
              <input type="date"
                className={`nx-tm-form-input${errors.dateFrom ? " nx-tm-form-input--error" : ""}`}
                value={form.dateFrom}
                onChange={(e) => field("dateFrom", e.target.value)} />
              {errors.dateFrom && <span className="nx-tm-form-error">{errors.dateFrom}</span>}
            </div>
            <div className="nx-tm-form-group">
              <label className="nx-tm-form-label">Date To</label>
              <input type="date"
                className={`nx-tm-form-input${errors.dateTo ? " nx-tm-form-input--error" : ""}`}
                value={form.dateTo}
                onChange={(e) => field("dateTo", e.target.value)} />
              {errors.dateTo && <span className="nx-tm-form-error">{errors.dateTo}</span>}
            </div>
          </div>

          {/* Reason */}
          <div className="nx-tm-form-group">
            <label className="nx-tm-form-label">Reason</label>
            <select
              className={`nx-tm-form-select${errors.reason ? " nx-tm-form-select--error" : ""}`}
              value={form.reason}
              onChange={(e) => field("reason", e.target.value)}>
              <option value="">Select a reason…</option>
              {LEAVE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.reason && <span className="nx-tm-form-error">{errors.reason}</span>}
          </div>

          {/* Message */}
          <div className="nx-tm-form-group">
            <label className="nx-tm-form-label">Message</label>
            <textarea className="nx-tm-form-textarea" rows={4}
              placeholder="Add any additional details for your manager…"
              value={form.message}
              onChange={(e) => field("message", e.target.value)} />
          </div>

          {/* Attachments */}
          <div className="nx-tm-form-group">
            <label className="nx-tm-form-label">
              Attachment{" "}
              <span className="nx-tm-form-label-hint">(max 3 files)</span>
            </label>
            <div
              className={`nx-tm-upload-zone${isDragging ? " nx-tm-upload-zone--drag" : ""}${files.length >= 3 ? " nx-tm-upload-zone--full" : ""}`}
              onClick={() => files.length < 3 && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              style={{ cursor: files.length >= 3 ? "not-allowed" : "pointer" }}>
              <input ref={fileInputRef} type="file" multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFiles} style={{ display: "none" }} />
              <div className="nx-tm-upload-zone__icon-wrap">
                <Icon name="upload" size={18} />
              </div>
              <span className="nx-tm-upload-zone__text">
                {files.length >= 3 ? "Maximum files reached" : "Click or drag files here"}
              </span>
              <span className="nx-tm-upload-zone__hint">PDF, DOC, JPG, PNG — up to 3 files</span>
            </div>

            {files.length > 0 && (
              <ul className="nx-tm-file-list">
                {files.map((f, i) => (
                  <li key={i} className="nx-tm-file-row">
                    <div className="nx-tm-file-row__icon">
                      <Icon name="paperclip" size={13} />
                    </div>
                    <span className="nx-tm-file-row__name">{f.name}</span>
                    <button type="button" className="nx-tm-file-row__remove"
                      onClick={() => removeFile(i)} aria-label="Remove file">
                      <Icon name="x" size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="nx-tm-panel__footer">
          <button className="nx-tm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="nx-tm-btn-primary" onClick={handleSubmit}>
            <Icon name="check" size={14} />
            Submit Request
          </button>
        </footer>
      </div>
    </>
  );
}

// ─── Pending Requests Panel ────────────────────────────────────────────────

const STATUS_LABELS = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

function PendingRequestsPanel({ requests, onNewRequest }) {
  return (
    <section className="nx-card nx-tm-requests-panel">
      <header className="nx-tm-panel-header">
        <div>
          <h2 className="nx-tm-panel-title">Pending Requests</h2>
          <p className="nx-tm-panel-subtitle">Track and manage your leave submissions</p>
        </div>
        <button className="nx-tm-new-btn" onClick={onNewRequest}>
          <Icon name="calendar-plus" size={14} />
          New Request
        </button>
      </header>

      {requests.length === 0 ? (
        <div className="nx-tm-empty">
          <div className="nx-tm-empty__icon-wrap">
            <Icon name="calendar" size={32} />
          </div>
          <p className="nx-tm-empty__title">No pending requests</p>
          <p className="nx-tm-empty__sub">
            You're all caught up. Submit a new leave request anytime.
          </p>
          <button className="nx-tm-empty__cta" onClick={onNewRequest}>
            <Icon name="calendar-plus" size={14} />
            Create Request
          </button>
        </div>
      ) : (
        <>
          <div className="nx-tm-requests-head">
            <span>Status</span>
            <span>Leave Type</span>
            <span>Period</span>
            <span>Reason</span>
          </div>
          <ul className="nx-tm-requests-list">
            {requests.map((req) => (
              <li key={req.id} className="nx-tm-request-row">
                <span className={`nx-tm-badge nx-tm-badge--${req.status}`}>
                  {STATUS_LABELS[req.status]}
                </span>
                <span className="nx-tm-request-row__type">{req.leaveType}</span>
                <span className="nx-tm-request-row__dates">
                  {formatShortDate(req.dateFrom)} – {formatShortDate(req.dateTo)}
                </span>
                <span className="nx-tm-request-row__reason">{req.reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// ─── Quick Stats Bar ───────────────────────────────────────────────────────

const STAT_CONFIG = [
  { key: "totalLeavesThisYear", label: "Leaves Taken", icon: "calendar", accent: "blue", unit: "days" },
  { key: "remainingLeaves",     label: "Remaining",    icon: "check",    accent: "green", unit: "days" },
  { key: "daysAbsent",          label: "Days Absent",  icon: "clock",    accent: "amber", unit: "days" },
  { key: "avgWorkHours",        label: "Avg. Work Hrs", icon: "trending-up", accent: "violet", unit: "hrs/day" },
];

function QuickStatsBar() {
  return (
    <div className="nx-tm-stats-bar">
      {STAT_CONFIG.map((s) => (
        <div key={s.key} className={`nx-card nx-tm-stat-card nx-tm-stat-card--${s.accent}`}>
          <div className={`nx-tm-stat-card__icon nx-tm-stat-card__icon--${s.accent}`}>
            <Icon name={s.icon} size={15} />
          </div>
          <div className="nx-tm-stat-card__body">
            <span className="nx-tm-stat-card__value">{QUICK_STATS[s.key]}</span>
            <span className="nx-tm-stat-card__label">{s.label}</span>
            <span className="nx-tm-stat-card__unit">{s.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page Root ─────────────────────────────────────────────────────────────

export function TimeManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [defaultLeaveType, setDefaultLeaveType] = useState("");
  const [requests, setRequests] = useState(LEAVE_REQUESTS);

  const openSidebar = (leaveType = "") => {
    setDefaultLeaveType(leaveType);
    setSidebarOpen(true);
  };

  const handleNewRequest = (req) => {
    setRequests((prev) => [{ ...req, id: `lr${Date.now()}` }, ...prev]);
  };

  return (
    <>
      <div className="nx-col-main nx-grid-9">
        <QuickStatsBar />
        <PendingRequestsPanel requests={requests} onNewRequest={() => openSidebar()} />
        <AttendancePanel />
      </div>

      <div className="nx-col-side nx-grid-3">
        <HolidaysPanel />
        <LeaveBalancesPanel onApply={(leaveType) => openSidebar(leaveType)} />
      </div>

      {sidebarOpen && (
        <LeaveRequestSidebar
          defaultLeaveType={defaultLeaveType}
          onClose={() => setSidebarOpen(false)}
          onSubmit={handleNewRequest}
        />
      )}
    </>
  );
}
