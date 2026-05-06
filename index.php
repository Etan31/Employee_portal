<?php
// Simple Router for PHP Entry Point
$base_path = '/Employee_portal';
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// Remove base path from the URI to get the relative path
if (strpos($path, $base_path) === 0) {
    $path = substr($path, strlen($base_path));
}

// Ensure $path starts with /
if (empty($path)) {
    $path = '/';
}

// Static file routing (for local development server or if not handled by Apache)
if (preg_match('/\.(?:png|jpg|jpeg|gif|css|js|svg)$/', $path)) {
    return false; // serve the requested resource as-is
}

switch ($path) {
    case '/':
    case '/login':
        require __DIR__ . '/pages/Login.php';
        break;
    case '/dashboard':
        require __DIR__ . '/pages/Dashboard.php';
        break;
    case '/task-box':
        require __DIR__ . '/pages/TaskBox.php';
        break;
    case '/profile':
        require __DIR__ . '/pages/Profile.php';
        break;
    case '/logout':
        session_start();
        session_destroy();
        header('Location: ' . $base_path . '/login');
        break;
    default:
        http_response_code(404);
        echo "404 Not Found: " . htmlspecialchars($path);
        break;
}
