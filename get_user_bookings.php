<?php
require 'config.php';
session_start();

$user_id = $_SESSION['user_id'] ?? ($_POST['user_id'] ?? ($_GET['user_id'] ?? null));
if (!$user_id) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "user_id required"]);
    exit;
}

try {
    $stmt = $pdo->prepare("CALL get_user_bookings(?)");
    $stmt->execute([$user_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    header('Content-Type: application/json');
    echo json_encode(["success" => true, "bookings" => $rows]);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
