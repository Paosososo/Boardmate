<?php
// add_feedback.php
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Method not allowed";
    exit;
}

$booking_id = $_POST['booking_id'] ?? null;
$rating     = $_POST['rating'] ?? null;
$comment    = $_POST['comment'] ?? '';

if (!$booking_id || !$rating) {
    http_response_code(400);
    echo "booking_id and rating are required";
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO feedback (booking_id, rating, comment) VALUES (?, ?, ?)");
    $stmt->execute([$booking_id, $rating, $comment]);

    echo "OK";
} catch (PDOException $e) {
    http_response_code(500);
    echo $e->getMessage();
}
