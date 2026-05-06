<?php
$activeRoute = '/task-box';
$extraCss = ['/v1/frontend/src/pages/TaskBox.css'];
require __DIR__ . '/../layouts/layout_top.php';
?>

<!-- TaskBox Content -->
<div class="nx-card p-6 col-span-12">
    <h2 class="nx-h2">Task Box</h2>
    <p class="nx-p mt-4">Manage your tasks here.</p>
</div>

<?php
require __DIR__ . '/../layouts/layout_bottom.php';
?>
