<?php
require 'config.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["status" => "ERROR", "message" => "Forbidden"]);
    exit;
}

$sql = "SELECT 
            b.booking_id,
            u.full_name AS user_name,
            u.email,
            r.room_name,
            r.price_per_hour,
            r.status AS room_status,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.status,
            bg.game_name
        FROM booking b
        INNER JOIN user u ON b.user_id = u.user_id
        INNER JOIN room r ON b.room_id = r.room_id
        LEFT JOIN boardgame bg ON b.game_id = bg.game_id
        ORDER BY b.booking_date DESC, b.start_time DESC";

$stmt = $pdo->query($sql);
$bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "status" => "OK",
    "bookings" => $bookings
]);
