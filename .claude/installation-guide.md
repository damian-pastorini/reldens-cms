# Advanced Installation Guide

## Subprocess Installation Handling

The installer supports complex operations through subprocess management:

```javascript
const { Installer } = require('@reldens/cms');
const { Logger } = require('@reldens/utils');

let installer = new Installer({
    projectRoot: process.cwd(),
    subprocessMaxAttempts: 1800,
    postInstallCallback: async (props) => {
        Logger.info('Entities loaded: '+Object.keys(props.loadedEntities.rawRegisteredEntities).length);
        return true;
    }
});
```

**The installer automatically handles:**

- Package dependency checking and installation
- Database schema creation via subprocess
- Prisma client generation with progress tracking
- Entity generation with validation
- Environment file creation
- Directory structure setup

## Enhanced Manager Initialization

The Manager class provides comprehensive service initialization:

```javascript
let cms = new Manager({
    app: customExpressApp,
    appServer: customAppServer,
    dataServer: customDataServer,
    adminManager: customAdmin,
    frontend: customFrontend,
    adminRoleId: 99,
    authenticationMethod: 'db-users',
    authenticationCallback: async (email, password, roleId) => {
        return await yourAuthService.validate(email, password, roleId);
    },
    cache: true,
    reloadTime: -1,
    defaultDomain: 'example.com',
    domainMapping: {'dev.example.com': 'development'},
    siteKeyMapping: {'example.com': 'main'}
});
```

**Manager automatically:**

- Validates all provided instances
- Initializes missing services
- Auto-creates `PrismaClient` via `PrismaClientLoader` from `@reldens/storage` when `RELDENS_STORAGE_DRIVER=prisma` and no `prismaClient` is passed in — no Prisma imports needed in your entry point
- Sets up entity access control
- Generates admin entities
- Configures template reloading

## Development Mode Detection

The CMS automatically detects development environments based on domain patterns.

**Default Development Patterns:**

```javascript
let patterns = [
    'localhost',
    '127.0.0.1',
    '.local',
    '.test',
    '.dev',
    '.acc',
    '.staging',
    'local.',
    'test.',
    'dev.',
    'acc.',
    'staging.'
];
```

**Override Development Patterns:**

```javascript
let cms = new Manager({
    developmentPatterns: [
        'localhost',
        '127.0.0.1',
        '.local'
    ],
    domainMapping: {
        'www.example.com': 'example.com',
        'new.example.com': 'example.com'
    }
});
```

**Important Notes:**

- Domain patterns only match at the start or end of domains, not arbitrary positions
- Override `developmentPatterns` in production to prevent staging/acc domains from enabling development mode

## Security Configuration

### External Domains for CSP

Configure external domains for CSP directives (kebab-case or camelCase):

```javascript
let cms = new Manager({
    appServerConfig: {
        developmentExternalDomains: {
            'scriptSrc': ['https://cdn.example.com'],
            'script-src': ['https://analytics.example.com'],
            'styleSrc': ['https://fonts.googleapis.com'],
            'font-src': ['https://fonts.gstatic.com']
        }
    }
});
```

**The system automatically:**

- Converts kebab-case keys to camelCase
- Adds domains to both the base directive and the -elem variant

### CSP Directive Merging vs Override

**Default (merge with base directives):**

```javascript
let cms = new Manager({
    appServerConfig: {
        helmetConfig: {
            contentSecurityPolicy: {
                directives: {
                    scriptSrc: ['https://cdn.example.com']
                }
            }
        }
    }
});
```

**Default Base Directives:**

```javascript
{
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    scriptSrcElem: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    styleSrcElem: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
}
```

**Complete Replacement:**

```javascript
let cms = new Manager({
    appServerConfig: {
        helmetConfig: {
            contentSecurityPolicy: {
                overrideDirectives: true,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "https://trusted-cdn.com"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    fontSrc: ["'self'"],
                    connectSrc: ["'self'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"]
                }
            }
        }
    }
});
```

### Additional Helmet Security Headers

```javascript
let cms = new Manager({
    appServerConfig: {
        helmetConfig: {
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            crossOriginOpenerPolicy: {
                policy: "same-origin"
            },
            crossOriginResourcePolicy: {
                policy: "same-origin"
            },
            crossOriginEmbedderPolicy: {
                policy: "require-corp"
            }
        }
    }
});
```

**Note:** In development mode, CSP and HSTS are automatically disabled. Security headers are only enforced in production.

**Trusted Types:** To enable Trusted Types for enhanced XSS protection:

```javascript
requireTrustedTypesFor: ["'script'"]
```

However, this requires updating all JavaScript code to use the Trusted Types API.
