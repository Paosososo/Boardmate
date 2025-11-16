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

if (empty($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    respond(403, ["success" => false, "status" => "ERROR", "message" => "Forbidden"]);
}

$roomId = isset($_POST['room_id']) ? (int)$_POST['room_id'] : 0;
$priceInput = $_POST['price_per_hour'] ?? null;
$statusInput = isset($_POST['status']) ? trim($_POST['status']) : '';

if ($roomId <= 0) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid room ID"]);
}

$updates = [];
$params = ['id' => $roomId];

if ($priceInput !== null && $priceInput !== '') {
    if (!is_numeric($priceInput) || (float)$priceInput < 0) {
        respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid price"]);
    }
    $updates[] = 'price_per_hour = :price';
    $params['price'] = number_format((float)$priceInput, 2, '.', '');
}

if ($statusInput !== '') {
    $allowedStatuses = ['available', 'unavailable', 'maintenance'];
    if (!in_array($statusInput, $allowedStatuses, true)) {
        respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid status"]);
    }
    $updates[] = 'status = :status';
    $params['status'] = $statusInput;
}

if (empty($updates)) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Nothing to update"]);
}

try {
    $sql = 'UPDATE room SET ' . implode(', ', $updates) . ' WHERE room_id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    respond(200, ["success" => true, "status" => "OK", "message" => "Room updated"]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Failed to update room"]);
}
