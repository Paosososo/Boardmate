<?php
// login.php
require 'config.php';

header('Content-Type: application/json');

// เริ่ม session ถ้ายังไม่เริ่ม
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * ฟังก์ชันช่วยส่ง response แบบ JSON + กำหนด HTTP status code
 */
function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

// อ่านค่าจาก POST
$email    = trim($_POST['email'] ?? '');
$password = $_POST['password'] ?? '';

if ($email === '' || $password === '') {
    respond(400, [
        "success" => false,
        "error"   => "Missing email or password"
    ]);
}

try {
    // ดึง user จาก email
    $stmt = $pdo->prepare("SELECT user_id, full_name, email, password, role FROM user WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // ไม่บอกว่า user ไม่เจอหรือ password ผิด เพื่อความปลอดภัย
        respond(401, [
            "success" => false,
            "error"   => "Invalid email or password"
        ]);
    }

    $hashFromDb = $user['password'];

    // 1) เช็กแบบปกติ (รองรับ bcrypt / password_hash)
    $isValid = password_verify($password, $hashFromDb);

    // 2) ถ้ายังไม่ผ่าน ลองเช็กว่าเป็น plain text เก่ารึเปล่า
    if (!$isValid && hash_equals($hashFromDb, $password)) {
        $isValid = true;

        // ถ้าดูจาก length แล้วน่าจะยังไม่ใช่ bcrypt → upgrade เป็น hash ใหม่
        if (strlen($hashFromDb) < 60) {
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $update = $pdo->prepare("UPDATE user SET password = ? WHERE user_id = ?");
            $update->execute([$newHash, $user['user_id']]);
        }
    }

    if (!$isValid) {
        respond(401, [
            "success" => false,
            "error"   => "Invalid email or password"
        ]);
    }

    // ผ่านแล้ว → ตั้ง session
    session_regenerate_id(true); // กัน session fixation
    $_SESSION['user_id'] = (int)$user['user_id'];
    $_SESSION['role']    = $user['role'];

    respond(200, [
        "success" => true,
        "user"    => [
            "id"        => (int)$user['user_id'],
            "name"      => $user['full_name'],
            "full_name" => $user['full_name'],
            "email"     => $user['email'],
            "role"      => $user['role'],
        ]
    ]);

} catch (PDOException $e) {
    // ไม่ต้องบอก error จริงให้ฝั่ง client รู้
    respond(500, [
        "success" => false,
        "error"   => "Login failed"
    ]);
}
