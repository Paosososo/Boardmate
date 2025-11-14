\<?php
require 'config.php';

$full_name = $_POST['full_name'] ?? '';
$email     = $_POST['email'] ?? '';
$password  = $_POST['password'] ?? '';

if (!$full_name || !$email || !$password) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Missing fields"]);
    exit;
}

// เช็กอีเมลซ้ำ
$stmt = $pdo->prepare("SELECT user_id FROM user WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(["status" => "ERROR", "message" => "Email already registered"]);
    exit;
}

$hashed = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO user (full_name, email, password, role) VALUES (?, ?, ?, 'user')");
$stmt->execute([$full_name, $email, $hashed]);

$newId = $pdo->lastInsertId();

header('Content-Type: application/json');
echo json_encode([
    "status" => "OK",
    "user_id" => (int)$newId,
    "full_name" => $full_name
]);