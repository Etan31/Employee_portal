// HR policy library seed data, shaped like the future Supabase "policies" table.

export const POLICY_CATEGORIES = [
  { id: "conduct", label: "Code of Conduct" },
  { id: "leave", label: "Leave & Attendance" },
  { id: "compensation", label: "Compensation & Benefits" },
  { id: "it-security", label: "IT & Security" },
  { id: "health-safety", label: "Health & Safety" },
  { id: "remote-work", label: "Remote Work" },
];

export const POLICIES = [
  {
    id: "pol-001",
    title: "Employee Code of Conduct",
    summary:
      "Standards of professional behavior, integrity, and respect expected of every Nexus employee.",
    categoryId: "conduct",
    updatedAt: "2026-03-16",
    owner: "HR Operations",
    version: "v3.2",
    acknowledgementRequired: true,
  },
  {
    id: "pol-002",
    title: "Anti-Sexual Harassment Policy",
    summary:
      "Prevention, reporting, and resolution of workplace harassment in compliance with the Safe Spaces Act (RA 11313).",
    categoryId: "conduct",
    updatedAt: "2025-11-08",
    owner: "HR Operations",
    version: "v2.0",
    acknowledgementRequired: true,
  },
  {
    id: "pol-003",
    title: "Conflict of Interest and Gifts",
    summary:
      "Rules on disclosing personal interests and accepting gifts from clients, suppliers, and partners.",
    categoryId: "conduct",
    updatedAt: "2025-09-22",
    owner: "Legal & Compliance",
    version: "v1.4",
    acknowledgementRequired: false,
  },
  {
    id: "pol-004",
    title: "Leave Application and Approval",
    summary:
      "How to file vacation, sick, and emergency leave, including approval routing and notice periods.",
    categoryId: "leave",
    updatedAt: "2026-05-04",
    owner: "HR Operations",
    version: "v4.1",
    acknowledgementRequired: false,
  },
  {
    id: "pol-005",
    title: "Attendance, Tardiness, and Undertime",
    summary:
      "Work schedules, grace periods, and the corrective steps applied to habitual tardiness or undertime.",
    categoryId: "leave",
    updatedAt: "2026-02-10",
    owner: "HR Operations",
    version: "v2.3",
    acknowledgementRequired: true,
  },
  {
    id: "pol-006",
    title: "Service Incentive and Special Leaves",
    summary:
      "Coverage of service incentive leave plus maternity, paternity, solo parent, and bereavement entitlements.",
    categoryId: "leave",
    updatedAt: "2026-01-19",
    owner: "HR Operations",
    version: "v3.0",
    acknowledgementRequired: false,
  },
  {
    id: "pol-007",
    title: "13th Month Pay Guidelines",
    summary:
      "Computation and release schedule of 13th month pay in accordance with Presidential Decree 851.",
    categoryId: "compensation",
    updatedAt: "2025-12-01",
    owner: "Payroll",
    version: "v1.8",
    acknowledgementRequired: false,
  },
  {
    id: "pol-008",
    title: "SSS, PhilHealth, and Pag-IBIG Contributions",
    summary:
      "How statutory government contributions are computed, deducted, and remitted each payroll cycle.",
    categoryId: "compensation",
    updatedAt: "2026-04-14",
    owner: "Payroll",
    version: "v2.6",
    acknowledgementRequired: false,
  },
  {
    id: "pol-009",
    title: "Overtime, Night Differential, and Holiday Pay",
    summary:
      "Premium pay rates for authorized overtime, night shift work, and regular or special non-working holidays.",
    categoryId: "compensation",
    updatedAt: "2026-03-02",
    owner: "Payroll",
    version: "v3.1",
    acknowledgementRequired: false,
  },
  {
    id: "pol-010",
    title: "Acceptable Use of IT Assets",
    summary:
      "Proper use of company laptops, email, software licenses, and network resources.",
    categoryId: "it-security",
    updatedAt: "2026-06-09",
    owner: "IT Security",
    version: "v5.0",
    acknowledgementRequired: true,
  },
  {
    id: "pol-011",
    title: "Data Privacy Policy",
    summary:
      "Handling of employee and customer personal data under the Data Privacy Act of 2012 (RA 10173).",
    categoryId: "it-security",
    updatedAt: "2026-05-27",
    owner: "Legal & Compliance",
    version: "v2.2",
    acknowledgementRequired: true,
  },
  {
    id: "pol-012",
    title: "Password and Account Security Standard",
    summary:
      "Password strength, multi-factor authentication, and account lockout requirements for all company systems.",
    categoryId: "it-security",
    updatedAt: "2026-02-23",
    owner: "IT Security",
    version: "v1.6",
    acknowledgementRequired: false,
  },
  {
    id: "pol-013",
    title: "Typhoon and Calamity Response",
    summary:
      "Work suspension rules during PAGASA storm signals, calamity leave, and employee safety protocols.",
    categoryId: "health-safety",
    updatedAt: "2026-06-30",
    owner: "HR Operations",
    version: "v2.4",
    acknowledgementRequired: false,
  },
  {
    id: "pol-014",
    title: "Workplace Health and Emergency Preparedness",
    summary:
      "First aid stations, fire and earthquake drills, and health protocols across all office locations.",
    categoryId: "health-safety",
    updatedAt: "2025-10-13",
    owner: "Facilities",
    version: "v1.9",
    acknowledgementRequired: false,
  },
  {
    id: "pol-015",
    title: "Hybrid and Remote Work Policy",
    summary:
      "Eligibility, core hours, equipment support, and security requirements for remote work arrangements.",
    categoryId: "remote-work",
    updatedAt: "2026-04-06",
    owner: "HR Operations",
    version: "v3.3",
    acknowledgementRequired: true,
  },
];
