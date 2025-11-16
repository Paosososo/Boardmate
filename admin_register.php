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

$fullName = trim($_POST['full_name'] ?? '');
$email = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';
$inviteCode = trim($_POST['admin_invite_code'] ?? '');
$expectedCode = 'BOARDMATE-ADMIN-2025';

if ($fullName === '' || $email === '' || $password === '' || $inviteCode === '') {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "All fields are required."]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Invalid email address."]);
}

if (strlen($password) < 6) {
    respond(400, ["success" => false, "status" => "ERROR", "message" => "Password must be at least 6 characters."]);
}

if (!hash_equals($expectedCode, $inviteCode)) {
    respond(403, ["success" => false, "status" => "ERROR", "message" => "Invalid admin invite code."]);
}

try {
    $stmt = $pdo->prepare('SELECT user_id FROM user WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respond(409, ["success" => false, "status" => "ERROR", "message" => "Email already registered."]);
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO user (full_name, email, password, role) VALUES (?, ?, ?, 'admin')");
    $stmt->execute([$fullName, $email, $hashedPassword]);

    $newId = (int)$pdo->lastInsertId();
    $_SESSION['user_id'] = $newId;
    $_SESSION['role'] = 'admin';

    respond(200, [
        "success" => true,
        "status" => "OK",
        "user" => [
            "id" => $newId,
            "name" => $fullName,
            "full_name" => $fullName,
            "email" => $email,
            "role" => "admin"
        ]
    ]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "status" => "ERROR", "message" => "Admin registration failed."]);
}
