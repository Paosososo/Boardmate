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

$gameId = isset($_POST['game_id']) ? (int)$_POST['game_id'] : 0;
$gameName = trim($_POST['game_name'] ?? '');
$genre = trim($_POST['genre'] ?? '');
$playersMin = isset($_POST['players_min']) ? (int)$_POST['players_min'] : 0;
$playersMax = isset($_POST['players_max']) ? (int)$_POST['players_max'] : 0;
$isActive = isset($_POST['is_active']) && (int)$_POST['is_active'] === 0 ? 0 : 1;

if ($gameId <= 0) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid game ID"]);
}

if ($gameName === '' || $genre === '') {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Game name and genre are required"]);
}

if ($playersMin <= 0 || $playersMax <= 0 || $playersMin > $playersMax) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid player counts"]);
}

try {
    $stmt = $pdo->prepare('UPDATE boardgame SET game_name = ?, genre = ?, players_min = ?, players_max = ?, is_active = ? WHERE game_id = ?');
    $stmt->execute([$gameName, $genre, $playersMin, $playersMax, $isActive, $gameId]);
    respond(200, ["success" => true, "status" => "OK", "message" => "Boardgame updated"]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Failed to update boardgame"]);
}
