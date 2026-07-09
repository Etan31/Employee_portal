// Mirrors the Supabase preferences schema (v1/003 + v1/004 migrations) so the
// Settings page can swap to live tables later without reshaping:
// notification_categories, notification_events, date/time/timezone option tables.
// Events are a curated portal-relevant subset of the seeded set (exact codes kept).

export const NOTIFICATION_CATEGORIES = [
  { id: 1, name: "HR Docs" },
  { id: 2, name: "Recognition" },
  { id: 3, name: "Attendance" },
  { id: 4, name: "Task Delegation" },
  { id: 5, name: "Leave" },
  { id: 6, name: "Other" },
];

export const NOTIFICATION_EVENTS = [
  // HR Docs
  { id: 1, categoryId: 1, code: "hr_docs_letter_generated_emailed", description: "HR letter is generated and emailed to you", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  { id: 2, categoryId: 1, code: "hr_docs_policy_signoff_due", description: "Policy sign-off task crosses its due date", hasEmail: true, hasEmailCc: true, hasMobile: true, hasBell: false },
  { id: 3, categoryId: 1, code: "hr_docs_letter_approved", description: "Your requested letter is approved", hasEmail: true, hasEmailCc: true, hasMobile: true, hasBell: false },
  { id: 4, categoryId: 1, code: "hr_docs_letter_rejected", description: "Your requested letter is rejected", hasEmail: true, hasEmailCc: true, hasMobile: true, hasBell: false },
  // Recognition
  { id: 5, categoryId: 2, code: "recog_points_received", description: "You receive recognition points from another user", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: true },
  { id: 6, categoryId: 2, code: "recog_program_assigned", description: "A recognition program is assigned to you", hasEmail: true, hasEmailCc: true, hasMobile: true, hasBell: true },
  // Attendance
  { id: 7, categoryId: 3, code: "attendance_checkin_reminder", description: "Check-in reminder", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  { id: 8, categoryId: 3, code: "attendance_checkout_reminder", description: "Checkout reminder", hasEmail: false, hasEmailCc: false, hasMobile: true, hasBell: false },
  { id: 9, categoryId: 3, code: "attendance_request_approved", description: "Your attendance request is approved", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  { id: 10, categoryId: 3, code: "attendance_new_shift_assigned", description: "A new shift is assigned to you", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  // Task Delegation
  { id: 11, categoryId: 4, code: "delegation_task_delegated", description: "A task has been delegated to you", hasEmail: true, hasEmailCc: true, hasMobile: true, hasBell: false },
  { id: 12, categoryId: 4, code: "delegation_rule_created", description: "A delegation rule naming you is created", hasEmail: true, hasEmailCc: true, hasMobile: true, hasBell: true },
  // Leave
  { id: 13, categoryId: 5, code: "leave_applied", description: "An employee applies for leave naming you as recipient", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  { id: 14, categoryId: 5, code: "leave_request_acknowledged", description: "Your leave request is acknowledged", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  { id: 15, categoryId: 5, code: "leave_optional_holiday_response", description: "Manager responds to an optional holiday request", hasEmail: true, hasEmailCc: true, hasMobile: false, hasBell: false },
  // Other
  { id: 16, categoryId: 6, code: "vibe_network_birthday", description: "Someone in your network has a birthday", hasEmail: false, hasEmailCc: false, hasMobile: true, hasBell: true },
  { id: 17, categoryId: 6, code: "vibe_network_work_anniversary", description: "Work anniversary in your network", hasEmail: false, hasEmailCc: false, hasMobile: true, hasBell: true },
];

// Mirrors date_format_options / time_format_options / timezone_options lookups.
export const DATE_FORMAT_OPTIONS = [
  { id: 1, formatCode: "DD-MM-YYYY", example: "01-09-2026" },
  { id: 2, formatCode: "MM-DD-YYYY", example: "09-01-2026" },
  { id: 3, formatCode: "MMM-DD-YYYY", example: "Sep-01-2026" },
  { id: 4, formatCode: "YYYY-MM-DD", example: "2026-09-01" },
  { id: 5, formatCode: "YYYY-MMM-DD", example: "2026-Sep-01" },
  { id: 6, formatCode: "DD/MM/YYYY", example: "01/09/2026" },
];

export const TIME_FORMAT_OPTIONS = [
  { id: 1, formatCode: "24h", label: "24-hour - 18:45:00" },
  { id: 2, formatCode: "12h", label: "12-hour - 6:45:00 PM" },
];

export const TIMEZONE_OPTIONS = [
  { id: 1, tzCode: "Asia/Manila", label: "(UTC+08:00) Asia/Manila Singapore Standard Time", utcOffset: 480 },
  { id: 2, tzCode: "Asia/Singapore", label: "(UTC+08:00) Asia/Singapore Singapore Standard Time", utcOffset: 480 },
  { id: 3, tzCode: "Africa/Harare", label: "(UTC+02:00) Harare, Pretoria", utcOffset: 120 },
  { id: 4, tzCode: "Asia/Colombo", label: "(UTC+05:30) Sri Jayawardenepura", utcOffset: 330 },
  { id: 5, tzCode: "Asia/Taipei", label: "(UTC+08:00) Taipei", utcOffset: 480 },
];

export const DEFAULT_DATETIME_PREFS = {
  dateFormatId: 1,
  timeFormatId: 1,
  timezoneId: 1,
};

// localStorage keys for persisted preferences (client-side prefs, not server state)
export const SETTINGS_STORAGE_KEYS = {
  notifications: "nx:prefs:notifications",
  datetime: "nx:prefs:datetime",
};
