// Helpdesk seed data, shaped like the future Supabase "tickets" table.

export const TICKET_CATEGORIES = [
  { id: "it", label: "IT Support" },
  { id: "hr", label: "HR Question" },
  { id: "payroll", label: "Payroll" },
  { id: "facilities", label: "Facilities" },
  { id: "access", label: "Access Request" },
];

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved"];

export const TICKET_PRIORITIES = ["Low", "Medium", "High"];

export const TICKETS = [
  {
    id: "HD-1042",
    subject: "Laptop battery drains within an hour",
    categoryId: "it",
    status: "In Progress",
    priority: "High",
    createdAt: "2026-07-02",
    updatedAt: "2026-07-06",
  },
  {
    id: "HD-1039",
    subject: "PhilHealth deduction on June payslip looks incorrect",
    categoryId: "payroll",
    status: "Open",
    priority: "Medium",
    createdAt: "2026-06-30",
    updatedAt: "2026-06-30",
  },
  {
    id: "HD-1035",
    subject: "VPN access for approved remote work setup",
    categoryId: "access",
    status: "In Progress",
    priority: "Medium",
    createdAt: "2026-06-24",
    updatedAt: "2026-07-01",
  },
  {
    id: "HD-1031",
    subject: "Air conditioning issue at 4F workstations",
    categoryId: "facilities",
    status: "Resolved",
    priority: "Low",
    createdAt: "2026-06-17",
    updatedAt: "2026-06-20",
  },
  {
    id: "HD-1027",
    subject: "Request copy of Certificate of Employment",
    categoryId: "hr",
    status: "Resolved",
    priority: "Medium",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-12",
  },
];

export const FAQS = [
  {
    id: "faq-1",
    question: "How do I submit a leave request?",
    answer:
      "Go to the Time Management page and select New Request. Choose the leave type, dates, and recipients, then submit it for your manager's approval.",
  },
  {
    id: "faq-2",
    question: "Where can I check my remaining leave balance?",
    answer:
      "Your balances are on the Time Management page under Leave Balances. Each card shows days used and days remaining per leave type.",
  },
  {
    id: "faq-3",
    question: "How do I update my contact details?",
    answer:
      "Open the Profile page, go to Personal Details, then Contact, and use the Edit button to update your mobile number or personal email.",
  },
  {
    id: "faq-4",
    question: "Where do I find the list of company holidays?",
    answer:
      "The Calendar page shows Philippine public holidays alongside team leave, and the Time Management page lists your upcoming time off.",
  },
  {
    id: "faq-5",
    question: "When is 13th month pay released?",
    answer:
      "On or before December 24 each year. See the 13th Month Pay Guidelines on the HR Policies page for computation details.",
  },
  {
    id: "faq-6",
    question: "What should I do if my payslip looks incorrect?",
    answer:
      "File a Payroll ticket from this page with the payroll period and the line item in question. Payroll reviews discrepancies within three working days.",
  },
];
