
-- Default CMS Forms

CREATE TABLE `cms_forms` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `form_key` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_0900_ai_ci',
    `fields_schema` JSON NOT NULL,
    `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '0',
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE INDEX `form_key` (`form_key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cms_forms_submitted` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `form_id` INT UNSIGNED NOT NULL,
    `submitted_values` JSON NOT NULL,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `FK__cms_forms` (`form_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
