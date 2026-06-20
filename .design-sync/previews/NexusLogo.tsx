import React from 'react';
import { NexusLogo } from 'nexus-employee-portal';

export function Expanded() {
  return (
    <div style={{ background: '#0f172a', padding: '20px 24px', borderRadius: '12px', display: 'inline-flex' }}>
      <NexusLogo expanded={true} />
    </div>
  );
}

export function Collapsed() {
  return (
    <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <NexusLogo expanded={false} />
    </div>
  );
}

export function SidebarFooter() {
  return (
    <div style={{
      background: '#0f172a',
      width: 220,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
        <p style={{ color: '#475569', fontSize: '10px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expanded</p>
        <NexusLogo expanded={true} />
      </div>
      <div>
        <p style={{ color: '#475569', fontSize: '10px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Collapsed</p>
        <NexusLogo expanded={false} />
      </div>
    </div>
  );
}
