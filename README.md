[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens CMS

A powerful, flexible Content Management System built with Node.js, featuring an admin panel, multi-domain frontend support, enhanced templating with reusable content blocks, and automated installation.

## Features

### - Quick Setup
- **Web-based installer** with a guided setup process
- **Automatic database schema creation** and seeding
- **Environment configuration generation**
- **Directory structure initialization**

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
- **Custom 404 handling**

### - Admin Panel
- **Full CRUD operations** for all entities including content blocks
- **File upload handling** with multiple storage buckets
- **Role-based authentication** and access control
- **Advanced filtering and search** across entity properties
- **Bulk operations** (delete multiple records)
- **Relationship management** with foreign key support
- **Template-driven UI** with customizable admin themes

### -️ Database & Entities
- **Multiple database drivers** (Prisma by default, others via DriversMap)
- **Automatic entity generation** from a database schema
- **Relationship mapping** and foreign key handling
- **Custom entity configuration** with validation rules
- **Translation support** for entity labels and properties
- **Content blocks management** via cms_blocks table
- **Entity access control** via entity_access table

### - Configuration & Architecture
- **Environment-based configuration** (.env file)
- **Modular service architecture** (Frontend, AdminManager, DataServer, TemplateEngine)
- **Event-driven system** with hooks for customization
- **Extensible authentication** (database users or custom callbacks)
- **File security** with path validation and dangerous key filtering

## Installation

### Method 1: Automated Web Installer
```bash
npx reldens-cms
```
Navigate to `http://localhost:8080` and follow the installation wizard.

### Method 2: Manual Setup
```javascript
const { Manager } = require('@reldens/cms');

const cms = new Manager({
    projectRoot: process.cwd(),
    entityAccess: {
        cmsPages: { public: true, operations: ['read'] },
        articles: { public: true, operations: ['read'] },
        users: { public: false }
    }
});

cms.start();
```

## Configuration

### Environment Variables
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

### Custom Entity Configuration
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

## Enhanced Templating System

### Template Functions
Templates support dynamic content blocks, entity rendering, and collections with advanced query options:

**Single Entity Rendering:**
```html
<!-- Render by any identifier field (like 'name' for content blocks) -->
<entity name="cmsBlocks" field="name" value="header-main"/>
<entity name="cmsBlocks" field="name" value="sidebar-left"/>

<!-- Render by ID (default identifier) -->
<entity name="articles" id="123"/>
<entity name="cmsPages" id="1"/>
```

**Single Field Collections:**
```html
<!-- Extract and concatenate a single field from multiple records -->
<collection name="cmsBlocks" filters="{status: 'active', category: 'navigation'}" field="content"/>
<collection name="articles" filters="{featured: true}" field="title"/>

<!-- With query options for sorting and limiting -->
<collection name="articles" filters="{featured: true}" field="title" data="{limit: 5, sortBy: 'created_at', sortDirection: 'desc'}"/>
<collection name="cmsBlocks" filters="{status: 'active'}" field="content" data="{limit: 3, offset: 10, sortBy: 'priority'}"/>
```

**Loop Collections:**
```html
<!-- Loop through records with full template rendering -->
<collection name="cmsBlocks" filters="{status: 'active'}">
  <div class="block">
    <h3>{{row.title}}</h3>
    <div class="content">{{row.content}}</div>
  </div>
</collection>

<collection name="articles" filters="{category: 'technology'}">
  <div class="article">
    <h4>{{row.title}}</h4>
    <p>{{row.summary}}</p>
    <img src="{{row.featured_image}}" alt="{{row.title}}">
  </div>
</collection>

<!-- With pagination and sorting -->
<collection name="articles" filters="{featured: true}" data="{limit: 10, offset: 0, sortBy: 'created_at', sortDirection: 'asc'}">
  <div class="article-card">
    <h4>{{row.title}}</h4>
    <p>{{row.summary}}</p>
  </div>
</collection>
```

**Custom Partials with Variables:**

*New HTML-style partial tags:*
```html
<!-- Clean HTML-style syntax for complex partials -->
<partial name="hero" 
    sectionStyle=" bg-black"
    bigTextHtml="A free open-source platform to create multiplayer games!"
    mediumTextHtml="Build with Node.js, MySQL, Colyseus, and Phaser 3"
    htmlContentWrapper='<div class="d-lg-flex"><a href="/documentation" target="_blank" class="btn-get-started">Get Started!</a><a href="https://demo.reldens.com/" target="_blank" class="btn-watch-video"> Demo </a></div>'
    imageUrl="/assets/web/reldens-check.png"
    imageAlt="Reldens - MMORPG Platform" />

<!-- Self-closing and open/close syntax both supported -->
<partial name="productCard" 
    title="Premium Package"
    price="$99"
    highlighted="true">
</partial>
```

*Traditional Mustache syntax is still supported:*
```html
<!-- Call a partial with an inline JSON object -->
{{>hero -{
    bigTextHtml: "A free open-source platform to create multiplayer games!",
    mediumTextHtml: "Build with Node.js, MySQL, Colyseus, and Phaser 3",
    imageUrl: "https://example.com/hero.jpg",
    ctaText: "Get Started",
    ctaLink: "/documentation"
}-}}

<!-- Call a partial within collections using row data -->
<collection name="cmsPages" filters="{featured: true}" data="{limit: 3}">
    {{>cardView -{row}-}}
</collection>

<!-- Call a partial with mixed data -->
{{>productCard -{
    title: "Premium Package",
    price: "$99",
    features: ["Advanced Analytics", "Priority Support", "Custom Themes"],
    highlighted: true
}-}}
```

**Example Partial Templates:**

**partials/hero.mustache:**
```html
<section class="hero{{#sectionStyle}}{{sectionStyle}}{{/sectionStyle}}">
    <div class="hero-content">
        <h1>{{&bigTextHtml}}</h1>
        <p>{{&mediumTextHtml}}</p>
        {{#htmlContentWrapper}}
        {{&htmlContentWrapper}}
        {{/htmlContentWrapper}}
        {{#imageUrl}}
        <img src="{{imageUrl}}" alt="{{imageAlt}}" class="hero-image">
        {{/imageUrl}}
    </div>
</section>
```

**partials/cardView.mustache:**
```html
<div class="card">
    <h3>{{title}}</h3>
    <p>{{json_data.excerpt}}</p>
    {{#json_data.featured_image}}
    <img src="{{json_data.featured_image}}" alt="{{title}}">
    {{/json_data.featured_image}}
    {{#json_data.cta_text}}
    <a href="{{json_data.cta_link}}" class="btn">{{json_data.cta_text}}</a>
    {{/json_data.cta_text}}
</div>
```

### Collection Query Options
Collections support advanced query parameters for pagination and sorting:

- **limit** - Maximum number of records to return
- **offset** - Number of records to skip (for pagination)
- **sortBy** - Field name to sort by
- **sortDirection** - Sort direction ('asc' or 'desc')

**Examples:**
```html
<!-- Get the first 5 articles sorted by title -->
<collection name="articles" filters="{}" field="title" data="{limit: 5, sortBy: 'title'}"/>

<!-- Paginated results: skip first 20, get next 10 -->
<collection name="articles" filters="{published: true}" data="{limit: 10, offset: 20, sortBy: 'created_at', sortDirection: 'desc'}">
  <article>{{row.title}}</article>
</collection>

<!-- The latest 3 featured articles by creation date -->
<collection name="articles" filters="{featured: true}" data="{limit: 3, sortBy: 'created_at', sortDirection: 'desc'}">
  <div class="featured-article">{{row.title}}</div>
</collection>
```

### Layout System
The CMS uses a two-tier layout system:

**page.html** - Full HTML wrapper:
```html
<!DOCTYPE html>
<html lang="{{locale}}">
<head>
    <title>{{title}}</title>
    <meta name="description" content="{{description}}"/>
    <link href="/css/styles.css" rel="stylesheet"/>
</head>
<body class="{{siteHandle}}">
    {{&content}}
    <script src="/js/scripts.js"></script>
</body>
</html>
```

**layouts/default.html** - Body content only:
```html
<entity name="cmsBlocks" field="name" value="header-main"/>

<main id="main" class="main-container">
    <div class="container">
        <div class="row">
            <div class="col-md-3">
                <entity name="cmsBlocks" field="name" value="sidebar-left"/>
            </div>
            <div class="col-md-9">
                {{&content}}
            </div>
        </div>
    </div>
</main>

<entity name="cmsBlocks" field="name" value="footer-main"/>
```

Pages can use different layouts by setting the `layout` field in `cms_pages`:
- `default` - Header, sidebar, main content, footer
- `full-width` - Full width without sidebars  
- `minimal` - Basic layout with minimal styling

### Content Blocks
Create reusable content blocks in the `cms_blocks` table via the admin panel:
```sql
INSERT INTO cms_blocks (name, title, content) VALUES 
('contact-info', 'Contact Information', '<p>Email: info@example.com</p>'),
('article-sidebar', 'Article Categories', 
'<div class="categories"><h3>Categories</h3><ul><li><a href="/articles/technology">Technology</a></li></ul></div>');
```

### Entity Access Control
Control which entities are publicly accessible:
```javascript
const cms = new Manager({
    entityAccess: {
        articles: { public: true, operations: ['read'] },
        cmsPages: { public: true, operations: ['read'] },
        users: { public: false }
    }
});
```

## Multi-Domain Setup

### Directory Structure
```
templates/
├── layouts/
│   ├── default.html        # Body content layouts
│   ├── full-width.html
│   └── minimal.html
├── domains/
│   ├── example.com/
│   │   ├── layouts/        # Domain-specific layouts
│   │   ├── partials/
│   │   │   ├── header.html
│   │   │   └── footer.html
│   │   ├── page.html       # Domain-specific page wrapper
│   │   └── index.html
│   └── dev.example.com/
│       └── page.html
├── partials/
│   ├── header.html (default)
│   └── footer.html (default)
├── page.html (base HTML wrapper)
└── 404.html
```

## Advanced Usage

### Custom Authentication
```javascript
const customAuth = async (email, password, roleId) => {
    const user = await yourAuthService.authenticate(email, password);
    return user && user.role_id === roleId ? user : false;
};

const cms = new Manager({
    authenticationMethod: 'custom',
    authenticationCallback: customAuth
});
```

### File Upload Configuration
```javascript
const uploadConfig = {
    mimeTypes: {
        image: ['image/jpeg', 'image/png', 'image/webp'],
        document: ['application/pdf', 'text/plain']
    },
    allowedExtensions: {
        image: ['.jpg', '.jpeg', '.png', '.webp'],
        document: ['.pdf', '.txt']
    }
};

const cms = new Manager(uploadConfig);
```

### Event Hooks
```javascript
cms.events.on('reldens.setupAdminRoutes', ({adminManager}) => {
    // Add custom admin routes
    adminManager.adminRouter.get('/custom', (req, res) => {
        res.send('Custom admin page');
    });
});

cms.events.on('adminEntityExtraData', ({entitySerializedData, entity}) => {
    // Add extra data to admin views
    entitySerializedData.customField = 'Custom Value';
});
```

## Default database Schema

### Core Tables
- `routes` - URL routing and SEO metadata
- `cms_pages` - Page content with layout assignments
- `cms_blocks` - Reusable content blocks
- `entity_access` - Entity access control rules
- `entities_meta` - Generic metadata storage
- `cms_pages_meta` - Page-specific metadata

### Installation Options
The installer provides checkboxes for:
- CMS core tables
- User authentication system
- Default admin user
- Default homepage
- Default content blocks
- Entity access control rules

## API Reference

### Manager Class
- `start()` - Initialize and start the CMS
- `isInstalled()` - Check if CMS is installed
- `initializeServices()` - Initialize all services

### Frontend Class
- `initialize()` - Set up frontend routes and templates
- `handleRequest(req, res)` - Main request handler
- `findRouteByPath(path)` - Database route lookup
- `findEntityByPath(path)` - Entity-based URL handling

### TemplateEngine Class
- `render(template, data, partials)` - Main template rendering with enhanced functions
- `processEntityFunctions(template)` - Process `<entity>` functions
- `processSingleFieldCollections(template)` - Process single field collections with query options
- `processLoopCollections(template)` - Process loop collections with query options
- `processCustomPartials(template)` - Process `<partial>` tags with attribute parsing
- `fetchEntityForTemplate(tableName, identifier, identifierField)` - Load single entity
- `fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson)` - Load entity collections with pagination and sorting

### AdminManager Class
- `setupAdmin()` - Initialize admin panel
- `generateListRouteContent()` - Entity list pages
- `generateEditRouteContent()` - Entity edit forms
- `processSaveEntity()` - Handle form submissions

### Installer Class
- `prepareSetup()` - Setup installation routes
- `executeInstallProcess()` - Run installation
- `generateEntities()` - Create entity files

## File Structure

```
project/
├── admin/
│   └── templates/           # Admin panel templates
├── templates/
│   ├── layouts/            # Body content layouts
│   ├── domains/            # Domain-specific templates
│   ├── partials/           # Shared template partials
│   ├── page.html           # Base HTML wrapper
│   └── 404.html            # Error page
├── public/
│   ├── css/               # Stylesheets
│   ├── js/                # Client scripts
│   └── assets/            # Static assets
├── entities/              # Generated entity classes
├── .env                   # Environment configuration
├── install.lock           # Installation lock file
└── index.js               # Main application file
```

---

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
