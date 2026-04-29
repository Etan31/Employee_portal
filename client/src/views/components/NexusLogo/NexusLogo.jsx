import React from 'react';

export function NexusLogo({ expanded }) {
  return (
    <div className={`nx-nexus-logo ${expanded ? 'nx-nexus-logo--expanded' : 'nx-nexus-logo--collapsed'}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="var(--nx-accent)"/>
        <path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="var(--nx-primary)"/>
      </svg>
      {expanded && (
        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>
          Nexus
        </span>
      )}
    </div>
  );
}
