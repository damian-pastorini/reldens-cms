
-- Default homepage:

-- Create a default homepage route if not exists
REPLACE INTO `cms_pages` (
    `id`, `title`, `content`, `template`, `meta_title`, `meta_description`,
    `canonical_url`, `meta_robots`, `meta_og_title`, `meta_og_description`,
    `meta_og_image`, `meta_twitter_card_type`, `status`, `locale`, `publish_date`, `expire_date`, `created_at`
) VALUES (
    1,
    'Home',
    '<h1>Welcome to Reldens CMS</h1><p>This is your homepage. Edit this content in the admin panel.</p>',
    NULL,
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

-- Create a default route to the homepage
REPLACE INTO `routes` (`id`, `path`, `router`, `content_id`, `cache_ttl_seconds`, `enabled`, `created_at`) VALUES (1, '/home', 'cmsPages', 1, 3600, 1, NOW());
