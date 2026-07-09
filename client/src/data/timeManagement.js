import { PH_HOLIDAYS } from "./calendarEvents.js";

export const LEAVE_TYPES = [
  "Annual Leave",
  "Sick Leave",
  "Bereavement Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Leave without Pay",
];

export const LEAVE_REASONS = [
  "Medical Reason",
  "Family Commitment",
  "Personal Emergency",
  "Others",
];

export const RECIPIENTS = [
  { id: "r1", name: "Sarah Jenkins", role: "HR Manager" },
  { id: "r2", name: "Marcus Chen", role: "Direct Manager" },
  { id: "r3", name: "Elena Rodriguez", role: "HR Partner" },
];

export const LEAVE_REQUESTS = [
  {
    id: "lr1",
    leaveType: "Annual Leave",
    recipients: [{ id: "r2", name: "Marcus Chen", role: "Direct Manager" }],
    dateFrom: "2026-05-20",
    dateTo: "2026-05-23",
    reason: "Personal Emergency",
    message: "Family matter requiring travel out of town.",
    attachments: [],
    status: "pending",
  },
  {
    id: "lr2",
    leaveType: "Sick Leave",
    recipients: [{ id: "r1", name: "Sarah Jenkins", role: "HR Manager" }],
    dateFrom: "2026-05-06",
    dateTo: "2026-05-07",
    reason: "Medical Reason",
    message: "Recovering from a respiratory infection, doctor advised bed rest.",
    attachments: ["medical_certificate.pdf"],
    status: "approved",
  },
  {
    id: "lr3",
    leaveType: "Annual Leave",
    recipients: [{ id: "r2", name: "Marcus Chen", role: "Direct Manager" }],
    dateFrom: "2026-04-14",
    dateTo: "2026-04-14",
    reason: "Family Commitment",
    message: "Attending a family event.",
    attachments: [],
    status: "rejected",
  },
];

// Single source of truth: derive the upcoming-holidays panel from the shared
// calendar dataset instead of maintaining a second, overlapping list.
const todayStr = new Date().toISOString().slice(0, 10);
export const HOLIDAYS = PH_HOLIDAYS.filter((h) => h.date >= todayStr)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((h) => ({ id: h.id, date: h.date, name: h.title, type: "Public Holiday" }));

export const LEAVE_BALANCES = [
  { id: "lb1", label: "Annual Leave", total: 15, used: 3, color: "blue" },
  { id: "lb2", label: "Sick Leave", total: 10, used: 1, color: "amber" },
  { id: "lb3", label: "Bereavement Leave", total: 3, used: 0, color: "violet" },
  { id: "lb4", label: "Leave without Pay", total: 9, used: 0, color: "green" },
];

export const ATTENDANCE_WEEK = [
  { label: "9 May", date: "2026-05-09", loggedHours: 8.5, lateMinutes: 0, type: "weekend" },
  { label: "10", date: "2026-05-10", loggedHours: 0, lateMinutes: 0, type: "weekend" },
  { label: "11", date: "2026-05-11", loggedHours: 9.2, lateMinutes: 0, type: "normal" },
  { label: "12", date: "2026-05-12", loggedHours: 2.8, lateMinutes: 0, type: "leave" },
  { label: "13", date: "2026-05-13", loggedHours: 3.5, lateMinutes: 0, type: "normal" },
  { label: "14", date: "2026-05-14", loggedHours: 8.93, lateMinutes: 4, type: "normal" },
  { label: "15", date: "2026-05-15", loggedHours: 8.5, lateMinutes: 0, type: "normal" },
];

// Deterministic day-index pattern (no randomness) so the monthly series stays
// stable across reloads instead of reshuffling every time the module loads.
const HOURS_PATTERN = [8.1, 8.6, 7.9, 9.0, 8.3, 8.8, 7.6, 9.2, 8.4, 8.0];
const LATE_MINUTES_BY_DAY = { 3: 12, 9: 5, 14: 20, 22: 8, 27: 15 };

export const ATTENDANCE_MONTH = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const date = `2026-05-${String(day).padStart(2, "0")}`;
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) {
    return { label: String(day), date, loggedHours: 0, lateMinutes: 0, type: "weekend" };
  }
  return {
    label: String(day),
    date,
    loggedHours: HOURS_PATTERN[day % HOURS_PATTERN.length],
    lateMinutes: LATE_MINUTES_BY_DAY[day] || 0,
    type: "normal",
  };
});

export const QUICK_STATS = {
  totalLeavesThisYear: 3,
  remainingLeaves: 12,
  daysAbsent: 1,
  avgWorkHours: "9:06",
};

// Quick-stats bar tile config: which QUICK_STATS key each tile reads, its icon/accent/unit.
export const QUICK_STAT_CONFIG = [
  { key: "totalLeavesThisYear", label: "Leaves Taken", icon: "calendar", accent: "blue", unit: "days" },
  { key: "remainingLeaves", label: "Remaining", icon: "check", accent: "green", unit: "days" },
  { key: "daysAbsent", label: "Days Absent", icon: "clock", accent: "amber", unit: "days" },
  { key: "avgWorkHours", label: "Avg. Work Hrs", icon: "trending-up", accent: "violet", unit: "hrs/day" },
];

// Attendance panel summary tiles (avg duration/late/overtime).
export const ATTENDANCE_METRICS = [
  { label: "Avg. Work Duration", value: "9:06:00", accent: "blue" },
  { label: "Avg. Late By", value: "00:04:00", accent: "orange" },
  { label: "Avg. Overtime", value: "00:00:00", accent: "green" },
];

// Attendance chart legend swatches.
export const ATTENDANCE_LEGEND = [
  { cls: "gray", label: "Weekly Off / Holiday / Leave" },
  { cls: "blue", label: "Logged Hours" },
  { cls: "orange", label: "Late By" },
];
