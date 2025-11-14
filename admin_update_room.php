<?php
require 'config.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["status" => "ERROR", "message" => "Forbidden"]);
    exit;
}

$roomId = (int)($_POST['room_id'] ?? 0);
$price = $_POST['price_per_hour'] ?? null;
$status = $_POST['status'] ?? null;

if ($roomId <= 0 || $price === null) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Missing room_id or price"]);
    exit;
}

$priceValue = filter_var($price, FILTER_VALIDATE_FLOAT);
if ($priceValue === false || $priceValue < 0) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Invalid price"]);
    exit;
}

$fields = ["price_per_hour = ?"];
$params = [$priceValue];

if ($status !== null && $status !== '') {
    $status = strtolower($status);
    $allowed = ['available', 'unavailable', 'maintenance'];
    if (!in_array($status, $allowed, true)) {
        http_response_code(400);
        echo json_encode(["status" => "ERROR", "message" => "Invalid status"]);
        exit;
    }
    $fields[] = "status = ?";
    $params[] = $status;
}

$params[] = $roomId;
$sql = "UPDATE room SET " . implode(', ', $fields) . " WHERE room_id = ?";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);

echo json_encode(["status" => "OK"]);
