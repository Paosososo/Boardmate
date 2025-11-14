<?php
require 'config.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["status" => "ERROR", "message" => "Forbidden"]);
    exit;
}

$stmt = $pdo->query("SELECT game_id, game_name, genre, players_min, players_max, is_active FROM boardgame ORDER BY game_name ASC");
$games = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "status" => "OK",
    "boardgames" => $games
]);
