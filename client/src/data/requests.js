// Tiles shown on the dashboard grid (user-customizable subset). `route` is set only
// for requests that map to a real page today; the rest are catalog entries the
// sidebar "Add to List" panel can surface without needing a dedicated page yet.
export const DEFAULT_REQUEST_IDS = ['leave', 'flow', 'letter', 'feedback', 'helpdesk', 'advance'];

export const REQUEST_TILES = [
  { id: 'leave', label: 'Apply Leave', icon: 'calendar-plus', color: 'blue', route: '#/time-management' },
  { id: 'flow', label: 'Initiate Flow', icon: 'workflow', color: 'sky' },
  { id: 'letter', label: 'Request Letter', icon: 'file-edit', color: 'amber' },
  { id: 'feedback', label: 'Request Feedback', icon: 'thumbs-up', color: 'violet' },
  { id: 'helpdesk', label: 'Raise Helpdesk Issue', icon: 'message-square', color: 'green', route: '#/helpdesk' },
  { id: 'advance', label: 'Create Advance', icon: 'receipt', color: 'red' },
];

// Full catalog of all available requests
export const ALL_REQUESTS = [
  { id: 'leave', label: 'Apply Leave', icon: 'calendar-plus', color: 'blue', route: '#/time-management' },
  { id: 'flow', label: 'Initiate Flow', icon: 'workflow', color: 'sky' },
  { id: 'letter', label: 'Request Letter', icon: 'file-edit', color: 'amber' },
  { id: 'feedback', label: 'Request Feedback', icon: 'thumbs-up', color: 'violet' },
  { id: 'helpdesk', label: 'Raise Helpdesk Issue', icon: 'message-square', color: 'green', route: '#/helpdesk' },
  { id: 'advance', label: 'Create Advance', icon: 'receipt', color: 'red' },
  { id: 'expense', label: 'Create Expense', icon: 'receipt', color: 'amber' },
  { id: 'separation', label: 'Initiate Separation', icon: 'file-text', color: 'red' },
  { id: 'checkin', label: 'Apply Checkin Request', icon: 'calendar', color: 'blue', route: '#/time-management' },
  { id: 'attendance', label: 'Apply Attendance Request', icon: 'calendar', color: 'sky', route: '#/time-management' },
  { id: 'shift', label: 'Apply Shift Change', icon: 'clock', color: 'violet' },
  { id: 'overtime', label: 'Apply Overtime', icon: 'clock', color: 'green' },
  { id: 'travel', label: 'Apply Travel Request', icon: 'plane', color: 'blue' },
  { id: 'training', label: 'Apply Training Request', icon: 'award', color: 'amber' },
];
