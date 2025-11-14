<?php
require 'config.php';

header('Content-Type: application/json');

$userId = isset($_POST['user_id']) ? (int)$_POST['user_id'] : 0;
$email = isset($_POST['email']) ? trim($_POST['email']) : '';

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid user id']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
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

    $dup = $pdo->prepare('SELECT COUNT(*) FROM user WHERE email = :email AND user_id <> :id');
    $dup->execute([
        'email' => $email,
        'id' => $userId
    ]);

    if ($dup->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'error' => 'Email already in use']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE user SET email = :email WHERE user_id = :id');
    $stmt->execute([
        'email' => $email,
        'id' => $userId
    ]);

    echo json_encode(['success' => true, 'email' => $email]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to update email']);
}
