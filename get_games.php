<?php
require 'config.php';

$stmt = $pdo->query("SELECT game_id, game_name, genre, players_min, players_max, how_to_play FROM boardgame WHERE is_active = 1 ORDER BY game_name");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($rows);
