import React, { useState } from 'react';
import { Icon } from '../../components/Icon/Icon.jsx';
import { useTabs } from '../../../controllers/useTabs.js';
import { PROFILE_DATA } from '../../../models/profileData.js';
import { FEEDBACK_DATA } from '../../../models/feedbackData.js';
import './Profile.css';

/* ── Feedback Card Component ── */
function FeedbackCard() {
  const hasFeedback = FEEDBACK_DATA.length > 0;

  return (
    <section className="nx-card nx-feedback-card">
      <header className="nx-profile-card__header">
        <h3 className="nx-profile-card__title">Feedback</h3>
      </header>
      
      {hasFeedback ? (
        <ul className="nx-feedback-list">
          {FEEDBACK_DATA.map(item => (
            <li key={item.id}>
              <article className="nx-feedback-item">
                {/* feedback items here */}
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="nx-feedback-empty">
          <img 
            src="/feedback_empty.png" 
            alt="No feedback yet" 
            className="nx-feedback-illustration" 
          />
          <p className="nx-feedback-empty-text">No feedback received, yet!</p>
        </div>
      )}
    </section>
  );
}

/* ── Data Section Component ── */
function DataSection({ title, data, showEdit = true }) {
  return (
    <section className="nx-card nx-profile-card">
      <header className="nx-profile-card__header">
        <h3 className="nx-profile-card__title">{title}</h3>
        {showEdit && (
          <button className="nx-header__btn" title="Edit">
            <Icon name="pencil" size={16} />
          </button>
        )}
      </header>
      <ul className="nx-data-grid">
        {data.map((item, idx) => (
          <li key={idx} className="nx-data-item">
            <span className="nx-data-label">{item.label}</span>
            <span className={`nx-data-value ${item.isLink ? 'nx-data-value--link' : ''}`}>
              {item.value}
              {item.status && <span className="nx-status-tag">{item.status}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Profile Page ── */
export function Profile() {
  const mainTabs = useTabs('overview');
  const personalTabs = useTabs('biographical');
  const employmentTabs = useTabs('workRole');
  const [activeSubTab, setActiveSubTab] = useState('Profile Summary');

  return (
    <main className="nx-dashboard-grid">
      {/* Left Column */}
      <div className="nx-col-main nx-grid-9">
        
        {/* Main Tab Navigation */}
        <nav className="nx-profile-nav" aria-label="Profile navigation">
          <ul className="nx-profile-tabs">
            <li className="nx-profile-tab-item">
              <button 
                className={`nx-profile-tab ${mainTabs.active === 'overview' ? 'nx-profile-tab--active' : ''}`}
                onClick={() => mainTabs.setActive('overview')}
              >
                Overview
              </button>
            </li>
            <li className="nx-profile-tab-item">
              <button 
                className={`nx-profile-tab ${mainTabs.active === 'personal' ? 'nx-profile-tab--active' : ''}`}
                onClick={() => mainTabs.setActive('personal')}
              >
                Personal Details
              </button>
            </li>
            <li className="nx-profile-tab-item">
              <button 
                className={`nx-profile-tab ${mainTabs.active === 'employment' ? 'nx-profile-tab--active' : ''}`}
                onClick={() => mainTabs.setActive('employment')}
              >
                Employment Details
              </button>
            </li>
          </ul>
        </nav>

        {/* Content based on Main Tab */}
        <div className="nx-profile-content">
          
          {/* OVERVIEW TAB */}
          {mainTabs.active === 'overview' && (
            <div className="nx-profile-container">
              <div className="nx-profile-actions">
                <button 
                  className={`nx-btn-pill ${activeSubTab === 'Profile Summary' ? 'nx-btn-pill--active' : ''}`}
                  onClick={() => setActiveSubTab('Profile Summary')}
                >
                  Profile Summary
                </button>
                <button 
                  className={`nx-btn-pill ${activeSubTab === 'Organization Chart' ? 'nx-btn-pill--active' : ''}`}
                  onClick={() => setActiveSubTab('Organization Chart')}
                >
                  Organization Chart
                </button>
              </div>
              
              <DataSection 
                title="Profile Summary" 
                data={PROFILE_DATA.overview.summary} 
                showEdit={false} 
              />
            </div>
          )}

          {/* PERSONAL DETAILS TAB */}
          {mainTabs.active === 'personal' && (
            <div className="nx-profile-container">
              <div className="nx-profile-actions nx-overflow-x">
                {['biographical', 'contact', 'address', 'resume', 'job', 'identity', 'documents', 'hr', 'emergency'].map(tab => (
                  <button 
                    key={tab}
                    className={`nx-btn-pill ${personalTabs.active === tab ? 'nx-btn-pill--active' : ''}`}
                    onClick={() => personalTabs.setActive(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {personalTabs.active === 'biographical' && (
                <DataSection title="Biographical" data={PROFILE_DATA.personalDetails.biographical} />
              )}
              {personalTabs.active === 'contact' && (
                <DataSection title="Contact" data={PROFILE_DATA.personalDetails.contact} />
              )}
              {personalTabs.active === 'address' && (
                <div className="nx-card nx-profile-card">
                   <div className="nx-profile-card__header">
                    <h3 className="nx-profile-card__title">Address</h3>
                    <button className="nx-header__btn"><Icon name="pencil" size={16} /></button>
                  </div>
                  <div className="nx-card nx-surface-2" style={{ padding: '20px', maxWidth: '300px' }}>
                    <h4 className="nx-h3" style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Current Address</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {PROFILE_DATA.personalDetails.address.current.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="nx-data-label">{item.label}</span>
                          <span className="nx-data-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {personalTabs.active === 'identity' && (
                <DataSection title="Personal Identity" data={PROFILE_DATA.personalDetails.identity} />
              )}
              {/* Other sub-tabs would render similar sections */}
              {['resume', 'job', 'documents', 'hr', 'emergency'].includes(personalTabs.active) && (
                <div className="nx-card nx-profile-card">
                  <h3 className="nx-profile-card__title">{personalTabs.active.toUpperCase()}</h3>
                  <p className="nx-p">No data available yet.</p>
                </div>
              )}
            </div>
          )}

          {/* EMPLOYMENT DETAILS TAB */}
          {mainTabs.active === 'employment' && (
            <div className="nx-profile-container">
               <div className="nx-profile-actions">
                {['workRole', 'jobLevel', 'officeLocation', 'manager', 'costCenter'].map(tab => (
                  <button 
                    key={tab}
                    className={`nx-btn-pill ${employmentTabs.active === tab ? 'nx-btn-pill--active' : ''}`}
                    onClick={() => employmentTabs.setActive(tab)}
                  >
                    {tab === 'workRole' ? 'Work Role' : tab === 'jobLevel' ? 'Job Level' : tab === 'officeLocation' ? 'Office Location' : tab}
                  </button>
                ))}
              </div>

              {employmentTabs.active === 'workRole' && (
                <DataSection title="Work Role" data={PROFILE_DATA.employmentDetails.workRole} />
              )}
              {employmentTabs.active === 'jobLevel' && (
                <DataSection title="Job Level" data={PROFILE_DATA.employmentDetails.jobLevel} />
              )}
              {employmentTabs.active === 'officeLocation' && (
                <DataSection title="Current Office Location" data={PROFILE_DATA.employmentDetails.officeLocation} />
              )}
              {['manager', 'costCenter'].includes(employmentTabs.active) && (
                 <div className="nx-card nx-profile-card">
                  <h3 className="nx-profile-card__title">{employmentTabs.active}</h3>
                  <p className="nx-p">Information coming soon.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Right Column */}
      <aside className="nx-col-side nx-grid-3">
        <FeedbackCard />
      </aside>
    </main>
  );
}
