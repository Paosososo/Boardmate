<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

require 'config.php';

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function encryptSensitive(string $value, string $key): string {
    $iv = random_bytes(16);
    $cipherText = openssl_encrypt($value, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    if ($cipherText === false) {
        throw new RuntimeException('Encryption failed');
    }
    return base64_encode($iv . $cipherText);
}

$bookingId = isset($_POST['booking_id']) ? (int) $_POST['booking_id'] : 0;
$methodRaw = $_POST['method'] ?? 'qr';
$method    = in_array($methodRaw, ['qr', 'card'], true) ? $methodRaw : null;
$amount    = isset($_POST['amount']) && is_numeric($_POST['amount']) ? (float) $_POST['amount'] : 0.0;
$cardNumber = $_POST['card_number'] ?? null;
$cardCvv    = $_POST['card_cvv'] ?? null;
$sessionUserId = $_SESSION['user_id'] ?? null;

if ($bookingId <= 0) {
    respond(400, ['success' => false, 'error' => 'booking_id required']);
}
if ($amount <= 0) {
    respond(400, ['success' => false, 'error' => 'Invalid amount']);
}
if ($method === null) {
    respond(400, ['success' => false, 'error' => 'Invalid payment method']);
}
if (!$sessionUserId) {
    respond(401, ['success' => false, 'error' => 'Unauthorized']);
}

$cardNumberEnc = null;
$cardCvvEnc = null;

if ($method === 'card') {
    $digitsCard = preg_replace('/\D+/', '', (string) $cardNumber);
    $digitsCvv  = preg_replace('/\D+/', '', (string) $cardCvv);

    if ($digitsCard === '' || strlen($digitsCard) !== 16) {
        respond(400, ['success' => false, 'error' => 'Card number must be 16 digits']);
    }
    if ($digitsCvv === '' || strlen($digitsCvv) !== 3) {
        respond(400, ['success' => false, 'error' => 'CVV must be 3 digits']);
    }

    try {
        $cardNumberEnc = encryptSensitive($digitsCard, BOARDMATE_AES_KEY);
        $cardCvvEnc = encryptSensitive($digitsCvv, BOARDMATE_AES_KEY);
    } catch (Throwable $e) {
        respond(500, ['success' => false, 'error' => 'Failed to encrypt card data']);
    }
}

try {
    $pdo->beginTransaction();

    $bookingStmt = $pdo->prepare('SELECT booking_id, user_id, status FROM booking WHERE booking_id = :id LIMIT 1');
    $bookingStmt->execute(['id' => $bookingId]);
    $booking = $bookingStmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        $pdo->rollBack();
        respond(404, ['success' => false, 'error' => 'Booking not found']);
    }

    if ((int) $booking['user_id'] !== (int) $sessionUserId) {
        $pdo->rollBack();
        respond(403, ['success' => false, 'error' => 'Unauthorized']);
    }

    if ($booking['status'] === 'paid') {
        $pdo->rollBack();
        respond(409, ['success' => false, 'error' => 'Booking already paid']);
    }

    if ($booking['status'] === 'cancelled') {
        $pdo->rollBack();
        respond(409, ['success' => false, 'error' => 'Cannot pay for a cancelled booking']);
    }

    // ... after you’ve computed $cardNumberEnc and $cardCvvEnc (or left them null for QR)

$insert = $pdo->prepare(
    'INSERT INTO payment (
         booking_id,
         payment_date,
         amount,
         method,
         card_number,
         card_cvv,
         status
     ) VALUES (
         :booking_id,
         NOW(),
         :amount,
         :method,
         :card_number,
         :card_cvv,
         :status
     )'
);

$insert->execute([
    'booking_id' => $bookingId,
    'amount'     => $amount,
    'method'     => $method,
    // store encrypted values in the existing columns
    'card_number'=> $cardNumberEnc,  // null for QR payments
    'card_cvv'   => $cardCvvEnc,     // null for QR payments
    'status'     => 'paid',
]);

    $update = $pdo->prepare('UPDATE booking SET status = :status WHERE booking_id = :id');
    $update->execute(['status' => 'paid', 'id' => $bookingId]);

    $pdo->commit();

    respond(200, ['success' => true, 'status' => 'paid']);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('finalize_payment error: ' . $e->getMessage());
    respond(500, ['success' => false, 'error' => 'Failed to finalize payment']);
}
