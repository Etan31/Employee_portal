import { useState, useMemo } from 'react';
import './Profile.css';

const EMP = {
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

function tenureMonths() {
  const now = new Date();
  const [y, m, d] = EMP.joinedDate;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - m);
  if (now.getDate() < d) months--;
  return Math.max(0, months);
}

const IcMail = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IcPhone = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IcMap = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcCal = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcId = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const IcPencil = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcShare = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IcClock = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcTask = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);
const IcDoc = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IcReceipt = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2L18 4l-2-2-2 2-2-2-2 2-2-2-2 2z"/>
    <line x1="16" y1="10" x2="8" y2="10"/>
    <line x1="16" y1="14" x2="8" y2="14"/>
  </svg>
);
const IcExtLink = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IcSmiley = () => (
  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);

function DataGrid({ items }) {
  return (
    <div className="ph-data-grid">
      {items.map((item, i) => (
        <div key={i} className="ph-data-item">
          <span className="ph-data-label">{item.label}</span>
          <span className="ph-data-value">
            {item.value}
            {item.status && <span className="ph-status-tag">{item.status}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Pills({ options, active, onChange }) {
  return (
    <div className="ph-pills">
      {options.map(o => (
        <button
          key={o}
          className={`ph-pill${active === o ? ' ph-pill--active' : ''}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Profile() {
  const [mainTab, setMainTab]           = useState('Overview');
  const [overviewTab, setOverviewTab]   = useState('Profile Summary');
  const [personalTab, setPersonalTab]   = useState('Biographical');
  const [employmentTab, setEmploymentTab] = useState('Work & Role');
  const tenure = useMemo(() => tenureMonths(), []);

  return (
    <div className="ph-page">

      {/* ── Hero card ── */}
      <div className="ph-hero">
        <div className="ph-hero-banner" />
        <div className="ph-hero-body">
          <div className="ph-avatar">{EMP.initials}</div>
          <div className="ph-identity">
            <h1 className="ph-name">{EMP.name}</h1>
            <div className="ph-title-row">
              <span className="ph-position">{EMP.position}</span>
              <span className="ph-sept">·</span>
              <span className="ph-dept">{EMP.dept}</span>
              <span className="ph-sept">·</span>
              <span className="ph-company">{EMP.company}</span>
            </div>
            <div className="ph-meta-row">
              <span className="ph-meta-item"><IcMap />{EMP.location}</span>
              <span className="ph-meta-item"><IcCal />Joined {EMP.joined}</span>
              <span className="ph-meta-item"><IcId />{EMP.id}</span>
            </div>
          </div>
          <div className="ph-hero-actions">
            <button className="ph-btn ph-btn-ghost"><IcPencil />Edit Profile</button>
            <button className="ph-btn ph-btn-ghost"><IcShare />Share</button>
          </div>
        </div>
        <div className="ph-stats">
          <div className="ph-stat">
            <span className="ph-stat-val">{tenure}</span>
            <span className="ph-stat-label">Months Tenure</span>
          </div>
          <div className="ph-stat">
            <span className="ph-stat-val">IT</span>
            <span className="ph-stat-label">Department</span>
          </div>
          <div className="ph-stat">
            <span className="ph-stat-val">R&amp;F</span>
            <span className="ph-stat-label">Job Level</span>
          </div>
          <div className="ph-stat">
            <span className="ph-stat-val">0</span>
            <span className="ph-stat-label">Feedback</span>
          </div>
          <div className="ph-stat">
            <span className="ph-stat-val">{EMP.skills.length}</span>
            <span className="ph-stat-label">Skills</span>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="ph-layout">

        {/* Main tabs card */}
        <div className="ph-tabs-card">
          <div className="ph-tab-bar">
            {['Overview', 'Personal Details', 'Employment'].map(t => (
              <button
                key={t}
                className={`ph-tab${mainTab === t ? ' ph-tab--active' : ''}`}
                onClick={() => setMainTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Overview */}
          {mainTab === 'Overview' && (
            <div className="ph-section">
              <Pills options={['Profile Summary', 'Access & Privacy', 'About Me']} active={overviewTab} onChange={setOverviewTab} />
              {overviewTab === 'Profile Summary' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Profile Summary</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <DataGrid items={[
                    { label: 'Employee ID',      value: EMP.id },
                    { label: 'Email',            value: EMP.email },
                    { label: 'Department',       value: EMP.dept },
                    { label: 'Company',          value: EMP.company },
                    { label: 'Birthday',         value: EMP.birthday },
                    { label: 'Date of Joining',  value: EMP.joined },
                    { label: 'Office Location',  value: EMP.location },
                    { label: 'Work Assignment',  value: 'N/A' },
                  ]} />
                </>
              )}
              {overviewTab === 'Access & Privacy' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Access &amp; Privacy</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <DataGrid items={[
                    { label: 'Show Date of Birth Year', value: 'Yes' },
                    { label: 'Date of Birth Access',    value: 'Only Me' },
                    { label: 'Mobile Access OTP',       value: 'No' },
                  ]} />
                </>
              )}
              {overviewTab === 'About Me' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">About Me</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <DataGrid items={[
                    { label: 'Nickname', value: EMP.nickname },
                    { label: 'Religion', value: EMP.religion },
                    { label: 'Gender',   value: EMP.gender },
                  ]} />
                  <div className="ph-skills-section">
                    <span className="ph-data-label">Skills</span>
                    <div className="ph-chips">
                      {EMP.skills.map(s => <span key={s} className="ph-chip">{s}</span>)}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Personal Details */}
          {mainTab === 'Personal Details' && (
            <div className="ph-section">
              <Pills options={['Biographical', 'Contact', 'Address', 'Identity Numbers']} active={personalTab} onChange={setPersonalTab} />
              {personalTab === 'Biographical' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Biographical</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <DataGrid items={[
                    { label: 'First Name',   value: 'Tristan' },
                    { label: 'Last Name',    value: 'Tumbaga' },
                    { label: 'Middle Name',  value: 'Ehron A.' },
                    { label: 'Suffix',       value: 'N/A' },
                    { label: 'Nickname',     value: EMP.nickname },
                    { label: 'Gender',       value: EMP.gender },
                    { label: 'Birthday',     value: EMP.birthday },
                    { label: 'Religion',     value: EMP.religion },
                    { label: 'Spouse Name',  value: 'N/A' },
                    { label: 'Solo Parent',  value: 'N/A' },
                  ]} />
                </>
              )}
              {personalTab === 'Contact' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Contact</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <DataGrid items={[
                    { label: 'Personal Email',  value: EMP.personalEmail },
                    { label: 'Personal Mobile', value: EMP.phone },
                    { label: 'Office Mobile',   value: 'N/A' },
                  ]} />
                </>
              )}
              {personalTab === 'Address' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Current Address</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <DataGrid items={[
                    { label: 'House / Wing / Unit', value: 'West Parc Drive, Alabang' },
                    { label: 'Street / Locality',   value: 'Muntinlupa' },
                    { label: 'Landmark',            value: 'Alabang' },
                    { label: 'Country',             value: 'Philippines' },
                  ]} />
                </>
              )}
              {personalTab === 'Identity Numbers' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Identity Numbers</h2>
                    <button className="ph-edit-btn"><IcPencil />Edit</button>
                  </div>
                  <div className="ph-data-grid">
                    {[
                      { label: 'TIN',         value: EMP.tin },
                      { label: 'PhilHealth',  value: EMP.philhealth },
                      { label: 'Pag-IBIG MID', value: EMP.pagibig },
                      { label: 'SSS Number',  value: EMP.sss },
                    ].map((item, i) => (
                      <div key={i} className="ph-data-item">
                        <span className="ph-data-label">{item.label}</span>
                        <span className="ph-id-badge">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Employment */}
          {mainTab === 'Employment' && (
            <div className="ph-section">
              <Pills options={['Work & Role', 'Job Level', 'Office Location']} active={employmentTab} onChange={setEmploymentTab} />
              {employmentTab === 'Work & Role' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Work &amp; Role</h2>
                  </div>
                  <DataGrid items={[
                    { label: 'Group Company', value: EMP.company,  status: 'Current' },
                    { label: 'Department',    value: EMP.dept },
                    { label: 'Designation',   value: EMP.position },
                    { label: 'From – To',     value: 'March 9, 2026 – Present' },
                  ]} />
                </>
              )}
              {employmentTab === 'Job Level' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Job Level</h2>
                  </div>
                  <DataGrid items={[
                    { label: 'Job Level', value: EMP.jobLevel, status: 'Current' },
                    { label: 'From – To', value: 'March 9, 2026 – Present' },
                  ]} />
                </>
              )}
              {employmentTab === 'Office Location' && (
                <>
                  <div className="ph-section-head">
                    <h2 className="ph-section-title">Office Location</h2>
                  </div>
                  <DataGrid items={[
                    { label: 'Office Area',    value: 'PASCOR Drive',            status: 'Current' },
                    { label: 'Country',        value: 'Philippines' },
                    { label: 'State / Region', value: 'National Capital Region' },
                  ]} />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="ph-sidebar">

          {/* Contact card */}
          <div className="ph-side-card">
            <h3 className="ph-side-head">Contact</h3>
            <div className="ph-side-row">
              <span className="ph-side-icon"><IcMail /></span>
              <div>
                <div className="ph-side-row-label">Work Email</div>
                <div className="ph-side-row-val">{EMP.email}</div>
              </div>
            </div>
            <div className="ph-side-row">
              <span className="ph-side-icon"><IcPhone /></span>
              <div>
                <div className="ph-side-row-label">Phone</div>
                <div className="ph-side-row-val">{EMP.phone}</div>
              </div>
            </div>
            <div className="ph-side-row">
              <span className="ph-side-icon"><IcMap /></span>
              <div>
                <div className="ph-side-row-label">Location</div>
                <div className="ph-side-row-val">{EMP.location}</div>
              </div>
            </div>
          </div>

          {/* Quick Links card */}
          <div className="ph-side-card">
            <h3 className="ph-side-head">Quick Links</h3>
            <a href="#/time-management" className="ph-quick-link">
              <span className="ph-quick-link-icon"><IcClock /></span>
              <span className="ph-quick-link-label">Time &amp; Attendance</span>
              <IcExtLink />
            </a>
            <a href="#/task-box" className="ph-quick-link">
              <span className="ph-quick-link-icon"><IcTask /></span>
              <span className="ph-quick-link-label">My Tasks</span>
              <IcExtLink />
            </a>
            <a href="#/" className="ph-quick-link">
              <span className="ph-quick-link-icon"><IcDoc /></span>
              <span className="ph-quick-link-label">HR Documents</span>
              <IcExtLink />
            </a>
            <a href="#/" className="ph-quick-link">
              <span className="ph-quick-link-icon"><IcReceipt /></span>
              <span className="ph-quick-link-label">Payroll &amp; Benefits</span>
              <IcExtLink />
            </a>
          </div>

          {/* Feedback card */}
          <div className="ph-side-card">
            <h3 className="ph-side-head">Feedback</h3>
            <div className="ph-feedback-empty">
              <IcSmiley />
              <p>No feedback received yet.</p>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
