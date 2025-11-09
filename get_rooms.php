<?php
require 'config.php';

$stmt = $pdo->query("SELECT room_id, room_name, price_per_hour, status, capacity, time_slot FROM room");
$rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($rooms);
