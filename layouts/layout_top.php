<?php
require_once __DIR__ . '/../models/nav.php';
require_once __DIR__ . '/../models/people.php';
require_once __DIR__ . '/../config.php';
// Default values
$expanded = true; 
$activeRoute = $activeRoute ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Logistics Portal</title>
    <link rel="stylesheet" href="<?php echo $base_path; ?>/v1/frontend/src/App.css">
    <link rel="stylesheet" href="<?php echo $base_path; ?>/v1/frontend/src/layouts/DashboardLayout.css">
    <?php if (isset($extraCss)): ?>
        <?php foreach ($extraCss as $css): ?>
            <link rel="stylesheet" href="<?php echo $base_path . $css; ?>">
        <?php endforeach; ?>
    <?php endif; ?>
</head>
<body>
    <div class="nx-layout <?= $expanded ? 'nx-layout--expanded' : 'nx-layout--collapsed' ?>">
      <!-- Sidebar -->
      <aside class="nx-sidebar">
        <header class="nx-sidebar__top">
          <button 
            class="nx-sidebar__apps-btn" 
            title="<?= $expanded ? 'Collapse Menu' : 'Expand Menu' ?>"
          >
            <!-- Search icon as placeholder for apps icon, or we can use SVG directly -->
            <svg class="nx-sidebar__apps-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <?php if ($expanded): ?><span class="nx-sidebar__apps-label">All Apps</span><?php endif; ?>
          </button>
        </header>

        <nav class="nx-sidebar__nav">
          <ul class="nx-sidebar__list">
            <?php foreach ($NAV_ITEMS as $item): ?>
              <?php 
                $isActive = $activeRoute === str_replace('#/', '/', $item['route']);
              ?>
              <li class="nx-sidebar__list-item">
                <a 
                  href="<?= str_replace('#/', '/', $item['route']) ?>" 
                  class="nx-sidebar__item <?= $isActive ? 'nx-sidebar__item--active' : '' ?>"
                  title="<?= !$expanded ? htmlspecialchars($item['label']) : '' ?>"
                >
                  <!-- We would render the icon based on $item['icon'] here. For simplicity, just a square or specific SVGs -->
                  <span class="nx-sidebar__icon" style="display:inline-block; width:18px; height:18px; border:1px solid currentColor; border-radius:3px;"></span>
                  <?php if ($expanded): ?><span class="nx-sidebar__label"><?= htmlspecialchars($item['label']) ?></span><?php endif; ?>
                </a>
              </li>
            <?php endforeach; ?>
          </ul>
        </nav>

        <footer class="nx-sidebar__footer">
          <?php if ($expanded): ?>
            <div class="nx-sidebar__links">
              <a href="/privacy" class="nx-sidebar__link">Privacy policy</a>
              <a href="/terms" class="nx-sidebar__link">Terms of Use</a>
            </div>
          <?php endif; ?>
          <div class="nx-sidebar__logo-container">
            <div style="font-weight: bold; color: var(--nx-primary);">NEXUS</div>
          </div>
        </footer>
      </aside>

      <!-- Main Content Area -->
      <div class="nx-main-area">
        <!-- Header -->
        <header class="nx-header">
          <div class="nx-header__search-container">
            <svg class="nx-header__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              class="nx-header__search" 
              placeholder="Search for people, apps, requests..."
            />
            <div class="nx-header__search-kbd">⌘K</div>
          </div>

          <div class="nx-header__actions">
            <button class="nx-header__btn nx-header__btn--notify">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <span class="nx-badge"></span>
            </button>
            <div class="nx-header__avatar">
              <?= htmlspecialchars($ME['initials']) ?>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="nx-content">
          <div class="nx-dashboard-grid">
            <!-- Content Starts Here -->
