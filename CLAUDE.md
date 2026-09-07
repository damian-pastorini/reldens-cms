## Package Overview

**@reldens/cms** is a comprehensive Content Management System package for Reldens. It provides a complete web application framework with:

- Database-driven content management with entity access control
- Multi-domain support with domain-specific templates
- Powerful template engine with Mustache integration
- Dynamic forms system with validation and security
- Search functionality with customizable templates
- Admin panel with full CRUD operations
- Template reloading for development
- Caching system for performance
- Event-driven architecture for extensibility
- Password encryption and management - Automatic password encryption with PBKDF2

## Key Commands

```bash
# Start CMS (runs installer if not installed)
npx reldens-cms

# Generate entities from database
npx reldens-cms-generate-entities

# Update user password via CLI
npx reldens-cms-update-password --email=admin@example.com

# Or via npm scripts
npm run generate-entities
```

## Quick Start

### Password Management

The CMS automatically encrypts passwords using PBKDF2 (100k iterations, SHA-512) when saving user records through the admin panel.

**CLI Password Update:**
```bash
# Interactive mode (recommended)
npx reldens-cms-update-password --email=admin@example.com
```

See `.claude/password-management-guide.md` for comprehensive password management documentation.

### Architecture

The CMS follows a modular architecture with specialized classes:

- **Manager** - Main CMS orchestrator
- **Frontend** - Frontend operations coordinator
- **Admin Manager** - Admin panel orchestrator
- **Template Engine** - Template processing and rendering
- **Dynamic Forms** - Form validation and processing
- **Search** - Multi-entity search functionality
- **Cache** - Domain and path-based caching

See `.claude/architecture-guide.md` for detailed architecture documentation.

### SEO: Sitemaps and Robots.txt

The CMS provides built-in support for dynamic robots.txt and sitemap.xml generation:

- `/robots.txt` - Static template with sitemap reference
- `/sitemap.xml` - Dynamic sitemap with automatic domain filtering

See `.claude/seo-guide.md` for detailed SEO documentation.

### Template System

Templates use a three-layer rendering system:

1. **Content Processing** - Variables, collections, entities, and forms
2. **Layout Wrapping** - Header, sidebar, footer structure
3. **Template Wrapping** - Final HTML document structure

**Template Functions:**
```html
<entity name="cmsBlocks" field="name" value="header-main"/>
<collection name="articles" filters="{featured: true}">
    <h3>{{row.title}}</h3>
</collection>
<cmsForm key="contactForm"/>
[url(/articles)]
[cdn(/css/styles.css)]
[asset(/web/logo.png)]
[date(now, Y-m-d)]
[translate(welcome.message)]
```

See `.claude/templating-system-guide.md` for detailed template documentation.

### Configuration

**Environment Variables (.env):**
```bash
RELDENS_APP_HOST=http://localhost
RELDENS_APP_PORT=8080
RELDENS_ADMIN_ROUTE_PATH=/admin
RELDENS_ADMIN_SECRET=your-secret-key
RELDENS_DB_CLIENT=mysql
RELDENS_STORAGE_DRIVER=mikro-orm
```

**Manager Configuration:**
```javascript
const { Manager } = require('@reldens/cms');

const cms = new Manager({
    projectRoot: process.cwd(),
    entityAccess: {
        articles: { public: true, operations: ['read'] }
    },
    authenticationMethod: 'db-users',
    enablePasswordEncryption: true,
    cache: true,
    reloadTime: -1,
    defaultDomain: 'example.com'
});

await cms.start();
```

See `.claude/configuration-guide.md` for detailed configuration documentation.

### Event System

The CMS provides extensive event hooks for customization:

**Manager Events:**
- `reldens.cmsManagerInitializeServices` - Before service initialization
- `reldens.manager.initializeAdminManager` - Before admin initialization

**Template Events:**
- `reldens.afterVariablesCreated` - Modify system variables
- `reldens.beforeContentProcess` - Before template processing
- `reldens.afterContentProcess` - After template processing

**Admin Events:**
- `reldens.adminBeforeEntitySave` - Before entity save
- `reldens.adminAfterEntitySave` - After entity save

See `.claude/advanced-usage-guide.md` for comprehensive event-driven customization patterns.

### Entity Config Overrides

Override generated entity configurations without editing generated files:

```javascript
class CmsPagesOverride
{
    static propertiesConfig(baseConfig, props)
    {
        baseConfig.properties.meta_og_image = {
            dbType: 'varchar',
            isUpload: true,
            allowedTypes: 'image',
            bucket: 'public/assets/media',
            bucketPath: '/assets/media/'
        };
        return baseConfig;
    }
}

const manager = new Manager({
    entitiesConfigOverride: {
        'cmsPages': CmsPagesOverride
    }
});
```

**CRITICAL:** Entity keys must match exactly as defined in `generated-entities/entities-config.js` (use camelCase: `'cmsPages'`, NOT kebab-case: `'cms-pages'`).

See `.claude/advanced-usage-guide.md` for detailed examples.

## Important Implementation Notes

1. **Always use specialized tools over bash** for file operations (Read, Edit, Write)
2. **Template resolution follows domain fallback** - check domain-specific templates first
3. **Entity access is controlled** via `entities_access` table - respect public/private flags
4. **Template functions are case-sensitive** - use exact syntax
5. **Collection pagination uses URL parameters** - preserve query strings
6. **Form schemas are JSON** - validate JSON structure
7. **System variables are always available** - no need to pass them manually
8. **Event hooks are async** - use await when emitting events
9. **Template reloading is development-only** - disable in production
10. **Multi-domain requires proper configuration** - set up domain mapping correctly
11. **Password encryption is automatic** - enabled by default for users entity
12. **Never store plain text passwords** - always use Encryptor.encryptPassword()
13. **Template extensions are consistent** - Manager, Frontend, TemplateResolver, and TemplateCache all use the same default extensions: `['.html', '.mustache', '.template', '.txt', '.xml', '.json']`
14. **Template names omit extensions** - Database template/layout fields should never include file extensions; the resolver automatically tries all configured extensions
15. **Sitemap generation is event-driven** - SitemapLoader listens to `reldens.afterVariablesCreated` and populates `sitemapPages` variable; data is cached on `req.sitemapPages` to avoid duplicate queries during multi-pass template rendering
16. **buildEnhancedRenderData merges all system variables** - Any custom variables added to `eventData.variables` in event listeners will automatically be available in templates via Mustache

## Common File Paths

- **Admin templates:** `admin/templates/`
- **Frontend templates:** `templates/`
- **Domain templates:** `templates/domains/{domain}/`
- **Entities:** `entities/` (generated)
- **Public assets:** `public/`
- **Environment:** `.env`
- **Install lock:** `install.lock`
- **Password CLI:** `bin/reldens-cms-update-password.js`
- **Password handler:** `lib/password-encryption-handler.js`

## Troubleshooting

### Installation

- Check database connection in `.env`
- Ensure Prisma schema is valid
- Verify Node.js version >= 20.0.0

### Templates

- Check logs for "Template not found" or "Template file not found" messages
- Verify template files exist in correct locations (domain → default → base)
- Ensure template names in database do NOT include file extensions
- Check `templateExtensions` configuration includes required extensions
- Verify domain mapping configuration
- Enable template reloading for development (`reloadTime: -1`)

### Forms

- Validate JSON schema syntax
- Check form key matches database
- Verify field names in schema

### Entities

- Regenerate entities after schema changes
- Check entity access configuration
- Verify relationship mappings

### Passwords

- Verify password is encrypted (contains `:` and is 192 chars)
- Check `enablePasswordEncryption` is `true` in Manager config
- Use CLI command for password updates: `npx reldens-cms-update-password`
- For debugging, set `RELDENS_LOG_LEVEL=9` to see password encryption logs

## Dependencies

- **@reldens/storage** - Database abstraction layer
- **@reldens/server-utils** - Server utilities (AppServerFactory, FileHandler, Encryptor)
- **@reldens/utils** - Common utilities (EventsManager, Logger, SchemaValidator)
- **dotenv** - Environment variable management
- **mustache** - Template engine

## Additional Resources

**Comprehensive Guides:**
- `.claude/installation-guide.md` - Installation and setup
- `.claude/architecture-guide.md` - Detailed architecture documentation
- `.claude/configuration-guide.md` - Configuration options and examples
- `.claude/database-schema.md` - Database tables and schema
- `.claude/templating-system-guide.md` - Template system and functions
- `.claude/forms-system-guide.md` - Dynamic forms system
- `.claude/search-guide.md` - Search functionality
- `.claude/multi-domain-i18n-guide.md` - Multi-domain and internationalization
- `.claude/password-management-guide.md` - Password management
- `.claude/seo-guide.md` - SEO, sitemaps, and robots.txt
- `.claude/security-guide.md` - Security features and best practices
- `.claude/advanced-usage-guide.md` - Advanced customization and event patterns
- `.claude/api-reference.md` - API reference documentation

**Other Resources:**
- Main README.md for user documentation
- Package.json for dependency versions
- License: MIT
