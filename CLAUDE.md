# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Key Commands

```bash
# Start CMS (runs installer if not installed)
npx reldens-cms

# Generate entities from database
npx reldens-cms-generate-entities

# Or via npm scripts
npm run generate-entities
```

## Architecture Overview

The CMS follows a modular architecture with specialized classes following SOLID principles:

### Core Orchestrators

**lib/manager.js** - Main CMS orchestrator
- Initializes all services (data server, admin, frontend)
- Handles configuration and environment variables
- Manages multi-domain setup and security
- Coordinates service lifecycle

**lib/frontend.js** - Frontend orchestrator
- Coordinates all frontend operations
- Manages template engine, cache, and rendering
- Handles search and dynamic forms
- Routes requests to appropriate handlers

**lib/admin-manager.js** - Admin panel orchestrator
- Manages admin panel routes and authentication
- Handles entity CRUD operations
- Processes file uploads
- Builds admin UI from entity configurations

### Installation & Setup

**lib/installer.js** - Installation orchestrator
- Web-based installer with subprocess management
- Dependency checking and installation
- Database schema creation
- Environment file generation
- Post-installation callbacks

**lib/mysql-installer.js** - Database-specific installation
- MySQL schema creation
- Schema migration support
- Database validation

**lib/prisma-subprocess-worker.js** - Subprocess worker
- Handles Prisma client generation
- Progress tracking for long operations

### Frontend Architecture (lib/frontend/)

**template-resolver.js** - Template discovery
- Domain-aware template resolution
- Fallback system (domain → default → base)
- Layout and partial template lookup
- Path-to-template mapping

**template-cache.js** - Template caching
- Loads and caches partials
- Domain-specific template management
- Partial inheritance and overrides

**request-processor.js** - Request routing
- Route database lookup
- Domain extraction from requests
- Path normalization
- Cache key generation

**entity-access-manager.js** - Entity access control
- Loads entity access rules
- Public/private entity validation
- Entity lookup by path

**content-renderer.js** - Content generation
- Main content rendering logic
- Route-based content generation
- Template processing
- Meta field handling

**response-manager.js** - Response handling
- HTTP response management
- Cache integration
- Error handling (404, 500)

### Template Engine (lib/template-engine.js & lib/template-engine/)

**template-engine.js** - Core template processor
- Orchestrates all template transformers
- System variables injection
- Event-driven rendering pipeline
- Mustache integration

**Template Transformers:**
- **entities-transformer.js** - Single entity rendering `<entity name="cmsBlocks" field="name" value="header"/>`
- **collections-transformer.js** - Collection loops with pagination
- **collections-single-transformer.js** - Single field collections
- **partials-transformer.js** - Partial template processing
- **forms-transformer.js** - Dynamic forms rendering `<cmsForm key="contact"/>`
- **url-transformer.js** - URL generation `[url(/path)]`
- **asset-transformer.js** - Asset URLs `[asset(/img/logo.png)]`
- **cdn-transformer.js** - CDN URL transformation
- **date-transformer.js** - Date formatting `[date(now, Y-m-d)]`
- **translate-transformer.js** - Internationalization `[translate(key)]`

**system-variables-provider.js** - System variables
- Current request context (host, path, protocol)
- Current route data
- Current domain information
- System information (environment, timestamp)

**translation-service.js** - Translation loading
- JSON translation file management
- Locale detection
- Fallback handling

### Dynamic Forms System

**lib/dynamic-form.js** - Form validation and processing
- Schema-based validation
- Honeypot protection
- Rate limiting integration
- Data sanitization
- Database storage

**lib/dynamic-form-renderer.js** - Form template rendering
- Domain-aware form templates
- Field type templates
- Error display
- Form attribute handling

**lib/dynamic-form-request-handler.js** - Form request handling
- POST request processing
- Validation orchestration
- Success/error redirects
- JSON response support

### Search System

**lib/search.js** - Search functionality
- Multi-entity search
- Custom search sets
- Query parameter parsing
- Pagination support

**lib/search-renderer.js** - Search result rendering
- Template-based result display
- Custom column classes
- Domain-aware templates

**lib/search-request-handler.js** - Search request handling
- Query processing
- Template data support
- Error handling

### Cache System (lib/cache/)

**cache-manager.js** - Cache orchestrator
- Domain and path-based caching
- Cache invalidation
- Enable/disable functionality

**cache-routes-handler.js** - Cache admin routes
- Cache clearing endpoints
- Cache management UI integration

**add-cache-button-subscriber.js** - Cache UI integration
- Adds cache buttons to admin panel
- Event-driven cache controls

### Admin System (lib/admin-manager/)

**router.js** - Admin routing
- Authentication middleware
- Session management
- CRUD route setup
- File upload handling

**router-contents.js** - Admin content generation
- List view generation
- Edit form generation
- Relation handling
- Save/delete processing

**contents-builder.js** - Admin UI builder
- Sidebar navigation
- Entity list/edit views
- Form field generation
- Branding and styling

**admin-filters-manager.js** - Entity filtering
- Filter UI generation
- Query building

**default-translations.js** - Admin translations
- Default English labels
- Extensible translation system

### Utility Classes

**lib/entities-loader.js** - Entity loading from files
**lib/loaded-entities-processor.js** - Entity configuration processing
**lib/admin-entities-generator.js** - Admin entity configuration
**lib/admin-templates-loader.js** - Admin template loading
**lib/templates-to-path-mapper.js** - Template path mapping
**lib/templates-list.js** - Template file list
**lib/json-fields-parser.js** - JSON field parsing
**lib/pagination-handler.js** - Pagination logic
**lib/template-reloader.js** - Development template reloading
**lib/cms-pages-route-manager.js** - CMS page routing
**lib/admin-manager-validator.js** - Admin config validation
**lib/admin-dist-helper.js** - Admin asset distribution
**lib/mime-types.js** - File type definitions
**lib/allowed-extensions.js** - Upload extension whitelist

## Database Schema

The CMS uses these core tables:

### Content Tables
- **routes** - URL routing with SEO metadata (title, description, keywords)
- **cms_pages** - Page content with layout assignments
- **cms_blocks** - Reusable content blocks (by name identifier)
- **cms_forms** - Dynamic form configurations with JSON schema
- **cms_forms_submitted** - Form submission storage with JSON data

### Access Control
- **entities_access** - Entity visibility and operation rules
- **entities_meta** - Generic metadata storage
- **cms_pages_meta** - Page-specific metadata

### User Management (Optional)
- **users** - User authentication
- **roles** - Role definitions

## Template System

### Template Directory Structure
```
templates/
├── domains/                    # Domain-specific templates
│   └── example.com/
│       ├── layouts/           # Domain layouts
│       ├── partials/          # Domain partials
│       ├── cms_forms/         # Domain form templates
│       └── page.html          # Domain page wrapper
├── layouts/                   # Default layouts (body content only)
│   ├── default.html
│   └── full-width.html
├── partials/                  # Default partials
├── cms_forms/                 # Default form templates
│   ├── form.html
│   ├── field_text.html
│   └── field_email.html
├── translations/              # i18n files
│   ├── en.json
│   └── es.json
├── page.html                  # Base HTML wrapper
└── 404.html                   # Error page
```

### Template Resolution Order
1. Domain-specific: `templates/domains/{domain}/template.html`
2. Default: `templates/template.html`
3. Base: Package default templates

### Template Functions

**Entity Rendering:**
```html
<entity name="cmsBlocks" field="name" value="header-main"/>
<entity name="articles" id="123"/>
```

**Collection Loops:**
```html
<collection name="articles" filters="{featured: true}" data="{limit: 5, sortBy: 'created_at', sortDirection: 'desc'}">
    <div class="article">
        <h3>{{row.title}}</h3>
        <p>{{row.summary}}</p>
    </div>
</collection>
```

**Pagination:**
```html
<collection name="articles" filters="{}" data="{limit: 10}" pagination="articles-list" container="pagedCollection" prevPages="2" nextPages="2">
    <article>{{row.title}}</article>
</collection>
```

**Dynamic Forms:**
```html
<cmsForm key="contactForm" fields="name,email,message" submitButtonText="Send Message"/>
```

**Partials (HTML-style):**
```html
<partial name="hero"
    title="Welcome"
    subtitle="To our site"
    imageUrl="/img/hero.jpg"/>
```

**Partials (Mustache-style):**
```html
{{>cardView -{row}-}}
{{>hero -{title: "Welcome", subtitle: "To our site"}-}}
```

**System Variables:**
```html
{{currentRequest.host}}
{{currentRequest.path}}
{{currentRoute.title}}
{{currentDomain.current}}
{{systemInfo.timestamp}}
{{currentEntity.title}}  <!-- In child blocks -->
```

**Template Functions:**
```html
[url(/articles)]                    <!-- URL generation -->
[asset(/img/logo.png)]              <!-- Asset URLs -->
[date(now, Y-m-d)]                  <!-- Date formatting -->
[translate(welcome.message)]        <!-- i18n -->
[t(key, Default, {var: value})]     <!-- i18n with interpolation -->
```

## Configuration

### Environment Variables (.env)
```bash
# Server
RELDENS_APP_HOST=http://localhost
RELDENS_APP_PORT=8080

# Admin
RELDENS_ADMIN_ROUTE_PATH=/admin
RELDENS_ADMIN_SECRET=your-secret-key

# Database
RELDENS_DB_CLIENT=mysql
RELDENS_DB_HOST=localhost
RELDENS_DB_PORT=3306
RELDENS_DB_NAME=cms_db
RELDENS_DB_USER=username
RELDENS_DB_PASSWORD=password
RELDENS_STORAGE_DRIVER=prisma

# Multi-domain
RELDENS_DEFAULT_DOMAIN=example.com
RELDENS_DOMAIN_MAPPING={"dev.example.com":"development"}
RELDENS_SITE_KEY_MAPPING={"example.com":"main"}
RELDENS_DOMAIN_PUBLIC_URL_MAPPING={"example.com":"https://cdn.example.com"}
RELDENS_DOMAIN_CDN_MAPPING={"example.com":"https://cdn.example.com"}
```

### Manager Configuration
```javascript
const { Manager } = require('@reldens/cms');

const cms = new Manager({
    projectRoot: process.cwd(),

    // Entity access control
    entityAccess: {
        articles: { public: true, operations: ['read'] },
        cmsPages: { public: true, operations: ['read'] },
        users: { public: false }
    },

    // Authentication
    authenticationMethod: 'db-users',  // or 'custom'
    authenticationCallback: async (email, password, roleId) => {
        // Custom auth logic
    },
    adminRoleId: 99,

    // Performance
    cache: true,
    reloadTime: -1,  // Development: reload on every request
    // reloadTime: 0,  // Production: disable reloading

    // Multi-domain
    defaultDomain: 'example.com',
    domainMapping: {'dev.example.com': 'development'},
    siteKeyMapping: {'example.com': 'main'},

    // Custom entities and translations
    entitiesConfig: {},
    entitiesTranslations: {},
    adminTranslations: {}
});

await cms.start();
```

## Event System

The CMS provides extensive event hooks for customization:

### Manager Events
- `reldens.cmsManagerInitializeServices` - Before service initialization
- `reldens.manager.initializeAdminManager` - Before admin initialization

### Template Events
- `reldens.afterVariablesCreated` - Modify system variables
- `reldens.beforeContentProcess` - Before template processing
- `reldens.afterContentProcess` - After template processing

### Form Events
- `reldens.formsTransformer.beforeRender` - Before form rendering
- `reldens.formsTransformer.afterRender` - After form rendering
- `reldens.dynamicForm.beforeValidation` - Before validation
- `reldens.dynamicForm.afterValidation` - After validation
- `reldens.dynamicForm.beforeSave` - Before saving
- `reldens.dynamicForm.afterSave` - After successful save
- `reldens.dynamicFormRequestHandler.beforeSave` - Before request save

### Admin Events
- `reldens.setupAdminRouter` - Setup admin routes
- `reldens.setupAdminRoutes` - After route setup
- `reldens.setupAdminManagers` - After manager setup

### Template Reloading Events
- `reldens.templateReloader.templatesChanged` - Templates changed

## Development Workflow

### Template Reloading
Set `reloadTime: -1` in Manager configuration for development:
- Admin templates reload automatically when files change
- Frontend templates reload on next page load
- No server restart needed
- Zero performance impact in production (`reloadTime: 0`)

### Entity Generation
```bash
# Generate entities from database schema
npx reldens-cms-generate-entities

# Or programmatically
await dataServer.generateEntities();
```

### Custom Entities
Define custom entity configurations in `entitiesConfig`:
```javascript
{
    articles: {
        listProperties: ['title', 'status', 'created_at'],
        showProperties: ['title', 'content', 'author'],
        editProperties: ['title', 'content', 'author_id'],
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
}
```

## Security Features

- **Authentication** - Role-based admin access
- **CSRF Protection** - Via session tokens
- **File Upload Validation** - MIME type and extension checking
- **Entity Access Control** - Public/private entity rules
- **Honeypot Protection** - Bot detection in forms
- **Rate Limiting** - Via @reldens/server-utils
- **XSS Protection** - Input sanitization via @reldens/server-utils
- **SQL Injection Prevention** - Via Prisma ORM
- **Path Validation** - File path security
- **CSP Headers** - Content Security Policy via Helmet
- **HTTPS Support** - SSL/TLS configuration

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

## Common File Paths

- **Admin templates:** `admin/templates/`
- **Frontend templates:** `templates/`
- **Domain templates:** `templates/domains/{domain}/`
- **Entities:** `entities/` (generated)
- **Public assets:** `public/`
- **Environment:** `.env`
- **Install lock:** `install.lock`

## Troubleshooting

### Installation Issues
- Check database connection in `.env`
- Ensure Prisma schema is valid
- Verify Node.js version >= 20.0.0

### Template Issues
- Check template resolution order
- Verify domain mapping configuration
- Enable template reloading for development

### Form Issues
- Validate JSON schema syntax
- Check form key matches database
- Verify field names in schema

### Entity Issues
- Regenerate entities after schema changes
- Check entity access configuration
- Verify relationship mappings

## Dependencies

- **@reldens/storage** - Database abstraction layer
- **@reldens/server-utils** - Server utilities (AppServerFactory, FileHandler, Encryptor)
- **@reldens/utils** - Common utilities (EventsManager, Logger, SchemaValidator)
- **dotenv** - Environment variable management
- **mustache** - Template engine

## Additional Resources

- Main README.md for user documentation
- Package.json for dependency versions
- License: MIT
