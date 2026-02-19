
-- Default robots.txt and sitemap.xml

INSERT INTO `routes` (`id`, `path`, `router`, `cache_ttl_seconds`, `enabled`, `created_at`) VALUES
(NULL, '/robots.txt', 'cmsPages', 3600, 1, NOW());
SET @route_id_robots = LAST_INSERT_ID();

INSERT INTO `cms_pages` (
    `id`, `title`, `content`, `template`, `layout`, `route_id`, `meta_robots`,
    `status`, `locale`, `publish_date`, `created_at`
) VALUES (
    NULL,
    'Robots.txt',
    NULL,
    'robots',
    'raw',
    @route_id_robots,
    'noindex,nofollow',
    NULL,
    NULL,
    NOW(),
    NOW()
);

INSERT INTO `routes` (`id`, `path`, `router`, `cache_ttl_seconds`, `enabled`, `domain`, `created_at`) VALUES
(NULL, '/sitemap.xml', 'cmsPages', 3600, 1, NULL, NOW());
SET @route_id_sitemap = LAST_INSERT_ID();

INSERT INTO `cms_pages` (
    `id`, `title`, `content`, `template`, `layout`, `route_id`, `meta_robots`,
    `status`, `locale`, `publish_date`, `created_at`
) VALUES (
    NULL,
    'Sitemap XML',
    NULL,
    'sitemap',
    'raw',
    @route_id_sitemap,
    'noindex,nofollow',
    NULL,
    NULL,
    NOW(),
    NOW()
);
