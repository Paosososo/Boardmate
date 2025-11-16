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
if ($gameId <= 0) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid game ID"]);
}

try {
    $stmt = $pdo->prepare('DELETE FROM boardgame WHERE game_id = ?');
    $stmt->execute([$gameId]);

    if ($stmt->rowCount() === 0) {
        respond(404, ["success" => false, "status" => "ERROR", "message" => "Boardgame not found"]);
    }

    respond(200, ["success" => true, "status" => "OK", "message" => "Boardgame deleted"]);
} catch (PDOException $e) {
    if ((int)$e->getCode() === 23000) {
        respond(409, ["success" => false, "status" => "ERROR", "message" => "Cannot delete a boardgame with active bookings"]);
    }
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Failed to delete boardgame"]);
}
