<?php
require 'config.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["status" => "ERROR", "message" => "Forbidden"]);
    exit;
}

$gameId = (int)($_POST['game_id'] ?? 0);
$gameName = trim($_POST['game_name'] ?? '');
$genre = trim($_POST['genre'] ?? '');
$playersMin = (int)($_POST['players_min'] ?? 0);
$playersMax = (int)($_POST['players_max'] ?? 0);
$isActive = isset($_POST['is_active']) && (int)$_POST['is_active'] === 0 ? 0 : 1;

if ($gameId <= 0 || $gameName === '' || $playersMin <= 0 || $playersMax <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Invalid boardgame data"]);
    exit;
}

if ($playersMin > $playersMax) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Min players cannot exceed max players"]);
    exit;
}

$stmt = $pdo->prepare("UPDATE boardgame SET game_name = ?, genre = ?, players_min = ?, players_max = ?, is_active = ? WHERE game_id = ?");
$stmt->execute([$gameName, $genre, $playersMin, $playersMax, $isActive, $gameId]);

echo json_encode(["status" => "OK"]);
