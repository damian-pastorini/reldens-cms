[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens - CMS

## About

Reldens CMS is a straightforward content management system designed for easy setup and extensibility.
It provides both an administration panel for content management and a frontend for content delivery.

## Features

- Simple installation process
- Administration panel for content management
- Support for multiple database drivers (Prisma, Objection.js)
- Template-based content rendering
- SEO-friendly routes and meta data
- Modular architecture

## Installation

### Option 1: NPX Installation (Recommended)

The easiest way to install Reldens CMS is using NPX:

```bash
npx @reldens/cms [directory]
```

This will start the installer in your browser, allowing you to configure your CMS installation.

### Option 2: Manual Installation

1. Install the package:

```bash
npm install @reldens/cms
```

2. Create a basic implementation:

```javascript
const { Manager } = require('@reldens/cms');

const manager = new Manager({
    projectRoot: './your-project-root',
    authenticationMethod: 'db-users' // or 'callback'
});

manager.start().catch(console.error);
```

## Authentication Methods

Reldens CMS supports two authentication methods:

1. **db-users**: Uses the built-in users table for authentication
2. **callback**: Use a custom authentication function

Example with custom authentication:

```javascript
const manager = new Manager({
    authenticationMethod: 'callback',
    authenticationCallback: async (email, password, roleId) => {
        // Your custom authentication logic
        // Must return a user object or false
    }
});
```

## Extending with Custom Entities

You can extend the CMS with your own entities:

```javascript
const manager = new Manager({
    entities: {
        products: {
            config: {
                listProperties: ['id', 'name', 'price', 'status'],
                showProperties: ['id', 'name', 'price', 'description', 'status', 'created_at'],
                filterProperties: ['name', 'status'],
                editProperties: ['name', 'price', 'description', 'status'],
                properties: {
                    id: { isId: true },
                    name: { isRequired: true },
                    price: { type: 'number', isRequired: true },
                    description: { type: 'textarea' },
                    status: { type: 'boolean' },
                    created_at: { type: 'datetime' }
                },
                titleProperty: 'name',
                navigationPosition: 100
            }
        }
    }
});
```

## Templates

Reldens CMS uses templates for rendering content. Templates are stored in the `templates` directory and use Mustache for rendering.

Default templates include:
- `layout.html`: The main layout template
- `page.html`: Default page template
- `404.html`: Not found page

You can create custom templates for different content types or override the default ones.

---

Need something specific?

[Request a feature here: https://www.reldens.com/features-request](https://www.reldens.com/features-request)

## Documentation

[https://www.reldens.com/documentation/cms](https://www.reldens.com/documentation/cms)

---

### [Reldens](https://github.com/damian-pastorini/reldens/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
