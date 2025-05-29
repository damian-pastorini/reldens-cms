[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens CMS

A powerful, flexible Content Management System built with Node.js, featuring an admin panel, multi-domain frontend support, and automated installation.

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
- **Static asset serving** with Express integration as default
- **Template engine** with Mustache integration as default
- **Custom 404 handling**

### - Admin Panel
- **Full CRUD operations** for all entities
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

### - Configuration & Architecture
- **Environment-based configuration** (.env file)
- **Modular service architecture** (Frontend, AdminManager, DataServer)
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
    projectRoot: './my-cms',
    companyName: 'My Company',
    adminRoleId: 99
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

## Multi-Domain Setup

### Directory Structure
```
templates/
├── domains/
│   ├── example.com/
│   │   ├── partials/
│   │   │   ├── header.html
│   │   │   └── footer.html
│   │   ├── page.html
│   │   └── index.html
│   └── dev.example.com/
│       └── page.html
├── partials/
│   ├── header.html (default)
│   └── footer.html (default)
├── page.html (base layout)
└── 404.html
```

### Template Variables
Templates receive dynamic data based on routes and entities:
```html
<!DOCTYPE html>
<html>
<head>
    <title>{{title}}</title>
    <meta name="description" content="{{description}}">
</head>
<body class="{{siteHandle}}">
    <header>{{>header}}</header>
    <main>{{{content}}}</main>
    <footer>{{>footer}}</footer>
    <script>
        const currentYear = {{currentYear}};
    </script>
</body>
</html>
```

## Advanced Usage

### Custom Authentication
```javascript
const customAuth = async (email, password, roleId) => {
    // Your custom authentication logic
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

## API Reference

### Manager Class
- `start()` - Initialize and start the CMS
- `isInstalled()` - Check if CMS is installed
- `initializeServices()` - Initialize all services

### Frontend Class
- `initialize()` - Setup frontend routes and templates
- `handleRequest(req, res)` - Main request handler
- `findRouteByPath(path)` - Database route lookup
- `findEntityByPath(path)` - Entity-based URL handling

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
│   ├── domains/            # Domain-specific templates
│   ├── partials/           # Shared template partials
│   ├── page.html           # Base layout
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
