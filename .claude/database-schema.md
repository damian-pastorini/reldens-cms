# Database Schema

## Core Tables

- `routes` - URL routing and SEO metadata
- `cms_pages` - Page content with layout assignments
- `cms_blocks` - Reusable content blocks
- `entities_access` - Entity access control rules
- `entities_meta` - Generic metadata storage
- `cms_pages_meta` - Page-specific metadata

## Forms Tables

- `cms_forms` - Form configurations with JSON schema
- `cms_forms_submitted` - Form submissions with JSON data

## User Management Tables (Optional)

- `users` - User authentication with encrypted passwords
- `roles` - Role definitions

## Installation Options

The installer provides checkboxes for:

- CMS core tables
- User authentication system
- Default admin user
- Default homepage
- Default content blocks
- Entity access control rules
- Dynamic forms system
