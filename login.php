<?php
// login.php
require 'config.php';

$email    = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo "Missing email or password";
    exit;
}

$stmt = $pdo->prepare("SELECT user_id, full_name, email, password, role FROM user WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo "User not found";
    exit;
}

// ตรวจสอบรหัสผ่าน
if (!password_verify($password, $user['password'])) {
    http_response_code(401);
    echo "Wrong password";
    exit;
}

// ตั้ง session
session_start();
$_SESSION['user_id'] = $user['user_id'];
$_SESSION['role']    = $user['role'];

header('Content-Type: application/json');
echo json_encode([
    "status" => "OK",
    "user" => [
        "id"   => $user['user_id'],
        "name" => $user['full_name'],
        "role" => $user['role']
    ]
]);