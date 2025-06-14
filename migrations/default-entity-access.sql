
-- Default entity access rules:

REPLACE INTO `entities_access` (`entity_name`, `is_public`, `allowed_operations`) VALUES
    ('cms_pages', TRUE, '["read"]'),
    ('routes', FALSE, '[]'),
    ('users', FALSE, '[]'),
    ('cms_blocks', FALSE, '[]'),
    ('entities_access', FALSE, '[]');
