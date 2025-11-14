<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$user_id      = $_POST['user_id']      ?? null;
$room_id      = $_POST['room_id']      ?? null;
$booking_date = $_POST['booking_date'] ?? null;
$start_time   = $_POST['start_time']   ?? null;
$end_time     = $_POST['end_time']     ?? null;
$game_id      = $_POST['game_id']      ?? null;

if (!$user_id || !$room_id || !$booking_date || !$start_time || !$end_time || !$game_id) {
    respond(400, ['success' => false, 'error' => 'Missing required fields']);
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $booking_date) ||
    !preg_match('/^\d{2}:\d{2}:\d{2}$/', $start_time) ||
    !preg_match('/^\d{2}:\d{2}:\d{2}$/', $end_time)) {
    respond(400, ['success' => false, 'error' => 'Invalid date or time format']);
}

if (strtotime($start_time) >= strtotime($end_time)) {
    respond(400, ['success' => false, 'error' => 'Start time must be before end time']);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('CALL create_booking(?, ?, ?, ?, ?, ?)');
    $stmt->execute([$user_id, $room_id, $booking_date, $start_time, $end_time, $game_id]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $booking_id = $row['booking_id'] ?? null;

    while ($stmt->nextRowset()) { /* consume */ }
    $stmt->closeCursor();

    if (!$booking_id) {
        throw new RuntimeException('Unable to create booking');
    }

    $pdo->commit();
    respond(200, ['success' => true, 'booking_id' => (int)$booking_id]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    respond(500, ['success' => false, 'error' => $e->getMessage()]);
}
