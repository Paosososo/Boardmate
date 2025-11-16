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

$gameName = trim($_POST['game_name'] ?? '');
$genre = trim($_POST['genre'] ?? '');
$playersMin = isset($_POST['players_min']) ? (int)$_POST['players_min'] : 0;
$playersMax = isset($_POST['players_max']) ? (int)$_POST['players_max'] : 0;
$isActive = isset($_POST['is_active']) && (int)$_POST['is_active'] === 0 ? 0 : 1;
$howToPlay = trim($_POST['how_to_play'] ?? '');

if ($gameName === '' || $genre === '') {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Game name and genre are required"]);
}

if ($playersMin <= 0 || $playersMax <= 0 || $playersMin > $playersMax) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid player counts"]);
}

if ($howToPlay === '') {
    $howToPlay = "Instructions coming soon.";
}

try {
    $stmt = $pdo->prepare('INSERT INTO boardgame (game_name, genre, players_min, players_max, how_to_play, is_active) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$gameName, $genre, $playersMin, $playersMax, $howToPlay, $isActive]);
    respond(200, ["success" => true, "status" => "OK", "message" => "Boardgame created"]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Failed to create boardgame"]);
}
