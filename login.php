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

// ตรวจสอบรหัสผ่าน (รองรับทั้ง hash และ plain text เก่า)
$isValid = password_verify($password, $user['password']);
if (!$isValid && hash_equals($user['password'], $password)) {
    $isValid = true;

    // upgrade plain text password to hashed version
    if (strlen($user['password']) < 60) {
        $newHash = password_hash($password, PASSWORD_BCRYPT);
        $update = $pdo->prepare("UPDATE user SET password = ? WHERE user_id = ?");
        $update->execute([$newHash, $user['user_id']]);
    }
}

if (!$isValid) {
    http_response_code(401);
    echo "Wrong password";
    exit;
}

// ตั้ง session
session_start();
session_regenerate_id(true);
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
