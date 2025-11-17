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
    $stmt = $pdo->query('SELECT game_id, game_name, genre, players_min, players_max, how_to_play, is_active FROM boardgame ORDER BY game_name');
    $games = $stmt->fetchAll(PDO::FETCH_ASSOC);
    respond(200, ["success" => true, "status" => "OK", "boardgames" => $games]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Failed to load boardgames"]);
}
