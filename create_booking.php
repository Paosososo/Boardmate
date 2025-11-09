<?php
require 'config.php';
header('Content-Type: application/json; charset=utf-8');

$user_id      = $_POST['user_id'] ?? null;
$room_id      = $_POST['room_id'] ?? null;
$booking_date = $_POST['booking_date'] ?? null;
$start_time   = $_POST['start_time'] ?? null;
$end_time     = $_POST['end_time'] ?? null;

if (!$user_id || !$room_id || !$booking_date || !$start_time || !$end_time) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Missing fields"]);
    exit;
}

try {
    // เช็กว่ามี booking อื่นที่ "ซ้อนเวลา" กับช่วงใหม่ไหม
    $stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM booking
        WHERE room_id = ?
          AND booking_date = ?
          AND status <> 'cancelled'
          -- เงื่อนไขซ้อนเวลาแบบมาตรฐาน
          AND ( ? < end_time AND ? > start_time )
    ");
    // param ลำดับ: room, date, new_start, new_end
    $stmt->execute([
        $room_id,
        $booking_date,
        $end_time,     // ? < end_time   → new_end < exist_end  (ฝั่งขวา)
        $start_time    // ? > start_time → new_start > exist_start (ฝั่งซ้าย)
    ]);
    $conflict = $stmt->fetchColumn();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "ERROR", "message" => "DB error: ".$e->getMessage()]);
    exit;
}

if ($conflict > 0) {
    http_response_code(409); // slot ซ้ำ
    echo json_encode([
        "status" => "ERROR",
        "message" => "This slot is already booked."
    ]);
    exit;
}

// ไม่ชน → insert ได้
try {
    $stmt = $pdo->prepare("
        INSERT INTO booking (user_id, room_id, booking_date, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, 'unpaid')
    ");
    $stmt->execute([$user_id, $room_id, $booking_date, $start_time, $end_time]);
    $newId = $pdo->lastInsertId();

    echo json_encode([
        "status" => "OK",
        "booking_id" => (int)$newId
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "ERROR", "message" => "Insert failed: ".$e->getMessage()]);
}