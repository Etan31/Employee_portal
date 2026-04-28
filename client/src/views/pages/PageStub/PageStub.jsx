import React from 'react';
import './PageStub.css';
import { Icon } from '../../../../../v1/frontend/src/icons/Icon.jsx';

export function PageStub({ title }) {
  return (
    <div className="nx-stub">
      <div className="nx-card nx-stub__card">
        <Icon name="layout-dashboard" size={48} className="nx-stub__icon" />
        <h2 className="nx-h2 nx-stub__title">{title}</h2>
        <p className="nx-p nx-stub__desc">This page is coming soon.</p>
      </div>
    </div>
  );
}
