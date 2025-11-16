<?php
// cancel_booking.php
require 'config.php';
session_start();

$booking_id = $_POST['booking_id'] ?? null;
$user_id    = $_POST['user_id'] ?? $_SESSION['user_id'] ?? null;

if (!$booking_id || !$user_id) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "booking_id and user_id required"]);
    exit;
}

try {
    $stmt = $pdo->prepare("CALL cancel_booking(?, ?)");
    $stmt->execute([$booking_id, $user_id]);
    
    header('Content-Type: application/json');
    echo json_encode(["success" => true, "message" => "Booking cancelled successfully"]);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(400);
    
    // Extract error message from SQL exception
    $errorMsg = $e->getMessage();
    if (strpos($errorMsg, '45000') !== false) {
        // Try to extract the actual error message from stored procedure
        $errorMsg = preg_replace('/.*Error: /', '', $errorMsg);
    }
    
    echo json_encode(["success" => false, "error" => $errorMsg]);
}
