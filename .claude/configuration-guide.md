# Configuration Guide

## Environment Variables

```env
RELDENS_APP_HOST=http://localhost
RELDENS_APP_PORT=8080
RELDENS_ADMIN_ROUTE_PATH=/admin
RELDENS_ADMIN_SECRET=your-secret-key

RELDENS_DB_CLIENT=mysql
RELDENS_DB_HOST=localhost
RELDENS_DB_PORT=3306
RELDENS_DB_NAME=cms_db
RELDENS_DB_USER=username
RELDENS_DB_PASSWORD=password
RELDENS_STORAGE_DRIVER=prisma

RELDENS_DEFAULT_DOMAIN=example.com
RELDENS_DOMAIN_MAPPING={"dev.example.com":"development"}
RELDENS_SITE_KEY_MAPPING={"example.com":"main"}
```

## Template Reloading Configuration

Configure template reloading for development environments:

```javascript
const cms = new Manager({
    // Development: reload templates on every request when changes detected
    reloadTime: -1,

    // Production: disable template reloading (default)
    reloadTime: 0,

    // Interval-based: reload every 5 seconds when changes detected
    reloadTime: 5000
});
```

**Template Reloading Options:**

- `reloadTime: 0` (default) - Template reloading disabled. Templates load once at startup.
- `reloadTime: -1` - Reload templates on every request when file changes are detected. Best for active development.
- `reloadTime: > 0` - Check for template changes at specified interval (milliseconds) and reload when needed. Good for development with lower overhead.

**How it works:**

- Tracks file modification times for admin and frontend templates
- Only reloads templates that have actually changed
- Automatically updates admin contents and frontend template cache
- Works with both admin panel templates and frontend templates/partials
- Zero performance impact when disabled (`reloadTime: 0`)

## Custom Entity Configuration

```javascript
const entityConfig = {
    articles: {
        listProperties: ['title', 'status', 'created_at'],
        showProperties: ['title', 'content', 'author', 'status'],
        editProperties: ['title', 'content', 'author_id', 'status'],
        filterProperties: ['status', 'author_id'],
        titleProperty: 'title',
        parentItemLabel: 'Content',
        properties: {
            title: { type: 'string', isRequired: true },
            content: { type: 'text' },
            author_id: { type: 'reference', reference: 'users' },
            featured_image: {
                type: 'string',
                isUpload: true,
                allowedTypes: 'image',
                bucket: 'uploads'
            }
        }
    }
};

const cms = new Manager({
    entitiesConfig: entityConfig
});
```

## Manager Configuration Options

```javascript
const cms = new Manager({
    projectRoot: process.cwd(),

    // Entity Access Control
    entityAccess: {
        cmsPages: { public: true, operations: ['read'] },
        articles: { public: true, operations: ['read'] },
        users: { public: false }
    },

    // Authentication
    authenticationMethod: 'db-users',
    adminRoleId: 99,
    authenticationCallback: async (email, password, roleId) => {
        return await yourAuthService.validate(email, password, roleId);
    },

    // Performance
    cache: true,
    reloadTime: 0,

    // Multi-Domain
    defaultDomain: 'example.com',
    domainMapping: {'dev.example.com': 'development'},
    siteKeyMapping: {'example.com': 'main'},

    // Custom Entities
    entitiesConfig: entityConfig,
    entitiesTranslations: {},
    adminTranslations: {},

    // Optional Custom Services
    app: customExpressApp,
    appServer: customAppServer,
    dataServer: customDataServer,
    adminManager: customAdmin,
    frontend: customFrontend
});
```
