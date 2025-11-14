<?php
// get_room_slots.php
require 'config.php';
header('Content-Type: application/json');

// 1) รับค่าจาก JS
$room_id = $_GET['room_id'] ?? null;
$booking_date = $_GET['booking_date'] ?? null;

if (!$room_id || !$booking_date) {
    http_response_code(400);
    echo json_encode(["error" => "room_id and booking_date required"]);
    exit;
}

// 2) ดึงรายการจองของห้องนี้ในวันนั้น
$stmt = $pdo->prepare("
    SELECT start_time, end_time
    FROM booking
    WHERE room_id = ?
      AND booking_date = ?
      AND status <> 'cancelled'
      AND status = 'paid'
");
$stmt->execute([$room_id, $booking_date]);
$bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 3) สร้าง slot ตั้งแต่ 10:00 - 22:00 ทีละ 1 ชั่วโมง
$openHour = 10;
$closeHour = 22;
$slots = [];

for ($h = $openHour; $h < $closeHour; $h++) {
    $slotStart = sprintf("%02d:00:00", $h);
    $slotEnd   = sprintf("%02d:00:00", $h + 1);
    $isBooked = false;

    foreach ($bookings as $b) {
        $bStart = $b['start_time']; // ตัวอย่าง: '13:00:00'
        $bEnd   = $b['end_time'];   // ตัวอย่าง: '15:00:00'

        // แปลงเป็น timestamp
        $slotStartT = strtotime($slotStart);
        $slotEndT   = strtotime($slotEnd);
        $bStartT    = strtotime($bStart);
        $bEndT      = strtotime($bEnd);

        // ถ้าเวลาชนกัน (มี overlap)
        if ($slotStartT < $bEndT && $slotEndT > $bStartT) {
            $isBooked = true;
            break;
        }
    }

    $slots[] = [
        "start" => substr($slotStart, 0, 5), // เอาแค่ HH:MM
        "end"   => substr($slotEnd, 0, 5),
        "available" => (bool)!$isBooked   // ✅ boolean แท้
    ];
}

// 4) ส่งข้อมูลกลับเป็น JSON
echo json_encode($slots, JSON_PRETTY_PRINT);