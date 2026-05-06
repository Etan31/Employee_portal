<?php
$activeRoute = '/profile';
$extraCss = ['/v1/frontend/src/pages/Profile.css'];
require __DIR__ . '/../layouts/layout_top.php';
?>

<!-- Profile Content -->
<div class="nx-card p-6 col-span-12">
    <h2 class="nx-h2">Profile</h2>
    <p class="nx-p mt-4">User Profile details.</p>
</div>

<?php
require __DIR__ . '/../layouts/layout_bottom.php';
?>
