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

$booking_id = $_POST['booking_id'] ?? null;
$user_id    = $_POST['user_id'] ?? ($_SESSION['user_id'] ?? null);

if (!$booking_id || !$user_id) {
    respond(400, ["success" => false, "error" => "booking_id and user_id required"]);
}

try {
    $stmt = $pdo->prepare('CALL cancel_booking(?, ?)');
    $stmt->execute([$booking_id, $user_id]);
    while ($stmt->nextRowset()) { /* consume */ }
    $stmt->closeCursor();

    respond(200, ["success" => true, "message" => "Booking cancelled successfully"]);
} catch (PDOException $e) {
    $errorMsg = $e->getMessage();
    if (strpos($errorMsg, '45000') !== false) {
        $errorMsg = preg_replace('/.*Error: /', '', $errorMsg);
    }
    respond(400, ["success" => false, "error" => $errorMsg]);
}
