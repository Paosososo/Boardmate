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

$full_name = trim($_POST['full_name'] ?? '');
$email     = trim($_POST['email'] ?? '');
$password  = $_POST['password'] ?? '';

if ($full_name === '' || $email === '' || $password === '') {
    respond(400, ["success" => false, "error" => "Missing fields"]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, ["success" => false, "error" => "Invalid email address"]);
}

if (strlen($password) < 6) {
    respond(400, ["success" => false, "error" => "Password must be at least 6 characters"]);
}

try {
    $stmt = $pdo->prepare('SELECT user_id FROM user WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respond(409, ["success" => false, "error" => "Email already registered"]);
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO user (full_name, email, password, role) VALUES (?, ?, ?, 'user')");
    $stmt->execute([$full_name, $email, $hashed]);

    $newId = (int)$pdo->lastInsertId();
    $_SESSION['user_id'] = $newId;
    $_SESSION['role'] = 'user';

    respond(200, [
        "success" => true,
        "user" => [
            "id" => $newId,
            "full_name" => $full_name,
            "name" => $full_name,
            "email" => $email,
            "role" => "user"
        ]
    ]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "error" => "Registration failed"]);
}
