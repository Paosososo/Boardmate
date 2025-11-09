<?php
require 'config.php';

$booking_id = $_POST['booking_id'] ?? null;
$game_id    = $_POST['game_id'] ?? null;

if (!$booking_id || !$game_id) {
    http_response_code(400);
    echo "booking_id and game_id are required";
    exit;
}

$stmt = $pdo->prepare("CALL set_booking_game(?, ?)");
$stmt->execute([$booking_id, $game_id]);

echo "OK";
