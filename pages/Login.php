<?php
// Start session for authentication
session_start();

$error = '';

// Handle Login submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    // TODO: Connect to Supabase REST API or Postgres DB via PDO here.
    // Example logic:
    if ($email === 'demo@company.com' && $password === 'demo123') {
        $_SESSION['user'] = $email;
        // Redirect to dashboard
        header('Location: /dashboard');
        exit;
    } else {
        $error = 'Invalid email or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Nexus Logistics</title>
    <!-- Use App.css variables as requested -->
    <link rel="stylesheet" href="/v1/frontend/src/App.css">
    <link rel="stylesheet" href="/v1/frontend/src/pages/Login.css">
</head>
<body>
    <div class="login-container">
      <div class="login-left">
        <div class="login-form-wrapper">
          <div class="login-header">
            <div class="login-logo">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Nexus Logistics</span>
            </div>
            <h1 class="nx-h1">Welcome back</h1>
            <p class="nx-p">Enter your credentials to access the enterprise portal.</p>
          </div>

          <?php if ($error): ?>
              <div style="color: var(--nx-danger); margin-bottom: 1rem; font-size: 0.875rem;">
                  <?= htmlspecialchars($error) ?>
              </div>
          <?php endif; ?>

          <form class="login-form" method="POST" action="/login">
            <div class="form-group">
              <label for="email" class="form-label">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                class="form-input"
                placeholder="name@company.com"
                required
              />
            </div>

            <div class="form-group">
              <div class="form-label-row">
                <label for="password" class="form-label">Password</label>
                <a href="/forgot-password" class="forgot-password">Forgot password?</a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                class="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            <div class="form-options">
              <label class="checkbox-label">
                <input type="checkbox" name="remember" class="custom-checkbox" />
                <span class="checkbox-text">Remember me for 30 days</span>
              </label>
            </div>

            <button type="submit" class="login-button">
              Sign In
            </button>
          </form>

          <div class="login-footer">
            <p class="nx-small text-center">
              Protected by Enterprise-grade Security. <br />
              &copy; <?= date('Y') ?> Nexus Logistics. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      
      <div class="login-right">
        <div class="login-image-overlay">
          <div class="overlay-content">
            <h2 class="overlay-title">Streamline Your Supply Chain</h2>
            <p class="overlay-text">
              Real-time tracking, intelligent routing, and comprehensive inventory management. 
              All in one powerful platform.
            </p>
            <div class="overlay-stats">
              <div class="stat-item">
                <span class="stat-value">99.9%</span>
                <span class="stat-label">Uptime</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">2M+</span>
                <span class="stat-label">Deliveries</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">24/7</span>
                <span class="stat-label">Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</body>
</html>
