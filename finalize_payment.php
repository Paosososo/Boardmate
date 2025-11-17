<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require 'config.php';

$bookingId  = isset($_POST['booking_id']) ? (int) $_POST['booking_id'] : 0;
$method     = $_POST['method'] ?? 'qr';
$amount     = isset($_POST['amount']) ? (float) $_POST['amount'] : 0.0;
$cardNumber = $_POST['card_number'] ?? null;
$cardCvv    = $_POST['card_cvv'] ?? null;

if ($bookingId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'booking_id required']);
    exit;
}

if ($method === 'card') {
    $cardNumber = trim((string) $cardNumber);
    $cardCvv = trim((string) $cardCvv);

    if ($cardNumber === '' || !preg_match('/^\d{16}$/', $cardNumber)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Card number must be 16 digits.']);
        exit;
    }

    if ($cardCvv === '' || !preg_match('/^\d{3}$/', $cardCvv)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'CVV must be 3 digits.']);
        exit;
    }
} else {
    $cardNumber = null;
    $cardCvv = null;
}

try {
    $stmt = $pdo->prepare('CALL finalize_payment(?, ?, ?, ?, ?)');
    $stmt->execute([$bookingId, $method, $amount, $cardNumber, $cardCvv]);
    while ($stmt->nextRowset()) { /* consume */ }
    $stmt->closeCursor();

    echo json_encode(['success' => true, 'status' => 'paid']);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    $errorMsg = $e->getMessage();
    if (strpos($errorMsg, '45000') !== false || strpos($errorMsg, 'CALL') !== false) {
        $errorMsg = preg_replace('/.*Error: /', '', $errorMsg);
    }

    echo json_encode(['success' => false, 'error' => $errorMsg ?: 'Failed to finalize payment']);
    exit;
}
