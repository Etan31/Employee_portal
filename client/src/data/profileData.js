// Sample employee record. Only name/email are backed by the real `profiles`
// table today (see supabase/migrations/v2/002_profiles.schema.sql) — everything
// else here stands in for fields the schema doesn't have yet.
export const EMPLOYEE_PROFILE = {
  name: 'Tristan Ehron A. Tumbaga',
  initials: 'TE',
  position: 'Junior Programmer',
  dept: 'Information Technology',
  company: 'Delbros Leasing',
  id: 'D-0030226-01011',
  email: 'tatumbaga@delbros.com',
  personalEmail: 'tristan.ehron.tumbaga@gmail.com',
  phone: '+63 963 071 9746',
  location: 'PASCOR Drive, Paranaque, Metro Manila',
  joined: 'March 9, 2026',
  joinedDate: [2026, 2, 9],
  birthday: 'May 31, 2002',
  jobLevel: 'Rank & File',
  religion: 'Catholic',
  gender: 'Male',
  nickname: 'Etan',
  tin: '669-080-885',
  philhealth: '132502029014',
  pagibig: '121356480612',
  sss: '3534927588',
  skills: ['Word', 'Excel', 'Outlook', 'PowerPoint', 'Cloud Networking', 'File Sharing', 'Microsoft Excel (Advanced)'],
};

export function tenureMonths(joinedDate = EMPLOYEE_PROFILE.joinedDate) {
  const now = new Date();
  const [y, m, d] = joinedDate;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - m);
  if (now.getDate() < d) months--;
  return Math.max(0, months);
}
