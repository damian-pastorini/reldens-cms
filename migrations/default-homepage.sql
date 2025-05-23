
-- Default homepage:

-- Create a default homepage route if not exists
REPLACE INTO `cms_pages` (`id`, `title`, `content`, `template`, `created_at`) VALUES
(1, 'Home', '<h1>Welcome to Reldens CMS</h1><p>This is your homepage. Edit this content in the admin panel.</p>', 'page', NOW());

-- Create a default route to the homepage
REPLACE INTO `routes` (`id`, `path`, `router`, `content_id`, `title`, `meta_description`, `status`, `created_at`) VALUES
(1, '/home', 'cmsPages', 1, 'Home', 'Welcome to Reldens CMS', 'published', NOW());
