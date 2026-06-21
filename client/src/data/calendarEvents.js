export const PH_HOLIDAYS = [
  { id: 'h1',  title: "New Year's Day",             date: '2026-01-01' },
  { id: 'h2',  title: 'EDSA People Power Revolution', date: '2026-02-25' },
  { id: 'h3',  title: 'Maundy Thursday',             date: '2026-04-02' },
  { id: 'h4',  title: 'Good Friday',                 date: '2026-04-03' },
  { id: 'h5',  title: 'Araw ng Kagitingan',          date: '2026-04-09' },
  { id: 'h6',  title: 'Labor Day',                   date: '2026-05-01' },
  { id: 'h7',  title: 'Independence Day',            date: '2026-06-12' },
  { id: 'h8',  title: 'Ninoy Aquino Day',            date: '2026-08-21' },
  { id: 'h9',  title: 'National Heroes Day',         date: '2026-08-31' },
  { id: 'h10', title: "All Saints' Day",             date: '2026-11-01' },
  { id: 'h11', title: 'Bonifacio Day',               date: '2026-11-30' },
  { id: 'h12', title: 'Immaculate Conception',       date: '2026-12-08' },
  { id: 'h13', title: 'Christmas Day',               date: '2026-12-25' },
  { id: 'h14', title: 'Rizal Day',                   date: '2026-12-30' },
];

export const LEAVE_EVENTS = [
  // May 2026
  { id: 'l1',  person: 'Ma. Xena Jalapa Dia',    team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-05-05', endDate: '2026-05-05' },
  { id: 'l2',  person: 'Marty C. Paraiso',        team: 'sales', isMe: false, status: 'sick',     leaveType: 'Sick Leave',     startDate: '2026-05-08', endDate: '2026-05-08' },
  { id: 'l3',  person: 'Jonathan M. Cruz',         team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-05-11', endDate: '2026-05-11' },
  { id: 'l4',  person: 'Jordan Badilla Moise',    team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-05-15', endDate: '2026-05-15' },
  { id: 'l5',  person: 'Tristan Ehron A. Tum',    team: 'hr',    isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-05-15', endDate: '2026-05-15' },
  { id: 'l6',  person: 'Rose-Ann P. Magudd',      team: 'sales', isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-05-16', endDate: '2026-05-16' },
  // June 2026
  { id: 'l7',  person: 'Ma. Xena Jalapa Dia',    team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-06-03', endDate: '2026-06-04' },
  { id: 'l8',  person: 'Marty C. Paraiso',        team: 'sales', isMe: false, status: 'pending',  leaveType: 'Vacation Leave', startDate: '2026-06-08', endDate: '2026-06-09' },
  { id: 'l9',  person: 'Jonathan M. Cruz',         team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-06-10', endDate: '2026-06-11' },
  { id: 'l10', person: 'Rose-Ann P. Magudd',      team: 'sales', isMe: false, status: 'sick',     leaveType: 'Sick Leave',     startDate: '2026-06-16', endDate: '2026-06-16' },
  { id: 'l11', person: 'Aria Reyes',              team: 'hr',    isMe: true,  status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-06-22', endDate: '2026-06-23' },
  { id: 'l12', person: 'Jordan Badilla Moise',    team: 'ops',   isMe: false, status: 'pending',  leaveType: 'Vacation Leave', startDate: '2026-06-24', endDate: '2026-06-24' },
  { id: 'l13', person: 'Tristan Ehron A. Tum',    team: 'hr',    isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-06-25', endDate: '2026-06-26' },
  // July 2026
  { id: 'l14', person: 'Ma. Xena Jalapa Dia',    team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-07-06', endDate: '2026-07-07' },
  { id: 'l15', person: 'Eilene Pedria Rufin',     team: 'sales', isMe: false, status: 'pending',  leaveType: 'Vacation Leave', startDate: '2026-07-14', endDate: '2026-07-16' },
  { id: 'l16', person: 'Pejay Valdez Viray',      team: 'ops',   isMe: false, status: 'approved', leaveType: 'Vacation Leave', startDate: '2026-07-21', endDate: '2026-07-22' },
];

export const ANNIVERSARY_EVENTS = [
  { id: 'a1', person: 'Pejay Valdez Viray',   years: 3, date: '2026-05-06' },
  { id: 'a2', person: 'Eilene Pedria Rufin',  years: 5, date: '2026-05-06' },
  { id: 'a3', person: 'Rose-Ann P. Magudd',   years: 4, date: '2026-06-28' },
  { id: 'a4', person: 'Jordan Badilla Moise', years: 2, date: '2026-07-20' },
  { id: 'a5', person: 'Jonathan M. Cruz',      years: 1, date: '2026-08-05' },
];

export const BIRTHDAY_EVENTS = [
  { id: 'b1', person: 'Pejay Valdez Viray',   date: '2026-06-18' },
  { id: 'b2', person: 'Jonathan M. Cruz',      date: '2026-06-27' },
  { id: 'b3', person: 'Ma. Xena Jalapa Dia',  date: '2026-07-12' },
  { id: 'b4', person: 'Marty C. Paraiso',      date: '2026-07-29' },
  { id: 'b5', person: 'Rose-Ann P. Magudd',   date: '2026-08-14' },
  { id: 'b6', person: 'Tristan Ehron A. Tum', date: '2026-09-03' },
];
