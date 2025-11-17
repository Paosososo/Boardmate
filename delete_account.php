<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

require 'config.php';

$sessionUserId = $_SESSION['user_id'] ?? null;
$userId = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;

if (!$sessionUserId || $sessionUserId !== $userId) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid user_id']);
    exit;
}

try {
    $pdo->beginTransaction();

    $deleteFeedback = $pdo->prepare(
        'DELETE f FROM feedback f
         INNER JOIN booking b ON f.booking_id = b.booking_id
         WHERE b.user_id = :user_id'
    );
    $deleteFeedback->execute([':user_id' => $userId]);

    $deletePayments = $pdo->prepare(
        'DELETE p FROM payment p
         INNER JOIN booking b ON p.booking_id = b.booking_id
         WHERE b.user_id = :user_id'
    );
    $deletePayments->execute([':user_id' => $userId]);

    $deleteBookings = $pdo->prepare('DELETE FROM booking WHERE user_id = :user_id');
    $deleteBookings->execute([':user_id' => $userId]);

    $deleteUser = $pdo->prepare('DELETE FROM user WHERE user_id = :user_id');
    $deleteUser->execute([':user_id' => $userId]);

    if ($deleteUser->rowCount() === 0) {
        throw new RuntimeException('User not found');
    }

    $pdo->commit();

    session_unset();
    session_destroy();

    echo json_encode(['success' => true]);
    exit;
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    $message = $e->getMessage() ?: 'Failed to delete account';
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}