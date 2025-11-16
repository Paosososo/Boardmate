<?php
require_once __DIR__.'/config.php';

$user_id      = $_POST['user_id']      ?? null;
$room_id      = $_POST['room_id']      ?? null;
$booking_date = $_POST['booking_date'] ?? null; // YYYY-MM-DD
$start_time   = $_POST['start_time']   ?? null; // HH:MM:SS
$end_time     = $_POST['end_time']     ?? null; // HH:MM:SS
$game_id      = $_POST['game_id']      ?? null;

if (!$user_id || !$room_id || !$booking_date || !$start_time || !$end_time || !$game_id) {
  echo json_encode(['success'=>false,'error'=>'missing_fields_or_game_id']); exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$booking_date) ||
    !preg_match('/^\d{2}:\d{2}:\d{2}$/',$start_time) ||
    !preg_match('/^\d{2}:\d{2}:\d{2}$/',$end_time)) {
  echo json_encode(['success'=>false,'error'=>'invalid_date_or_time_format']); exit;
}
if (strtotime($start_time) >= strtotime($end_time)) {
  echo json_encode(['success'=>false,'error'=>'start_must_be_before_end']); exit;
}

try {
  $pdo->beginTransaction();

  // CALL create_booking(...) และอ่าน booking_id
  $stmt = $pdo->prepare("CALL create_booking(?, ?, ?, ?, ?, ?)");
  $stmt->execute([$user_id, $room_id, $booking_date, $start_time, $end_time, $game_id]);

  // NOTE: MySQL + PDO จะมี result set ของ SELECT LAST_INSERT_ID()
  $row = $stmt->fetch();              // fetch แถวแรก { booking_id: ... }
  $booking_id = $row['booking_id'] ?? null;

  // consume result sets ที่เหลือ (ป้องกัน "commands out of sync")
  while ($stmt->nextRowset()) { /* no-op */ }
  $stmt->closeCursor();

  if (!$booking_id) {
    throw new RuntimeException('cannot_get_booking_id');
  }

  $pdo->commit();
  echo json_encode(['success'=>true, 'booking_id'=>(int)$booking_id]);
} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
}