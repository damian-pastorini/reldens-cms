
-- Install Reldens CMS

CREATE TABLE IF NOT EXISTS `routes` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `router` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `content_id` INT UNSIGNED NOT NULL,
    `cache_ttl_seconds` INT UNSIGNED NULL DEFAULT 3600,
    `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '1',
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `path` (`path`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cms_categories` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
    `title` VARCHAR(255) NOT NULL COLLATE 'utf8mb4_unicode_ci',
    `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '1',
    `parent_id` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `FK_cms_categories_cms_categories` (`parent_id`) USING BTREE,
    CONSTRAINT `FK_cms_categories_cms_categories` FOREIGN KEY (`parent_id`) REFERENCES `cms_categories` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cms_pages` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `content` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `markdown` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `json_data` JSON NULL,
    `template` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `layout` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'default',
    `category_id` INT UNSIGNED NULL DEFAULT NULL,
    `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '1',
    `meta_title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `meta_description` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `meta_robots` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'index,follow',
    `meta_theme_color` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb4_unicode_ci',
    `meta_og_title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `meta_og_description` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `meta_og_image` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `meta_twitter_card_type` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'summary',
    `canonical_url` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `status` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published',
    `locale` VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'en',
    `publish_date` TIMESTAMP NULL,
    `expire_date` TIMESTAMP NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    INDEX `FK_cms_pages_cms_categories` (`category_id`) USING BTREE,
    CONSTRAINT `FK_cms_pages_cms_categories` FOREIGN KEY (`category_id`) REFERENCES `cms_categories` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cms_blocks` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `content` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '1',
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `name` (`name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `entities_access` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `entity_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `is_public` TINYINT UNSIGNED NOT NULL DEFAULT '0',
    `allowed_operations` JSON NULL DEFAULT ('["read"]'),
    `access_rules` JSON NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`) USING BTREE,
    UNIQUE KEY `entity_name` (`entity_name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
