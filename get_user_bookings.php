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

$user_id = $_SESSION['user_id'] ?? $_POST['user_id'] ?? $_GET['user_id'] ?? null;
if (!$user_id) {
    respond(400, ["success" => false, "error" => "user_id required"]);
}

try {
    $stmt = $pdo->prepare('CALL get_user_bookings(?)');
    $stmt->execute([$user_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    while ($stmt->nextRowset()) { /* consume */ }
    $stmt->closeCursor();

    respond(200, ["success" => true, "bookings" => $rows]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "error" => "Failed to load bookings"]);
}
