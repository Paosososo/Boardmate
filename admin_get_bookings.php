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

try {
    $sql = "
        SELECT
            b.booking_id,
            b.booking_date,
            b.start_time,
            b.end_time,
            b.status,
            u.full_name AS user_name,
            u.email,
            r.room_name,
            r.price_per_hour,
            bg.game_name
        FROM booking b
        JOIN user u ON b.user_id = u.user_id
        JOIN room r ON b.room_id = r.room_id
        LEFT JOIN boardgame bg ON b.game_id = bg.game_id
        ORDER BY b.booking_date DESC, b.start_time DESC
    ";
    $stmt = $pdo->query($sql);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    respond(200, ["success" => true, "status" => "OK", "bookings" => $bookings]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Failed to load bookings"]);
}
