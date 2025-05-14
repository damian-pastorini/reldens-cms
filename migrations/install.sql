
-- Install SQL for Reldens CMS

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

CREATE TABLE IF NOT EXISTS `routes` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `router` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `content_id` INT(10) UNSIGNED NOT NULL,
    `title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `meta_description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `canonical_url` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `meta_robots` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'index,follow',
    `og_title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `og_description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `og_image` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `twitter_card_type` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'summary',
    `status` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published',
    `publish_at` TIMESTAMP NULL,
    `locale` VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'en',
    `cache_ttl_seconds` INT UNSIGNED NULL DEFAULT 3600,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `path` (`path`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cms_pages_meta` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `page_id` INT(10) UNSIGNED NOT NULL,
    `layout` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `publish_date` TIMESTAMP NULL,
    `expire_date` TIMESTAMP NULL,
    `author_id` INT(10) UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    KEY `page_id` (`page_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cms_pages` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `content` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `markdown` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `json_data` JSON NULL,
    `template` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `entities_meta` (
    `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
    `entity_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `entity_id` INT(10) UNSIGNED NOT NULL,
    `meta_key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `meta_value` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `entity_meta` (`entity_name`, `entity_id`, `meta_key`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a default homepage route if not exists
INSERT IGNORE INTO `cms_pages` (`id`, `title`, `content`, `template`, `created_at`) VALUES
(1, 'Home', '<h1>Welcome to Reldens CMS</h1><p>This is your homepage. Edit this content in the admin panel.</p>', 'page', NOW());

-- Create a default route to the homepage
INSERT IGNORE INTO `routes` (`path`, `router`, `content_id`, `title`, `meta_description`, `status`, `created_at`) VALUES
('/home', 'cms_pages', 1, 'Home', 'Welcome to Reldens CMS', 'published', NOW());
