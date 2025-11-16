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

$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if ($email === '' || $password === '') {
    respond(400, ["success" => false, "error" => "Missing email or password"]);
}

try {
    $stmt = $pdo->prepare('SELECT user_id, full_name, email, password, role FROM user WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    $isValidPassword = false;
    if ($user) {
        $storedPassword = (string)$user['password'];
        if (password_verify($password, $storedPassword)) {
            $isValidPassword = true;
        } elseif ($storedPassword !== '' && hash_equals($storedPassword, $password)) {
            // Support legacy plain-text passwords
            $isValidPassword = true;
        }
    }

    if (!$user || !$isValidPassword) {
        respond(401, ["success" => false, "error" => "Invalid email or password"]);
    }

    $_SESSION['user_id'] = (int)$user['user_id'];
    $_SESSION['role']    = $user['role'];

    respond(200, [
        "success" => true,
        "user" => [
            "id" => (int)$user['user_id'],
            "name" => $user['full_name'],
            "full_name" => $user['full_name'],
            "email" => $user['email'],
            "role" => $user['role']
        ]
    ]);
} catch (PDOException $e) {
    respond(500, ["success" => false, "error" => "Login failed"]);
}
