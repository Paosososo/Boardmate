<?php
// finalize_payment.php
require 'config.php';

$booking_id = $_POST['booking_id'] ?? null;
$method     = $_POST['method'] ?? 'qr';
$amount     = $_POST['amount'] ?? 0;

if (!$booking_id) {
    http_response_code(400);
    echo "booking_id required";
    exit;
}

try {
    $stmt = $pdo->prepare("CALL finalize_payment(?, ?, ?)");
    $stmt->execute([$booking_id, $method, $amount]);
    echo "OK";
} catch (PDOException $e) {
    http_response_code(400);
    echo $e->getMessage();
}