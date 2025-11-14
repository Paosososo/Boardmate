<?php
require 'config.php';

header('Content-Type: application/json');

$userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
$fullName = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid user id']);
    exit;
}

if ($fullName === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Name cannot be empty']);
    exit;
}

$length = function_exists('mb_strlen') ? mb_strlen($fullName) : strlen($fullName);
if ($length > 120) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Name is too long']);
    exit;
}

try {
    $check = $pdo->prepare('SELECT user_id FROM user WHERE user_id = :id LIMIT 1');
    $check->execute(['id' => $userId]);
    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE user SET full_name = :full_name WHERE user_id = :id');
    $stmt->execute([
        'full_name' => $fullName,
        'id' => $userId
    ]);

    echo json_encode(['success' => true, 'full_name' => $fullName]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update name']);
}
