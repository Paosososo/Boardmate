<?php
require 'config.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["status" => "ERROR", "message" => "Forbidden"]);
    exit;
}

$stmt = $pdo->query("SELECT room_id, room_name, price_per_hour, status, capacity, time_slot FROM room ORDER BY room_id ASC");
$rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "status" => "OK",
    "rooms" => $rooms
]);
