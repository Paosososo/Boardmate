<?php
require 'config.php';

header('Content-Type: application/json');

$userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid user id']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT user_id, full_name, email FROM user WHERE user_id = :id LIMIT 1');
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'user_id' => (int)$user['user_id'],
            'full_name' => $user['full_name'],
            'email' => $user['email']
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to fetch profile']);
}
