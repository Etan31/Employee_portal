import React, { useState } from 'react';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login and navigate to dashboard
    window.location.hash = '#/dashboard';
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="login-logo">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Nexus Logistics</span>
            </div>
            <h1 className="nx-h1">Welcome back</h1>
            <p className="nx-p">Enter your credentials to access the enterprise portal.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="password" className="form-label">Password</label>
                <a href="#/login" className="forgot-password">Forgot password?</a>
              </div>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" className="custom-checkbox" />
                <span className="checkbox-text">Remember me for 30 days</span>
              </label>
            </div>

            <button type="submit" className="login-button">
              Sign In
            </button>
          </form>

          <div className="login-footer">
            <p className="nx-small text-center">
              Protected by Enterprise-grade Security. <br />
              &copy; {new Date().getFullYear()} Nexus Logistics. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-image-overlay">
          <div className="overlay-content">
            <h2 className="overlay-title">Streamline Your Supply Chain</h2>
            <p className="overlay-text">
              Real-time tracking, intelligent routing, and comprehensive inventory management. 
              All in one powerful platform.
            </p>
            <div className="overlay-stats">
              <div className="stat-item">
                <span className="stat-value">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">2M+</span>
                <span className="stat-label">Deliveries</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">24/7</span>
                <span className="stat-label">Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
