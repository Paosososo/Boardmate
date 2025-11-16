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

$booking_id = isset($_POST['booking_id']) ? (int) $_POST['booking_id'] : null;
$user_id    = isset($_POST['user_id'])
    ? (int) $_POST['user_id']
    : (isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null);

if (!$booking_id || !$user_id) {
    respond(400, ["success" => false, "error" => "booking_id and user_id required"]);
}

try {
    $stmt = $pdo->prepare('CALL cancel_booking(?, ?)');
    $stmt->execute([$booking_id, $user_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    while ($stmt->nextRowset()) { /* consume */ }
    $stmt->closeCursor();

    $message = $result['message'] ?? 'Booking cancelled successfully';
    respond(200, ["success" => true, "message" => $message]);
} catch (PDOException $e) {
    $errorMsg = $e->getMessage();
    if (strpos($errorMsg, '45000') !== false) {
        $errorMsg = preg_replace('/.*Error: /', '', $errorMsg);
    }
    respond(400, ["success" => false, "error" => $errorMsg]);
}
