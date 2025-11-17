<?php
// config.php
$host = "localhost";
$db   = "boardmate001";
$user = "root";
$pass = "root";

if (!defined('BOARDMATE_AES_KEY')) {
    $defaultKey = 'CHANGE_ME_TO_A_SECURE_32_CHAR_KEY';
    $envKey = getenv('BOARDMATE_AES_KEY');
    define('BOARDMATE_AES_KEY', $envKey && strlen($envKey) >= 16 ? $envKey : $defaultKey);
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo "Database connection failed: " . $e->getMessage();
    exit;
}
