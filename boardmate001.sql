-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 09, 2025 at 05:59 PM
-- Server version: 5.7.24
-- PHP Version: 8.3.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `boardmate001`
--

DELIMITER $$
--
-- Procedures
--
CREATE PROCEDURE create_booking(
  IN p_user_id INT,
  IN p_room_id INT,
  IN p_booking_date DATE,
  IN p_start TIME,
  IN p_end TIME,
  IN p_game_id INT
) BEGIN
   IF p_game_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'game_id required';
    END IF;

    INSERT INTO booking (user_id, room_id, game_id, booking_date, start_time, end_time, status)
    VALUES (p_user_id, p_room_id, p_game_id, p_booking_date, p_start, p_end, 'unpaid');

    SELECT LAST_INSERT_ID() AS booking_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `finalize_payment` (
  IN `p_booking_id` INT,
  IN `p_method` VARCHAR(20),
  IN `p_amount` DECIMAL(10,2),
  IN `p_card_number` VARCHAR(32),
  IN `p_card_cvv` VARCHAR(8)
)   BEGIN
    INSERT INTO payment (booking_id, amount, method, status, card_number, card_cvv)
    VALUES (p_booking_id, p_amount, p_method, 'paid', p_card_number, p_card_cvv);

    UPDATE booking
    SET status = 'paid'
    WHERE booking_id = p_booking_id;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_user_bookings` (IN `p_user_id` INT)   BEGIN
    SELECT b.booking_id,
           b.booking_date,
           b.start_time,
           b.end_time,
           b.status,
           r.room_name,
           r.price_per_hour,
           bg.game_name
    FROM booking b
    JOIN room r ON b.room_id = r.room_id
    LEFT JOIN boardgame bg ON b.game_id = bg.game_id
    WHERE b.user_id = p_user_id
    ORDER BY b.booking_date DESC, b.start_time DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `set_booking_game` (IN `p_booking_id` INT, IN `p_game_id` INT)   BEGIN
    UPDATE booking
    SET game_id = p_game_id
    WHERE booking_id = p_booking_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `boardgame`
--

CREATE TABLE `boardgame` (
  `game_id` int(10) UNSIGNED NOT NULL,
  `game_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `genre` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `players_min` tinyint(3) UNSIGNED DEFAULT '2',
  `players_max` tinyint(3) UNSIGNED DEFAULT '6',
  `how_to_play` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `boardgame`
--

INSERT INTO `boardgame` (`game_id`, `game_name`, `genre`, `players_min`, `players_max`, `how_to_play`, `is_active`, `created_at`) VALUES
(1, 'Coup', 'Bluffing', 2, 6, 'Collect income to build influence.\nUse character actions boldly.\nBluff opponents and challenge lies.\nBe the last agent with influence.', 1, '2025-11-09 14:54:23'),
(2, 'Monopoly', 'Economic', 2, 6, 'Roll dice to travel the board.\nBuy properties you land on.\nBuild houses to raise rent.\nBankrupt rivals with clever trades.', 1, '2025-11-09 14:54:23'),
(3, 'Sushi Go!', 'Drafting', 2, 4, 'Pick one card and pass the rest.\nCollect matching sushi sets.\nBalance rolls, sashimi, and desserts.\nHighest total after three rounds wins.', 1, '2025-11-09 14:54:23'),
(4, 'Decrypto', 'Party', 3, 8, 'Split into two clue-giving teams.\nDescribe secret words with coded hints.\nIntercept and decode rival clues.\nFirst to miscommunicate twice loses.', 1, '2025-11-09 14:54:23');

-- --------------------------------------------------------

--
-- Table structure for table `booking`
--

CREATE TABLE `booking` (
  `booking_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `room_id` int(10) UNSIGNED NOT NULL,
  `game_id` int(10) UNSIGNED DEFAULT NULL,
  `booking_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('draft','unpaid','paid','cancelled','checked_in') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking`
--

INSERT INTO `booking` (`booking_id`, `user_id`, `room_id`, `game_id`, `booking_date`, `start_time`, `end_time`, `status`, `created_at`) VALUES
(11, 10, 1, NULL, '2025-11-09', '10:00:00', '11:00:00', 'draft', '2025-11-10 00:46:12'),
(12, 10, 2, 1, '2025-11-09', '10:00:00', '11:00:00', 'unpaid', '2025-11-10 00:58:43');

--
-- Triggers `booking`
--
DELIMITER $$
CREATE TRIGGER `trg_booking_no_overlap` BEFORE INSERT ON `booking` FOR EACH ROW BEGIN
    -- ถ้ามีจองเวลา "เหลื่อมกันจริงๆ" ในห้องเดียวกัน วันเดียวกัน -> ห้าม
    IF EXISTS (
        SELECT 1
        FROM booking
        WHERE room_id = NEW.room_id
          AND booking_date = NEW.booking_date
          AND status <> 'cancelled'
          AND status = 'paid'
          -- เงื่อนไขซ้อนเวลาแบบอนุญาตให้ต่อหางได้
          AND (NEW.start_time < end_time AND NEW.end_time > start_time)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room already booked for this time slot';
    END IF;
END
$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER trg_booking_require_game
BEFORE INSERT ON booking
FOR EACH ROW
BEGIN
  IF NEW.game_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'game_id required on insert';
  END IF;
END$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `feedback_id` int(10) UNSIGNED NOT NULL,
  `booking_id` int(10) UNSIGNED NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `feedback`
--
DELIMITER $$
CREATE TRIGGER `trg_feedback_set_time` BEFORE INSERT ON `feedback` FOR EACH ROW BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = NOW();
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `payment`
--

CREATE TABLE `payment` (
  `payment_id` int(10) UNSIGNED NOT NULL,
  `booking_id` int(10) UNSIGNED NOT NULL,
  `payment_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'qr',
  `card_number` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `card_cvv` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','paid','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `payment`
--
DELIMITER $$
CREATE TRIGGER `trg_payment_update_booking` AFTER INSERT ON `payment` FOR EACH ROW BEGIN
    IF NEW.status = 'paid' THEN
        UPDATE booking
        SET status = 'paid'
        WHERE booking_id = NEW.booking_id;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `room`
--

CREATE TABLE `room` (
  `room_id` int(10) UNSIGNED NOT NULL,
  `room_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_per_hour` decimal(10,2) NOT NULL,
  `status` enum('available','unavailable','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `capacity` smallint(5) UNSIGNED NOT NULL,
  `time_slot` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '10:00-20:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `room`
--

INSERT INTO `room` (`room_id`, `room_name`, `price_per_hour`, `status`, `capacity`, `time_slot`) VALUES
(1, 'Small Room', 150.00, 'available', 4, '10:00-20:00'),
(2, 'Medium Room', 220.00, 'available', 6, '10:00-20:00'),
(3, 'Large Room', 350.00, 'available', 10, '10:00-20:00');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','user') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `full_name`, `email`, `password`, `role`, `created_at`) VALUES
(1, 'Admin', 'admin@boardmate.com', 'admin1234', 'admin', '2025-11-09 14:54:23'),
(2, 'Test User', 'test@example.com', '123456', 'user', '2025-11-09 14:54:23'),
(10, 'test', 'test@gmail.com', '$2y$10$LeMB6V5lKiioMoUTAipIZOQdbOFzfo0aMRww9vNDQYF0A0ZxocdiG', 'user', '2025-11-09 23:26:23');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `boardgame`
--
ALTER TABLE `boardgame`
  ADD PRIMARY KEY (`game_id`);

--
-- Indexes for table `booking`
--
ALTER TABLE `booking`
  ADD PRIMARY KEY (`booking_id`),
  ADD KEY `fk_booking_user` (`user_id`),
  ADD KEY `fk_booking_room` (`room_id`),
  ADD KEY `fk_booking_game` (`game_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`feedback_id`),
  ADD KEY `fk_feedback_booking` (`booking_id`);

--
-- Indexes for table `payment`
--
ALTER TABLE `payment`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `fk_payment_booking` (`booking_id`);

--
-- Indexes for table `room`
--
ALTER TABLE `room`
  ADD PRIMARY KEY (`room_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `boardgame`
--
ALTER TABLE `boardgame`
  MODIFY `game_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `booking_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `feedback_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `payment`
--
ALTER TABLE `payment`
  MODIFY `payment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `room`
--
ALTER TABLE `room`
  MODIFY `room_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `fk_booking_game` FOREIGN KEY (`game_id`) REFERENCES `boardgame` (`game_id`),
  ADD CONSTRAINT `fk_booking_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`room_id`),
  ADD CONSTRAINT `fk_booking_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `fk_feedback_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE;

--
-- Constraints for table `payment`
--
ALTER TABLE `payment`
  ADD CONSTRAINT `fk_payment_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
