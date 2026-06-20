import React from 'react';
import { Icon } from 'nexus-employee-portal';

export function NavigationIcons() {
  const items = [
    'layout-dashboard', 'list-checks', 'user', 'clock',
    'users', 'calendar', 'file-text', 'message-square', 'network',
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '16px', background: '#f3f6fb', borderRadius: '12px' }}>
      {items.map(name => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: 72 }}>
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e3e9f2', color: '#374151' }}>
            <Icon name={name} size={20} />
          </div>
          <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', lineHeight: 1.3 }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

export function ActionIcons() {
  const items = [
    { name: 'search', label: 'search' },
    { name: 'bell', label: 'bell' },
    { name: 'settings', label: 'settings' },
    { name: 'logout', label: 'logout' },
    { name: 'plus-circle', label: 'plus-circle' },
    { name: 'x', label: 'x' },
    { name: 'check', label: 'check' },
    { name: 'arrow-right', label: 'arrow-right' },
    { name: 'apps', label: 'apps' },
    { name: 'upload', label: 'upload' },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '16px', background: '#f3f6fb', borderRadius: '12px' }}>
      {items.map(({ name, label }) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: 60 }}>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e3e9f2', color: '#2563eb' }}>
            <Icon name={name} size={18} />
          </div>
          <span style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function PriorityAndStatus() {
  const priorities = [
    { name: 'priority-urgent', color: '#ef4444', label: 'Urgent' },
    { name: 'priority-high', color: '#f59e0b', label: 'High' },
    { name: 'priority-medium', color: '#2563eb', label: 'Medium' },
    { name: 'priority-low', color: '#22c55e', label: 'Low' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: '#f3f6fb', borderRadius: '12px' }}>
      {priorities.map(({ name, color, label }) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e3e9f2', color }}>
          <Icon name={name} size={16} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', padding: '16px', background: '#f3f6fb', borderRadius: '12px' }}>
      {([12, 16, 20, 24, 32] as const).map(size => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#374151' }}>
          <Icon name="layout-dashboard" size={size} />
          <span style={{ fontSize: '10px', color: '#64748b' }}>{size}px</span>
        </div>
      ))}
    </div>
  );
}
