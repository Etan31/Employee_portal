import { ME, ROSTER } from './people.js';

const TODAY = new Date();
const YESTERDAY = new Date(TODAY); YESTERDAY.setDate(YESTERDAY.getDate() - 1);
const TOMORROW = new Date(TODAY); TOMORROW.setDate(TOMORROW.getDate() + 1);
const NEXT_WEEK = new Date(TODAY); NEXT_WEEK.setDate(NEXT_WEEK.getDate() + 7);

export const TASKS = [
  {
    id: 't1',
    title: 'Review Q3 Performance Appraisals',
    description: 'Please review and sign off on the Q3 performance reviews for the engineering team.',
    status: 'OPEN',
    priority: 'HIGH',
    assigner: ROSTER[1],
    assignee: ME,
    createdDate: YESTERDAY.toISOString(),
    dueDate: TOMORROW.toISOString(),
  },
  {
    id: 't2',
    title: 'Update Employee Handbook',
    description: 'Incorporate the new remote work policy into section 4 of the handbook.',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assigner: ROSTER[0],
    assignee: ME,
    createdDate: YESTERDAY.toISOString(),
    dueDate: NEXT_WEEK.toISOString(),
  },
  {
    id: 't3',
    title: 'Onboarding Schedule for David',
    description: 'Finalize the first week meetings and IT setup for David Kim joining next week.',
    status: 'BLOCKED',
    priority: 'HIGH',
    assigner: ME,
    assignee: ROSTER[3],
    createdDate: YESTERDAY.toISOString(),
    dueDate: YESTERDAY.toISOString(), // Overdue
  },
  {
    id: 't4',
    title: 'Approve Expense Report',
    description: 'Team dinner expenses from the offsite event need approval.',
    status: 'OPEN',
    priority: 'LOW',
    assigner: ROSTER[2],
    assignee: ME,
    createdDate: TODAY.toISOString(),
    dueDate: NEXT_WEEK.toISOString(),
  },
  {
    id: 't5',
    title: 'Draft Q4 OKRs',
    description: 'Initial draft for HR department OKRs for the upcoming quarter.',
    status: 'DONE',
    priority: 'MEDIUM',
    assigner: ME,
    assignee: ROSTER[1],
    createdDate: new Date(TODAY.getTime() - 86400000 * 5).toISOString(),
    dueDate: TODAY.toISOString(),
  },
  {
    id: 't6',
    title: 'Schedule Diversity Training',
    description: 'Coordinate with the external vendor to schedule the Q4 diversity training sessions.',
    status: 'OPEN',
    priority: 'MEDIUM',
    assigner: ME,
    assignee: ROSTER[2],
    createdDate: TODAY.toISOString(),
    dueDate: NEXT_WEEK.toISOString(),
  },
  {
    id: 't7',
    title: 'Renew Healthcare Benefits',
    description: 'Review the updated premium costs and sign the renewal contract.',
    status: 'OPEN',
    priority: 'HIGH',
    assigner: ROSTER[0],
    assignee: ME,
    createdDate: new Date(TODAY.getTime() - 86400000 * 10).toISOString(),
    dueDate: YESTERDAY.toISOString(), // Overdue
  }
];
