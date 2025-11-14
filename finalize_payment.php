<?php
declare(strict_types=1);

// Suppress PHP notices/warnings to avoid HTML in JSON response
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set JSON response header before any output
header('Content-Type: application/json; charset=utf-8');

// Safe session start
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require 'config.php';

$booking_id = $_POST['booking_id'] ?? null;
$method     = $_POST['method'] ?? 'qr';
$amount     = $_POST['amount'] ?? 0;
$card_number = $_POST['card_number'] ?? null;
$card_cvv = $_POST['card_cvv'] ?? null;

if (!$booking_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "booking_id required"]);
    exit;
}

try {
    $stmt = $pdo->prepare("CALL finalize_payment(?, ?, ?, ?, ?)");
    $stmt->execute([$booking_id, $method, $amount, $card_number, $card_cvv]);

    echo json_encode(["success" => true, "status" => "paid"]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    
    // Extract error message from SQL exception
    $errorMsg = $e->getMessage();
    // Check if it's a stored procedure error (SQLSTATE 45000)
    if (strpos($errorMsg, '45000') !== false || strpos($errorMsg, 'CALL') !== false) {
        // Try to extract the actual error message
        $errorMsg = preg_replace('/.*Error: /', '', $errorMsg);
    }
    
    echo json_encode(["success" => false, "error" => $errorMsg]);
    exit;
}