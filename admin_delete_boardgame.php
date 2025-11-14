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
if ($gameId <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Missing game_id"]);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM boardgame WHERE game_id = ?");
    $stmt->execute([$gameId]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["status" => "ERROR", "message" => "Cannot delete boardgame while it is linked to bookings"]);
        exit;
    }
    throw $e;
}

echo json_encode(["status" => "OK"]);
