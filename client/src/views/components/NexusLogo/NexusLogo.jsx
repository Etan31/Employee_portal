import React from 'react';

export function NexusLogo({ expanded }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="#38bdf8"/>
        <path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="#2563eb"/>
      </svg>
      {expanded && (
        <span style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.5px' }}>
          Nexus
        </span>
      )}
    </div>
  );
}
