import React, { useState, useEffect } from "react";
import "./Login.css";
import { useAuth } from "../../hooks/auth.hooks.jsx";

export function Login() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      window.location.hash = "#/dashboard";
    }
  }, [loading, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSigningIn(true);

    try {
      await signIn(email, password);
      window.location.hash = "#/dashboard";
    } catch (error) {
      setSigningIn(false);
      setErrorMessage(
        error?.message || "Unable to sign in. Please check your credentials.",
      );
    }
  };

  return (
    <div className="login-container">
      {/* Left — image with blue overlay */}
      <div className="login-image-panel">
        <div className="login-image-overlay" />
        <div className="login-brand">
          <span className="login-brand-name">Nexus</span>
        </div>
        <div className="login-tagline">
          <p>Where Efficiency Meets the Road.</p>
        </div>
        <div className="login-highlight">
          <div className="login-highlight-item">
            <span>1</span>
            <p>
              Quick check-in and shift updates for leasing staff on the move.
            </p>
          </div>
          <div className="login-highlight-item">
            <span>2</span>
            <p>
              Track leave requests and company operations without leaving the
              portal.
            </p>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="login-form-panel">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h1>Sign In</h1>
            <p>Nexus Employee Hub</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
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
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <a href="#/login" className="forgot-link">
                  Forgot?
                </a>
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

            {errorMessage && (
              <div className="login-error" role="alert">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading || signingIn}
            >
              {loading || signingIn ? (
                <>
                  <span className="login-button-spinner" />
                  Signing in…
                </>
              ) : (
                "Log In"
              )}
            </button>

            <p className="demo-credentials">
              <b>Demo: </b>employee@gmail.com / employee12345
            </p>
          </form>

          <p className="login-footer-text">
            &copy; {new Date().getFullYear()} Nexus. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
