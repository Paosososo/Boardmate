<?php
require 'config.php';
session_start();

$user_id = $_SESSION['user_id'] ?? ($_GET['user_id'] ?? null);
if (!$user_id) {
    http_response_code(400);
    echo "user_id required";
    exit;
}

$stmt = $pdo->prepare("CALL get_user_bookings(?)");
$stmt->execute([$user_id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($rows);
