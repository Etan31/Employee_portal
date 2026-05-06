<?php
$activeRoute = '/dashboard';
$extraCss = ['/v1/frontend/src/pages/Dashboard.css'];
require __DIR__ . '/../layouts/layout_top.php';
?>

<!-- Dashboard Content -->
<div class="nx-card p-6 col-span-12">
    <h2 class="nx-h2">Welcome to your Dashboard</h2>
    <p class="nx-p mt-4">This project has been fully migrated to PHP.</p>
</div>

<?php
require __DIR__ . '/../layouts/layout_bottom.php';
?>
