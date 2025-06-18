-- Default homepage:

-- Create a default route first
REPLACE INTO `routes` (`id`, `path`, `router`, `cache_ttl_seconds`, `enabled`, `created_at`) VALUES (1, '/home', 'cmsPages', 3600, 1, NOW());

-- Create a default homepage with route_id reference
REPLACE INTO `cms_pages` (
    `id`, `title`, `content`, `template`, `route_id`, `meta_title`, `meta_description`,
    `canonical_url`, `meta_robots`, `meta_og_title`, `meta_og_description`,
    `meta_og_image`, `meta_twitter_card_type`, `status`, `locale`, `publish_date`, `expire_date`, `created_at`
) VALUES (
    1,
    'Home',
    '<h1>Welcome to Reldens CMS</h1><p>This is your homepage. Edit this content in the admin panel.</p>',
    NULL,
    1,
    'Home - Reldens CMS',
    'Welcome to Reldens CMS',
    NULL,
    'index,follow',
    'Home - Reldens CMS',
    'Welcome to the Reldens CMS homepage',
    NULL,
    'summary',
    'published',
    'en',
    NOW(),
    NULL,
    NOW()
);
