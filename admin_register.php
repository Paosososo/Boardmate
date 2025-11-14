<?php
require 'config.php';

header('Content-Type: application/json');

$fullName = trim($_POST['full_name'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$inviteCode = trim($_POST['admin_invite_code'] ?? '');
$expectedCode = "BOARDMATE-ADMIN-2025";

if ($fullName === '' || $email === '' || $password === '' || $inviteCode === '') {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "All fields are required"]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["status" => "ERROR", "message" => "Invalid email address"]);
    exit;
}

if (!hash_equals($expectedCode, $inviteCode)) {
    http_response_code(403);
    echo json_encode(["status" => "ERROR", "message" => "Invalid invite code"]);
    exit;
}

// check dup email
$check = $pdo->prepare("SELECT user_id FROM user WHERE email = ?");
$check->execute([$email]);
if ($check->fetch()) {
    http_response_code(409);
    echo json_encode(["status" => "ERROR", "message" => "Email already registered"]);
    exit;
}

$hashed = password_hash($password, PASSWORD_BCRYPT);
$insert = $pdo->prepare("INSERT INTO user (full_name, email, password, role) VALUES (?, ?, ?, 'admin')");
$insert->execute([$fullName, $email, $hashed]);
$newId = (int)$pdo->lastInsertId();

session_start();
session_regenerate_id(true);
$_SESSION['user_id'] = $newId;
$_SESSION['role'] = 'admin';

echo json_encode([
    "status" => "OK",
    "user" => [
        "id" => $newId,
        "name" => $fullName,
        "role" => "admin"
    ]
]);
