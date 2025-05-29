
-- Default CMS blocks:

REPLACE INTO `cms_blocks` (`name`, `title`, `content`, `is_active`) VALUES
    ('header-main', 'Main Header', '{{>header}}', 1),
    ('sidebar-left', 'Left Sidebar', '<aside class="sidebar-left">{{>sidebar}}</aside>', 1),
    ('sidebar-right', 'Right Sidebar', '<aside class="sidebar-right">{{>sidebar}}</aside>', 1),
    ('footer-main', 'Main Footer', '{{>footer}}', 1);
