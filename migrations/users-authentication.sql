
-- Default db-users authentication:

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `username` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `password` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `role_id` INT(10) UNSIGNED NOT NULL,
    `status` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `email` (`email`) USING BTREE,
    UNIQUE KEY `username` (`username`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
