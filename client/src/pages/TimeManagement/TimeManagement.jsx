import React, { useState, useRef, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

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

// ─── Attendance Chart (Chart.js) ──────────────────────────────────────────

function AttendanceChart({ data, viewMode }) {
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    []
  );

  // Inline plugin — shades non-working day columns before drawing
  const dayTypeBgPlugin = useMemo(
    () => ({
      id: "nx-day-type-bg",
      beforeDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!chartArea || !scales.x) return;
        const n = data.length;
        const colW = (chartArea.right - chartArea.left) / n;
        data.forEach((d, i) => {
          if (d.type === "normal") return;
          ctx.save();
          ctx.fillStyle =
            d.type === "leave"
              ? "rgba(245,158,11,0.07)"
              : "rgba(148,163,184,0.07)";
          ctx.fillRect(
            chartArea.left + i * colW,
            chartArea.top,
            colW,
            chartArea.height
          );
          ctx.restore();
        });
      },
    }),
    [data]
  );

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: "Work Hours",
          data: data.map((d) => (d.type === "normal" ? d.loggedHours : null)),
          borderColor: "#2563eb",
          backgroundColor(context) {
            const { ctx, chartArea } = context.chart;
            if (!chartArea) return "rgba(37,99,235,0.08)";
            const grad = ctx.createLinearGradient(
              0, chartArea.top, 0, chartArea.bottom
            );
            grad.addColorStop(0, "rgba(37,99,235,0.15)");
            grad.addColorStop(0.65, "rgba(37,99,235,0.04)");
            grad.addColorStop(1, "rgba(37,99,235,0.00)");
            return grad;
          },
          fill: true,
          tension: viewMode === "month" ? 0.45 : 0.32,
          pointRadius: data.map((d) =>
            d.type === "normal" ? (viewMode === "week" ? 5 : 2.5) : 0
          ),
          pointHoverRadius: 7,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2.5,
          borderWidth: 2.5,
          spanGaps: false,
        },
        {
          label: "Late (hours)",
          data: data.map((d) =>
            d.type === "normal" && d.lateMinutes > 0
              ? +(d.lateMinutes / 60).toFixed(3)
              : null
          ),
          borderColor: "#f59e0b",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.3,
          pointRadius: data.map((d) =>
            d.lateMinutes > 0 ? (viewMode === "week" ? 6 : 3.5) : 0
          ),
          pointHoverRadius: 8,
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 2,
          borderDash: [5, 4],
          spanGaps: false,
        },
      ],
    }),
    [data, viewMode]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion
        ? false
        : { duration: 550, easing: "easeOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1e293b",
          titleColor: "#ffffff",
          bodyColor: "rgba(255,255,255,0.82)",
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          padding: { x: 12, y: 9 },
          cornerRadius: 9,
          usePointStyle: true,
          boxWidth: 7,
          boxHeight: 7,
          titleFont: {
            size: 11.5,
            weight: "700",
            family: '"Plus Jakarta Sans", system-ui',
          },
          bodyFont: {
            size: 11.5,
            family: '"Plus Jakarta Sans", system-ui',
          },
          callbacks: {
            title: (items) => data[items[0].dataIndex]?.date ?? "",
            label(item) {
              const d = data[item.dataIndex];
              if (item.datasetIndex === 0) {
                if (d.type === "weekend") return " Weekend / Day Off";
                if (d.type === "leave") return " On Leave";
                if (item.raw != null) return ` Worked: ${d.loggedHours}h`;
              }
              if (item.datasetIndex === 1 && item.raw != null) {
                return ` Late: ${d.lateMinutes} min`;
              }
              return null;
            },
            labelColor(item) {
              return item.datasetIndex === 0
                ? { backgroundColor: "#2563eb", borderColor: "#2563eb", borderRadius: 3 }
                : { backgroundColor: "#f59e0b", borderColor: "#f59e0b", borderRadius: 3 };
            },
            filter: (item) => item.raw != null,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            maxRotation: 0,
            font: { size: 10.5, family: '"Plus Jakarta Sans", system-ui' },
            color: "#94a3b8",
            padding: 8,
            callback(value, index) {
              if (viewMode === "week") return data[index]?.label ?? "";
              return index % 5 === 0 ? data[index]?.label ?? "" : "";
            },
          },
        },
        y: {
          grid: { color: "rgba(0,0,0,0.04)" },
          border: { display: false, dash: [3, 3] },
          min: 0,
          max: 12,
          ticks: {
            font: { size: 10.5, family: '"Plus Jakarta Sans", system-ui' },
            color: "#94a3b8",
            stepSize: 2,
            callback: (v) => `${v}h`,
            padding: 8,
          },
        },
      },
    }),
    [data, viewMode, prefersReducedMotion]
  );

  return (
    <div className="nx-tm-chart-wrapper">
      <div className="nx-tm-chart-canvas-wrap">
        <Line
          data={chartData}
          options={options}
          plugins={[dayTypeBgPlugin]}
        />
      </div>
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
