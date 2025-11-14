<?php
require 'config.php';

header('Content-Type: application/json');

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$name = $_POST['name'] ?? ($_GET['name'] ?? '');
$name = trim($name);

if ($name === '') {
    respond(400, ['success' => false, 'error' => 'name required']);
}

try {
    $stmt = $pdo->prepare("SELECT game_id, game_name, genre, players_min, players_max, how_to_play FROM boardgame WHERE LOWER(game_name) = LOWER(:name) LIMIT 1");
    $stmt->execute(['name' => $name]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        respond(404, ['success' => false, 'error' => 'Game not found']);
    }

    respond(200, ['success' => true, 'game' => $game]);
} catch (PDOException $e) {
    respond(500, ['success' => false, 'error' => 'Failed to load game detail']);
}
