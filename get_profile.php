<?php
require 'config.php';

header('Content-Type: application/json');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
if ($userId <= 0 && !empty($_SESSION['user_id'])) {
    $userId = (int)$_SESSION['user_id'];
}

if ($userId <= 0) {
    respond(401, ['success' => false, 'error' => 'User not found']);
}

try {
    $stmt = $pdo->prepare('SELECT user_id, full_name, email FROM user WHERE user_id = :id LIMIT 1');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        respond(404, ['success' => false, 'error' => 'User not found']);
    }

    respond(200, [
        'success' => true,
        'user' => [
            'user_id' => (int)$user['user_id'],
            'full_name' => $user['full_name'],
            'email' => $user['email']
        ]
    ]);
} catch (PDOException $e) {
    respond(500, ['success' => false, 'error' => 'Failed to fetch profile']);
}
