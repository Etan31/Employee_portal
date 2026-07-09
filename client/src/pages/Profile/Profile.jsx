import { useState, useMemo } from 'react';
import { EMPLOYEE_PROFILE as EMP, tenureMonths } from '../../data/profileData.js';
import { useAuth } from '../../hooks/auth.hooks.jsx';
import { updateUserProfile } from '../../api/auth.api.js';
import { logError } from '../../utils/logger.js';
import './Profile.css';

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
const IcSettings = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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

/* First/last name are the only fields the real `profiles` table backs today
   (see supabase/migrations/v2/002_profiles.schema.sql) — this edits just those. */
function EditProfileForm({ initialFirst, initialLast, onCancel, onSaved }) {
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setError('');
    try {
      await updateUserProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      await refreshProfile();
      onSaved();
    } catch (err) {
      logError('Profile update failed:', err);
      setError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ph-edit-form">
      <div className="ph-edit-form__row">
        <label className="ph-edit-form__field">
          <span>First Name</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="ph-edit-form__field">
          <span>Last Name</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
      </div>
      {error && <p className="ph-edit-form__error">{error}</p>}
      <div className="ph-edit-form__actions">
        <button className="ph-btn ph-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="ph-btn ph-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function Profile() {
  const { user, profile } = useAuth();
  const [mainTab, setMainTab]           = useState('Overview');
  const [overviewTab, setOverviewTab]   = useState('Profile Summary');
  const [personalTab, setPersonalTab]   = useState('Biographical');
  const [employmentTab, setEmploymentTab] = useState('Work & Role');
  const [isEditing, setIsEditing] = useState(false);
  const tenure = useMemo(() => tenureMonths(), []);

  const firstName = profile?.first_name ?? EMP.name.split(' ')[0];
  const lastName = profile?.last_name ?? EMP.name.split(' ').slice(-1)[0];
  const displayName = (profile?.first_name || profile?.last_name)
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : EMP.name;
  const initials = (profile?.first_name || profile?.last_name)
    ? `${(profile.first_name || '')[0] || ''}${(profile.last_name || '')[0] || ''}`.toUpperCase() || EMP.initials
    : EMP.initials;
  const workEmail = user?.email || EMP.email;

  return (
    <div className="ph-page">

      {/* ── Hero card ── */}
      <div className="ph-hero">
        <div className="ph-hero-banner" />
        <div className="ph-hero-body">
          <div className="ph-avatar">{initials}</div>
          <div className="ph-identity">
            <h1 className="ph-name">{displayName}</h1>
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
            <button className="ph-btn ph-btn-ghost" onClick={() => setIsEditing((v) => !v)}>
              <IcPencil />{isEditing ? 'Close' : 'Edit Profile'}
            </button>
          </div>
        </div>
        {isEditing && (
          <EditProfileForm
            initialFirst={firstName}
            initialLast={lastName}
            onCancel={() => setIsEditing(false)}
            onSaved={() => setIsEditing(false)}
          />
        )}
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
                  </div>
                  <DataGrid items={[
                    { label: 'Employee ID',      value: EMP.id },
                    { label: 'Email',            value: workEmail },
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
                  </div>
                  <DataGrid items={[
                    { label: 'First Name',   value: firstName },
                    { label: 'Last Name',    value: lastName },
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
                <div className="ph-side-row-val">{workEmail}</div>
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
            <a href="#/hr-policies" className="ph-quick-link">
              <span className="ph-quick-link-icon"><IcDoc /></span>
              <span className="ph-quick-link-label">HR Policies</span>
              <IcExtLink />
            </a>
            <a href="#/settings" className="ph-quick-link">
              <span className="ph-quick-link-icon"><IcSettings /></span>
              <span className="ph-quick-link-label">Settings</span>
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
