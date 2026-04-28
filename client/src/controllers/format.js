export function formatTime(date) {
  if (!date) return '--:--:--';
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', weekday: 'long' });
}

export function isOverdue(dueDateStr) {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
