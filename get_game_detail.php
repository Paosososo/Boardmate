<?php
require 'config.php';

header('Content-Type: application/json');

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$gameId = isset($_POST['game_id']) ? (int)$_POST['game_id'] : 0;
if ($gameId <= 0 && isset($_GET['game_id'])) {
    $gameId = (int)$_GET['game_id'];
}

if ($gameId <= 0) {
    respond(400, ['success' => false, 'error' => 'game_id required']);
}

try {
    $stmt = $pdo->prepare("SELECT game_id, game_name, genre, players_min, players_max, how_to_play FROM boardgame WHERE game_id = :id LIMIT 1");
    $stmt->execute(['id' => $gameId]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        respond(404, ['success' => false, 'error' => 'Game not found']);
    }

    respond(200, ['success' => true, 'game' => $game]);
} catch (PDOException $e) {
    respond(500, ['success' => false, 'error' => 'Failed to load game detail']);
}
