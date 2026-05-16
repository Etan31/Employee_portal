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

export const HOLIDAYS = [
  { id: "h1", date: "2026-06-12", name: "Independence Day", type: "Holiday" },
  { id: "h2", date: "2026-08-21", name: "Ninoy Aquino Day", type: "National Holiday" },
  { id: "h3", date: "2026-08-31", name: "National Heroes Day", type: "National Holiday" },
  { id: "h4", date: "2026-11-01", name: "All Saints' Day", type: "National Holiday" },
  { id: "h5", date: "2026-11-02", name: "All Souls' Day", type: "National Holiday" },
  { id: "h6", date: "2026-12-25", name: "Christmas Day", type: "Holiday" },
  { id: "h7", date: "2026-12-30", name: "Rizal Day", type: "National Holiday" },
];

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

export const ATTENDANCE_MONTH = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const date = `2026-05-${String(day).padStart(2, "0")}`;
  const dayOfWeek = new Date(date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend) {
    return { label: String(day), date, loggedHours: 0, lateMinutes: 0, type: "weekend" };
  }
  const logged = 7.5 + Math.random() * 2;
  const late = Math.random() > 0.7 ? Math.floor(Math.random() * 30) : 0;
  return {
    label: String(day),
    date,
    loggedHours: Math.round(logged * 10) / 10,
    lateMinutes: late,
    type: "normal",
  };
});

export const QUICK_STATS = {
  totalLeavesThisYear: 3,
  remainingLeaves: 12,
  daysAbsent: 1,
  avgWorkHours: "9:06",
};
