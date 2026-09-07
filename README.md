[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens CMS

A powerful, flexible Content Management System built with Node.js, featuring an admin panel, multi-domain frontend support, enhanced templating with reusable content blocks, system variables, internationalization, template reloading, dynamic forms, and automated installation with subprocess handling.

## Features

### - Quick Setup
- **Web-based installer** with guided setup process and subprocess management
- **Subprocess installation handling** for complex operations with progress tracking
- **Automatic database schema creation** and seeding
- **Intelligent dependency management** with npm integration
- **Environment configuration generation** with template validation
- **Directory structure initialization** with asset copying

### - Frontend Engine
- **Multi-domain support** with domain-specific templates and partials
- **Dynamic routing** from database-driven routes
- **Entity-based URLs** (e.g., `/articles/123`)
- **Template fallback system** (domain → default → base)
- **Layout system** with body content layouts and page wrappers
- **Reusable content blocks** with `<entity>` template functions
- **Collection rendering** with filtering, sorting, pagination, and loop support
- **Custom partial tags** with HTML-style syntax for complex partials
- **Entity access control** for public/private content
- **Static asset serving** with Express integration as default
- **Template engine** with Mustache integration as default
- **System variables** for request, route, and domain context
- **Enhanced context passing** with currentEntity data in child blocks
- **Template functions** for URLs, assets, dates, and translations
- **Event-driven rendering** with hooks for customization
- **Custom 404 handling**
- **Advanced search functionality** with template data support
- **Dynamic forms system** with template transformers and security features
- **Template reloading** for development with configurable reload strategies

### - Admin Panel
- **Full CRUD operations** for all entities including content blocks
- **File upload handling** with multiple storage buckets
- **Role-based authentication** and access control
- **Advanced filtering and search** across entity properties
- **Bulk operations** (delete multiple records)
- **Relationship management** with foreign key support
- **Template-driven UI** with customizable admin themes

### -️ Database & Entities
- **Multiple database drivers** (MikroORM by default, others via DriversMap)
- **Automatic entity generation** from a database schema
- **Relationship mapping** and foreign key handling
- **Custom entity configuration** with validation rules
- **Translation support** for entity labels and properties
- **Content blocks management** via cms_blocks table
- **Entity access control** via entities_access table
- **Dynamic forms storage** via cms_forms and cms_forms_submitted tables

### - Configuration & Architecture
- **Environment-based configuration** (.env file)
- **Modular service architecture** with specialized classes for better maintainability
- **Event-driven system** with hooks for customization
- **Extensible authentication** (database users or custom callbacks)
- **Password encryption** with PBKDF2 (100k iterations, SHA-512) - automatic on save
- **File security** with path validation and dangerous key filtering
- **Internationalization support** with translation files

## Architecture

### Core Classes
The CMS uses a modular architecture with specialized classes:

**Installation & Management:**
- `Installer` - Installation orchestrator with subprocess management and progress tracking
- `Manager` - Main CMS orchestrator with service initialization and configuration management
- `MySQLInstaller` - Database-specific installation with schema migration support

**Frontend Orchestrator:**
- `Frontend` - Main orchestrator class that coordinates all frontend operations

**Template Management:**
- `TemplateResolver` - Template discovery and domain resolution
- `TemplateCache` - Template and partial caching management
- `TemplateReloader` - Template reloading with file change detection

**Request Processing:**
- `RequestProcessor` - HTTP request routing and path handling
- `SearchRequestHandler` - Dedicated search request processing
- `DynamicFormRequestHandler` - Form submission processing

**Content Management:**
- `ContentRenderer` - Content generation and template processing
- `EntityAccessManager` - Entity access control and loading

**Response Handling:**
- `ResponseManager` - HTTP response handling and caching logic

**Template Processing:**
- `TemplateEngine` - Core template rendering with enhanced context
- `SystemVariablesProvider` - System variables for templates
- `FormsTransformer` - Dynamic forms template transformer

**Forms System:**
- `DynamicForm` - Form validation and data processing
- `DynamicFormRenderer` - Template-based form rendering

This architecture follows SOLID principles, providing better:
- **Testability** - Individual components can be tested in isolation
- **Maintainability** - Changes to one area don't affect others
- **Reusability** - Components can be reused in different contexts
- **Readability** - Smaller, focused classes are easier to understand

## Installation

Install the CMS package and its dependencies:
```bash
npm install @reldens/cms
```

Then use the web installer or create the files manually.

### Method 1: Automated Web Installer with Subprocess Handling
```bash
npx reldens-cms
```
Navigate to `http://localhost:8080` and follow the installation wizard with:
- **Automatic dependency checking** and installation
- **Subprocess progress tracking** for complex operations
- **Database connection validation** with real-time feedback
- **SSL certificate configuration** for production
- **Post-installation callbacks** for custom initialization

### Method 2: Manual Setup
```javascript
const { Manager } = require('@reldens/cms');

const cms = new Manager({
    projectRoot: process.cwd(),
    entityAccess: {
        cmsPages: { public: true, operations: ['read'] },
        articles: { public: true, operations: ['read'] },
        users: { public: false }
    },
    // Enhanced manager configuration
    authenticationMethod: 'db-users', // or 'custom'
    adminRoleId: 99,
    cache: true,
    reloadTime: 0 // Disable template reloading for production
});

cms.start();
```

## Configuration

**Environment variables:** Database, server, admin, multi-domain settings
**Template reloading:** Configure for development (-1) or production (0)
**Entity configuration:** Custom entity properties, validation, and relationships
**Manager options:** Authentication, caching, domain mapping

**Full documentation:** See `.claude/configuration-guide.md`

## CLI Commands

### Start CMS

```bash
npx reldens-cms
```

Runs the installer if not installed, otherwise starts the CMS server.

### Generate Entities

```bash
npx reldens-cms-generate-entities
npx reldens-cms-generate-entities --override
```

Generate entity classes from database schema.

### Update User Password

```bash
npx reldens-cms-update-password --email=admin@example.com
npx reldens-cms-update-password --username=admin
```

Securely update user passwords via CLI. Password will be prompted if not provided.

## Password Management

**Automatic encryption:** PBKDF2 with 100k iterations, SHA-512
**CLI password update:** `npx reldens-cms-update-password --email=user@example.com`
**Event-driven:** Encrypts passwords automatically on save via admin panel
**Storage format:** salt:hash (192 characters total)
**Enabled by default:** Set `enablePasswordEncryption: false` to disable

**Full documentation:** See `.claude/password-management-guide.md`

## Advanced Installation Features

**Subprocess handling** for complex operations with progress tracking
**Enhanced Manager** with service validation and automatic initialization
**Development mode detection** with configurable patterns
**Security configuration** with CSP, Helmet headers, and external domain support

**Full documentation:** See `.claude/installation-guide.md`

## Dynamic Forms System

Create database-driven forms with `<cmsForm key="contactForm"/>` tags in templates. Features:

- Schema-based validation with multiple field types (text, email, select, etc.)
- Security: Honeypot protection, rate limiting, XSS protection
- Domain-aware template customization
- Event hooks for custom processing
- Database storage in cms_forms and cms_forms_submitted tables

**Full documentation:** See `.claude/forms-system-guide.md`

## Search Functionality

Multi-entity search with pagination and template data support.

**Usage:** `/search?search=technology&limit=20&templateData[columnsClass]=col-md-4`

**Full documentation:** See `.claude/search-guide.md`

## Enhanced Templating System

Powerful template engine with Mustache integration, system variables, and dynamic content rendering.

**Core Features:**
- System variables: `{{currentRequest.host}}`, `{{currentRoute.title}}`, `{{systemInfo.environment}}`
- Template functions: `[url(/path)]`, `[asset(/img.png)]`, `[date(now, Y-m-d)]`, `[translate(key)]`
- Entity rendering: `<entity name="cmsBlocks" field="name" value="header"/>`
- Collections with pagination: `<collection name="articles" filters="{}" data="{limit: 10}">`
- Custom partials: `<partial name="hero" title="Welcome"/>` or `{{>hero -{data}-}}`

**Full documentation:** See `.claude/templating-system-guide.md`

## Internationalization & Multi-Domain

**Translation files:** JSON-based i18n with `[translate(key)]` and `[t(key, fallback)]` functions
**Multi-domain support:** Domain-specific templates, partials, and configurations
**Layout system:** Two-tier layout (page.html + layouts/) with multiple layout options
**Content blocks:** Reusable content via cms_blocks table
**Entity access control:** Configure public/private entities and operations

**Full documentation:** See `.claude/multi-domain-i18n-guide.md`

## Advanced Usage

**Template Reloading:** Set `reloadTime: -1` for development, `0` for production
**Event System:** Hook into CMS events for customization
**Custom Authentication:** Implement custom auth callbacks
**File Upload Config:** Configure MIME types and allowed extensions

**Full documentation:** See `.claude/advanced-usage-guide.md`

## Database Schema

**Core tables:** routes, cms_pages, cms_blocks, entities_access, entities_meta
**Forms tables:** cms_forms, cms_forms_submitted
**Optional:** users, roles

**Full documentation:** See `.claude/database-schema.md`

## API Reference

Complete class and method reference for all CMS components.

**Full documentation:** See `.claude/api-reference.md`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards in the JavaScript rules
4. Submit a pull request

---

Need something specific?

[Request a feature here: https://www.reldens.com/features-request](https://www.reldens.com/features-request)

## Documentation

[https://www.reldens.com/documentation/cms](https://www.reldens.com/documentation/cms)

---

## License

MIT License - see LICENSE file for details.

---

### [Reldens](https://github.com/damian-pastorini/reldens/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
