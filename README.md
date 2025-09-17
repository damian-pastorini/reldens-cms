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
- **Multiple database drivers** (Prisma by default, others via DriversMap)
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

### Template Reloading Configuration
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
- **`reloadTime: 0`** (default) - Template reloading disabled. Templates load once at startup.
- **`reloadTime: -1`** - Reload templates on every request when file changes are detected. Best for active development.
- **`reloadTime: > 0`** - Check for template changes at specified interval (milliseconds) and reload when needed. Good for development with lower overhead.

**How it works:**
- Tracks file modification times for admin and frontend templates
- Only reloads templates that have actually changed
- Automatically updates admin contents and frontend template cache
- Works with both admin panel templates and frontend templates/partials
- Zero performance impact when disabled (`reloadTime: 0`)

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

## Advanced Installation Features

### Subprocess Installation Handling
The installer now supports complex operations through subprocess management:

```javascript
const { Installer } = require('@reldens/cms');

const installer = new Installer({
    projectRoot: process.cwd(),
    subprocessMaxAttempts: 1800, // 3 minutes timeout
    postInstallCallback: async (props) => {
        // Custom initialization after installation
        console.log('Entities loaded:', Object.keys(props.loadedEntities.rawRegisteredEntities));
        return true;
    }
});

// The installer automatically handles:
// - Package dependency checking and installation
// - Database schema creation via subprocess
// - Prisma client generation with progress tracking
// - Entity generation with validation
// - Environment file creation
// - Directory structure setup
```

### Enhanced Manager Initialization
The Manager class now provides comprehensive service initialization:

```javascript
const cms = new Manager({
    // Server validation - automatically validates provided instances
    app: customExpressApp,        // Optional: provide your own Express app
    appServer: customAppServer,   // Optional: provide your own HTTP server
    dataServer: customDataServer, // Optional: provide your own database driver
    adminManager: customAdmin,    // Optional: provide your own admin manager
    frontend: customFrontend,     // Optional: provide your own frontend handler
    
    // Configuration validation
    adminRoleId: 99,             // Admin role ID for authentication
    authenticationMethod: 'db-users', // or 'custom'
    authenticationCallback: async (email, password, roleId) => {
        // Custom authentication logic
        return await yourAuthService.validate(email, password, roleId);
    },
    
    // Performance configuration  
    cache: true,                 // Enable caching
    reloadTime: -1,             // Template reloading for development
    
    // Multi-domain configuration
    defaultDomain: 'example.com',
    domainMapping: {'dev.example.com': 'development'},
    siteKeyMapping: {'example.com': 'main'}
});

// Manager automatically:
// - Validates all provided instances
// - Initializes missing services
// - Sets up entity access control
// - Generates admin entities
// - Configures template reloading
```

## Dynamic Forms System

### Basic Form Usage
Create forms in your templates using the `<cmsForm>` tag:

```html
<!-- Render all form fields -->
<cmsForm key="contactForm"/>

<!-- Render specific fields only -->
<cmsForm key="contactForm" fields="name,email,subject,message"/>

<!-- Custom form attributes -->
<cmsForm key="newsletterSignup" 
    fields="email,name" 
    submitButtonText="Subscribe Now"
    cssClass="newsletter-form"
    successRedirect="/thank-you"
    errorRedirect="/contact-error"/>
```

### Form Configuration in Database
Forms are configured in the `cms_forms` table via the admin panel:

```sql
-- Example form configuration
INSERT INTO cms_forms (form_key, fields_schema, enabled) VALUES 
('contactForm', '[
    {
        "name": "name",
        "type": "text",
        "label": "Full Name",
        "required": true,
        "maxLength": 100,
        "placeholder": "Enter your full name"
    },
    {
        "name": "email", 
        "type": "email",
        "label": "Email Address",
        "required": true,
        "placeholder": "your@email.com"
    },
    {
        "name": "subject",
        "type": "select",
        "label": "Subject",
        "required": true,
        "options": [
            {"value": "general", "label": "General Inquiry"},
            {"value": "support", "label": "Technical Support"},
            {"value": "sales", "label": "Sales Question"}
        ]
    },
    {
        "name": "message",
        "type": "textarea", 
        "label": "Message",
        "required": true,
        "maxLength": 1000,
        "placeholder": "Enter your message here..."
    }
]', 1);
```

### Supported Field Types
The forms system supports various field types with validation:

- **text** - Basic text input with maxLength, pattern validation
- **email** - Email input with built-in email validation
- **number** - Numeric input with min/max validation
- **textarea** - Multi-line text with maxLength
- **select** - Dropdown with options array
- **password** - Password input (masked)
- **tel** - Phone number input
- **url** - URL input with validation
- **date** - Date picker input

### Field Schema Properties
Each field in the `fields_schema` JSON supports:

```json
{
    "name": "fieldName",           // Required: Field identifier
    "type": "text",                // Required: Field type
    "label": "Field Label",        // Display label
    "required": true,              // Validation: required field
    "placeholder": "Enter text...", // Input placeholder
    "helpText": "Additional help",  // Help text below field
    "maxLength": 100,              // String length limit
    "minLength": 3,                // Minimum string length
    "pattern": "^[A-Za-z]+$",      // Regex validation pattern
    "min": 0,                      // Number minimum value
    "max": 100,                    // Number maximum value
    "step": 1,                     // Number step increment
    "defaultValue": "default",     // Default field value
    "options": [                   // Select/radio options
        {"value": "val1", "label": "Option 1"},
        {"value": "val2", "label": "Option 2"}
    ]
}
```

### Security Features
The form system includes comprehensive security measures:

#### 1. Honeypot Protection
Automatic bot detection using invisible fields:
```html
<!-- Automatically added to all forms -->
<div class="hidden">
    <input type="text" name="website_url" value="" />
</div>
```

#### 2. Server-Side Validation
- **SchemaValidator integration** - Uses `@reldens/utils` SchemaValidator
- **Required field validation** - Ensures all required fields are provided
- **Type validation** - Email, number, string validation with patterns
- **Length limits** - Configurable per field via schema
- **Custom validation** - Extensible validation rules

#### 3. Data Sanitization
- **XSS protection** - Handled by `@reldens/server-utils` SecurityConfigurer
- **Input normalization** - Type-specific data processing
- **Length truncation** - Based on field schema maxLength

#### 4. Rate Limiting
- **AppServerFactory integration** - Uses existing rate limiting from server-utils
- **No duplicate implementation** - Leverages proven security measures

### Template Customization
Forms use a domain-aware template fallback system:

```
templates/
├── domains/
│   └── example.com/
│       └── cms_forms/
│           ├── form.html           # Domain-specific form wrapper
│           ├── field_text.html     # Domain-specific text field
│           └── field_email.html    # Domain-specific email field
└── cms_forms/                      # Default templates
    ├── form.html                   # Main form wrapper
    ├── field_text.html             # Text input template
    ├── field_email.html            # Email input template
    ├── field_textarea.html         # Textarea template
    ├── field_select.html           # Select dropdown template
    └── field_number.html           # Number input template
```

### Custom Field Templates
Create custom field templates for specific types:

**templates/cms_forms/field_text.html:**
```html
<div class="form-field {{errorClass}} {{requiredClass}}">
    <label for="{{fieldName}}" class="form-label">
        {{fieldLabel}}{{#isRequired}} <span class="required-indicator">*</span>{{/isRequired}}
    </label>
    <input type="{{fieldType}}" 
           name="submittedValues[{{fieldName}}]" 
           id="{{fieldName}}" 
           value="{{fieldValue}}" 
           class="form-control {{#hasError}}is-invalid{{/hasError}}" 
           {{#isRequired}}required{{/isRequired}}
           {{#placeholder}}placeholder="{{placeholder}}"{{/placeholder}}
           {{#maxLength}}maxlength="{{maxLength}}"{{/maxLength}}
           {{#pattern}}pattern="{{pattern}}"{{/pattern}} />
    {{#helpText}}<div class="form-text">{{helpText}}</div>{{/helpText}}
    {{#hasError}}<div class="invalid-feedback">{{fieldError}}</div>{{/hasError}}
</div>
```

**templates/cms_forms/form.html:**
```html
<form method="POST" action="{{submitUrl}}" class="{{cssClass}}">
    <input type="hidden" name="formKey" value="{{formKey}}" />
    <input type="hidden" name="successRedirect" value="{{successRedirect}}" />
    <input type="hidden" name="errorRedirect" value="{{errorRedirect}}" />
    <div class="hidden">
        <input type="text" name="{{honeypotFieldName}}" value="" />
    </div>
    {{&formFields}}
    <div class="form-submit">
        <button type="submit" class="btn btn-primary">{{submitButtonText}}</button>
    </div>
</form>
```

### Forms with System Variables
Forms can access system variables and enhanced data in templates:

```html
<!-- Form with the current user context -->
<cmsForm key="userProfile" fields="name,email,bio"/>

<!-- In the form template, access system variables: -->
<form method="POST" action="{{submitUrl}}" class="{{cssClass}}">
    <h2>Update Profile for {{currentRequest.host}}</h2>
    <p>Current time: {{systemInfo.timestamp}}</p>
    {{&formFields}}
    <button type="submit">Update Profile</button>
</form>
```

### Event System Integration
The forms system provides comprehensive event hooks:

```javascript
// Listen for form events
cms.events.on('reldens.formsTransformer.beforeRender', (eventData) => {
    console.log('Rendering form:', eventData.formKey);
    // Modify form attributes or fields before rendering
    eventData.formAttributes.cssClass += ' custom-form';
});

cms.events.on('reldens.dynamicForm.beforeValidation', (eventData) => {
    console.log('Validating form:', eventData.formKey);
    // Add custom validation logic
});

cms.events.on('reldens.dynamicForm.afterSave', (eventData) => {
    console.log('Form saved:', eventData.result.id);
    // Send notifications, trigger workflows, etc.
});

cms.events.on('reldens.dynamicFormRequestHandler.beforeSave', (eventData) => {
    // Modify prepared values before saving
    eventData.preparedValues.submissionDate = new Date().toISOString();
});
```

### Available Form Events
- `reldens.formsTransformer.beforeRender` - Before form rendering
- `reldens.formsTransformer.afterRender` - After form rendering
- `reldens.dynamicForm.beforeValidation` - Before form validation
- `reldens.dynamicForm.afterValidation` - After form validation
- `reldens.dynamicForm.beforeSave` - Before saving to the database
- `reldens.dynamicForm.afterSave` - After successful save
- `reldens.dynamicFormRenderer.beforeFieldsRender` - Before rendering fields
- `reldens.dynamicFormRenderer.afterFieldsRender` - After rendering fields
- `reldens.dynamicFormRequestHandler.beforeValidation` - Before request validation
- `reldens.dynamicFormRequestHandler.beforeSave` - Before save process
- `reldens.dynamicFormRequestHandler.afterSave` - After successful save

### Database Tables
The forms system uses two main tables:

#### cms_forms Table
Store form configurations:
```sql
CREATE TABLE `cms_forms` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `form_key` VARCHAR(255) NOT NULL UNIQUE,
    `fields_schema` JSON NOT NULL,
    `enabled` TINYINT UNSIGNED NOT NULL DEFAULT '0',
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    `updated_at` TIMESTAMP NOT NULL DEFAULT (NOW()) ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
);
```

#### cms_forms_submitted Table
Store form submissions:
```sql
CREATE TABLE `cms_forms_submitted` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `form_id` INT UNSIGNED NOT NULL,
    `submitted_values` JSON NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT (NOW()),
    PRIMARY KEY (`id`),
    FOREIGN KEY (`form_id`) REFERENCES `cms_forms`(`id`)
);
```

### Form Processing Flow
1. **Template Processing** - `FormsTransformer` finds `<cmsForm>` tags
2. **Form Loading** - Loads form configuration from database
3. **Field Filtering** - Applies field filter if specified
4. **Template Rendering** - Renders form using domain-aware templates
5. **Form Submission** - POST request to `/dynamic-form` endpoint
6. **Validation** - Honeypot, required fields, and schema validation
7. **Data Processing** - Input sanitization and normalization
8. **Database Storage** - Save to `cms_forms_submitted` table
9. **Response** - Redirect with success/error parameters

### Advanced Form Usage

#### Multi-Step Forms
```html
<!-- Step 1: Basic info -->
<cmsForm key="applicationForm" fields="name,email,phone"/>

<!-- Step 2: Details (separate form) -->
<cmsForm key="applicationDetails" fields="experience,portfolio"/>
```

#### Conditional Field Display
Use JavaScript to show/hide fields based on selections:
```html
<cmsForm key="surveyForm" fields="age,experience,expertise"/>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const ageField = document.getElementById('age');
    const experienceField = document.getElementById('experience');
    
    ageField.addEventListener('change', function() {
        if(parseInt(this.value) >= 18) {
            experienceField.parentElement.style.display = 'block';
            return;
        }
        experienceField.parentElement.style.display = 'none';
    });
});
</script>
```

#### AJAX Form Submissions
Enable JSON responses for AJAX handling:
```javascript
const cms = new Manager({
    enableJsonResponse: true  // Enable JSON responses for forms
});
```

```javascript
// Frontend AJAX handling
document.querySelector('.dynamic-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const response = await fetch('/dynamic-form', {method: 'POST', body: new FormData(this)});
    
    const result = await response.json();
    if(result.success) {
        alert('Form submitted successfully!');
        return;
    }
    alert('Error: ' + result.error);
});
```

## Search Functionality

### Basic Search
```bash
# Simple search
/search?search=technology

# Entity-specific search with custom limit
/search?search=javascript&limit=20

# Custom template rendering
/search?search=news&renderPartial=newsListView&renderLayout=minimal
```

### Advanced Search with Template Data
```bash
# Pass custom template variables
/search?search=articles&templateData[columnsClass]=col-md-4&templateData[showExcerpt]=true

# Multiple template variables
/search?search=technology&templateData[columnsClass]=col-lg-6&templateData[cardClass]=shadow-sm&templateData[showAuthor]=false
```

### Search Template Variables
Templates receive dynamic data through URL parameters:

**URL:** `/search?search=tech&templateData[columnsClass]=col-md-6&templateData[showDate]=true`

**Template (entriesListView.html):**
```html
<div class="{{columnsClass}}">
    <div class="card">
        <h3>{{row.title}}</h3>
        <p>{{row.content}}</p>
        {{#showDate}}
        <span class="date">{{row.created_at}}</span>
        {{/showDate}}
    </div>
</div>
```

**Default Values:**
- `columnsClass` defaults to `col-lg-6` if not provided or empty
- Custom variables can be added via `templateData[variableName]=value`

### Search Configuration
```javascript
// Custom search sets in Manager configuration
const searchSets = {
    articlesSearch: {
        entities: [{
            name: 'articles',
            fields: ['title', 'content', 'summary'],
            relations: 'authors'
        }],
        pagination: {active: true, limit: 15, sortBy: 'created_at', sortDirection: 'desc'}
    }
};

const cms = new Manager({
    searchSets: searchSets
});
```

## Enhanced Templating System

### System Variables
Every template has access to system variables providing context about the current request:

```html
<!-- Current request information -->
{{currentRequest.baseUrl}}        <!-- https://example.com -->
{{currentRequest.protocol}}       <!-- https -->
{{currentRequest.host}}          <!-- example.com -->
{{currentRequest.path}}          <!-- /articles/123 -->
{{currentRequest.method}}        <!-- GET -->
{{currentRequest.userAgent}}     <!-- Browser information -->
{{currentRequest.isSecure}}      <!-- true/false -->

<!-- Current route data (if matched) -->
{{currentRoute.id}}              <!-- Route ID -->
{{currentRoute.path}}            <!-- Route path pattern -->
{{currentRoute.title}}           <!-- Route title -->
{{currentRoute.template}}        <!-- Route template -->
{{currentRoute.layout}}          <!-- Route layout -->

<!-- Current domain information -->
{{currentDomain.current}}        <!-- Current domain -->
{{currentDomain.default}}        <!-- Default domain -->
{{currentDomain.resolved}}       <!-- Resolved domain -->

<!-- System information -->
{{systemInfo.environment}}       <!-- development/production -->
{{systemInfo.nodeVersion}}       <!-- Node.js version -->
{{systemInfo.timestamp}}         <!-- Current timestamp -->
```

### Template Functions
Templates support dynamic functions for common operations:

```html
<!-- URL generation with current domain -->
[url(/articles)]                 <!-- https://example.com/articles -->
[url(/contact#form)]             <!-- https://example.com/contact#form -->
[url(/css/styles.css)]         <!-- https://example.com/css/styles.css -->

<!-- Asset URLs with domain -->
[asset(/assets/images/logo.png)]        <!-- https://example.com/images/logo.png -->

<!-- Date formatting -->
[date()]                         <!-- Current date with default format -->
[date(now, Y-m-d)]              <!-- 2024-01-15 -->
[date(2024-01-01, d/m/Y)]       <!-- 01/01/2024 -->

<!-- Internationalization -->
[translate(welcome.message)]     <!-- Translated text -->
[t(hello.world, Hello World!)]  <!-- With fallback -->
[t(greeting, Hi {name}!, {name: John})] <!-- With interpolation -->
```

### Enhanced Context Passing
Child content blocks and partials receive context from parent pages:

```html
<!-- In a CMS page or layout -->
<entity name="cmsBlocks" field="name" value="article-sidebar"/>

<!-- Inside the article-sidebar block, you can access: -->
{{currentEntity.title}}          <!-- Parent page title -->
{{currentEntity.id}}            <!-- Parent page ID -->
{{currentEntity.template}}       <!-- Parent page template -->
<!-- Any other parent page properties -->
```

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

<!-- Paginated collections with navigation -->
<collection name="articles" 
    filters="{featured: true}" 
    data="{limit: 10, sortBy: 'created_at', sortDirection: 'desc'}" 
    pagination="articles-1" 
    container="pagedCollection"
    prevPages="2" 
    nextPages="2">
    <div class="article-card">
        <h4>{{row.title}}</h4>
        <p>{{row.summary}}</p>
        <span class="date">{{row.created_at}}</span>
    </div>
</collection>

<!-- Multiple paginated collections on the same page -->
<collection name="news" 
    filters="{category: 'technology'}" 
    data="{limit: 5, sortBy: 'published_at'}" 
    pagination="news-tech" 
    container="customPager">
    <article>{{row.title}}</article>
</collection>

<collection name="events" 
    filters="{upcoming: true}" 
    data="{limit: 8}" 
    pagination="events-upcoming"
    prevPages="3"
    nextPages="1">
    <div class="event">{{row.title}} - {{row.date}}</div>
</collection>
```

**Pagination Attributes:**
- `pagination="collection-id"` - Enables pagination with unique identifier
- `container="templateName"` - Custom pagination template (defaults to "pagedCollection")
- `prevPages="2"` - Number of previous page links to show (default: 2)
- `nextPages="2"` - Number of next page links to show (default: 2)

**Pagination URL Parameters:**
Pagination state is managed via URL query parameters:
```
/articles?articles-1-key={"page":2,"limit":10,"sortBy":"created_at","sortDirection":"desc"}
/news?news-tech-key={"page":3,"limit":5,"category":"technology"}
```

**Custom Pagination Template:**
Create `templates/partials/pagedCollection.html`:
```html
<div class="row paginated-contents">
    <div class="collection-content col-lg-12">
        {{&collectionContentForCurrentPage}}
    </div>
    <div class="pagination col-lg-12">
        <ul class="pagination-list">
            {{#prevPageUrl}}
                <li><a href="{{prevPageUrl}}" class="page-link">{{&prevPageLabel}}</a></li>
            {{/prevPageUrl}}
            {{#prevPages}}
                <li><a href="{{pageUrl}}" class="page-link">{{&pageLabel}}</a></li>
            {{/prevPages}}
            <li class="current">{{&currentPage}}</li>
            {{#nextPages}}
                <li><a href="{{pageUrl}}" class="page-link">{{&pageLabel}}</a></li>
            {{/nextPages}}
            {{#nextPageUrl}}
                <li><a href="{{nextPageUrl}}" class="page-link">{{&nextPageLabel}}</a></li>
            {{/nextPageUrl}}
        </ul>
    </div>
</div>
```

**Available Pagination Template Variables:**
- `{{&collectionContentForCurrentPage}}` - Rendered collection items for current page
- `{{currentPage}}` - Current page number
- `{{totalPages}}` - Total number of pages
- `{{totalRecords}}` - Total number of records
- `{{prevPageUrl}}` / `{{nextPageUrl}}` - Previous/next page URLs
- `{{&prevPageLabel}}` / `{{&nextPageLabel}}` - Previous/next link labels ("Previous"/"Next")
- `{{#prevPages}}` / `{{#nextPages}}` - Arrays of page objects with `pageUrl` and `pageLabel`
- `{{hasNextPage}}` / `{{hasPrevPage}}` - Boolean flags for navigation availability

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

## Internationalization

### Translation Files
Create translation files in the `translations` directory:

**translations/en.json:**
```json
{
  "navigation": {
    "home": "Home",
    "about": "About Us",
    "contact": "Contact"
  },
  "messages": {
    "welcome": "Welcome to our site!",
    "greeting": "Hello {name}!"
  }
}
```

**translations/es.json:**
```json
{
  "navigation": {
    "home": "Inicio",
    "about": "Acerca de",
    "contact": "Contacto"
  },
  "messages": {
    "welcome": "¡Bienvenido a nuestro sitio!",
    "greeting": "¡Hola {name}!"
  }
}
```

### Using Translations in Templates
```html
<!-- Simple translation -->
[translate(navigation.home)]

<!-- With fallback -->
[t(navigation.home, Home)]

<!-- With interpolation -->
[t(messages.greeting, Hello!, {name: John})]

<!-- Locale detection from request headers or ?locale=es parameter -->
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
    <link href="[url(/css/styles.css)]" rel="stylesheet"/>
</head>
<body class="{{siteHandle}}">
    {{&content}}
    <script src="[url(/js/scripts.js)]"></script>
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
'<div class="categories"><h3>Categories</h3><ul><li><a href="[url(/articles/technology)]">Technology</a></li></ul></div>');
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
│   │   ├── cms_forms/      # Domain-specific form templates
│   │   │   ├── form.html
│   │   │   └── field_text.html
│   │   ├── page.html       # Domain-specific page wrapper
│   │   └── index.html
│   └── dev.example.com/
│       └── page.html
├── partials/
│   ├── header.html (default)
│   └── footer.html (default)
├── cms_forms/              # Default form templates
│   ├── form.html
│   ├── field_text.html
│   └── field_email.html
├── translations/
│   ├── en.json
│   ├── es.json
│   └── fr.json
├── page.html (base HTML wrapper)
└── 404.html
```

## Advanced Usage

### Template Reloading for Development
```javascript
// Different configurations for development vs production
const isDevelopment = process.env.NODE_ENV === 'development';

const cms = new Manager({
    // Enable aggressive template reloading in development
    reloadTime: isDevelopment ? -1 : 0,
    
    // Other development-friendly settings
    cache: !isDevelopment,
    
    entityAccess: {
        articles: { public: true, operations: ['read'] },
        cmsPages: { public: true, operations: ['read'] }
    }
});
```

**Development Workflow with Template Reloading:**
1. Set `reloadTime: -1` for instant template updates
2. Edit admin templates in `admin/templates/` - changes appear immediately
3. Edit frontend templates in `templates/` - changes appear on next page load
4. No server restart needed for template changes
5. Switch to `reloadTime: 0` in production for optimal performance

### Event System
The CMS provides hooks for customization through event listeners:

```javascript
// Listen for template variable events
cms.events.on('reldens.afterVariablesCreated', (eventData) => {
    // Add custom variables
    eventData.variables.customData = {
        timestamp: Date.now(),
        version: '1.0.0'
    };
});

// Listen for content processing events
cms.events.on('reldens.beforeContentProcess', (eventData) => {
    // Modify content before processing
    eventData.content = eventData.content.replace(/\[custom\]/g, 'Custom Value');
});

cms.events.on('reldens.afterContentProcess', (eventData) => {
    // Modify processed content
    eventData.processedContent += '\n<!-- Processed at ' + new Date() + ' -->';
});

// Listen for template reloading events
cms.events.on('reldens.templateReloader.templatesChanged', (eventData) => {
    console.log('Templates changed:', eventData.changedFiles);
});

// Listen for form events
cms.events.on('reldens.dynamicForm.afterSave', (eventData) => {
    // Send email notifications, trigger workflows, etc.
    console.log('Form submission received:', eventData.result.id);
});
```

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
- `entities_access` - Entity access control rules
- `entities_meta` - Generic metadata storage
- `cms_pages_meta` - Page-specific metadata

### Forms Tables
- `cms_forms` - Form configurations with JSON schema
- `cms_forms_submitted` - Form submissions with JSON data

### Installation Options
The installer provides checkboxes for:
- CMS core tables
- User authentication system
- Default admin user
- Default homepage
- Default content blocks
- Entity access control rules
- Dynamic forms system

## API Reference

### Manager Class
- `start()` - Initialize and start the CMS
- `isInstalled()` - Check if CMS is installed
- `initializeServices()` - Initialize all services
- `validateProvidedServer()` - Validate provided server instance
- `validateProvidedDataServer()` - Validate provided data server
- `validateProvidedAdminManager()` - Validate provided admin manager
- `validateProvidedFrontend()` - Validate provided frontend
- `buildAppServerConfiguration()` - Build server configuration
- `initializeCmsAfterInstall(props)` - Post-installation callback

### Installer Class
- `isInstalled()` - Check installation status
- `configureAppServerRoutes(app, appServer, appServerFactory, renderEngine)` - Setup installer routes
- `executeInstallProcess(req, res)` - Complete installation process
- `runSubprocessInstallation(dbConfig, templateVariables)` - Handle subprocess operations
- `checkAndInstallPackages(requiredPackages)` - Check and install dependencies
- `generateEntities(server, isOverride, isInstallationMode, isDryPrisma, dbConfig)` - Generate entities
- `createEnvFile(templateVariables)` - Create environment configuration
- `copyAdminDirectory()` - Copy admin assets and templates

### Frontend Architecture Classes

#### Frontend Class (Orchestrator)
- `initialize()` - Set up frontend routes and templates
- `handleRequest(req, res)` - Main request handler
- `renderRoute(route, domain, res, req)` - Route-based rendering
- `setupStaticAssets()` - Configure static asset serving

#### TemplateResolver Class
- `findTemplatePath(templateName, domain)` - Template discovery with domain fallback
- `findLayoutPath(layoutName, domain)` - Layout path resolution
- `findTemplateByPath(path, domain)` - Template lookup by URL path
- `resolveDomainToFolder(domain)` - Domain to folder mapping
- `resolveDomainToSiteKey(domain)` - Domain to site key mapping

#### TemplateCache Class
- `loadPartials()` - Load and cache template partials
- `setupDomainTemplates()` - Initialize domain-specific templates
- `getPartialsForDomain(domain)` - Get domain-specific partials with fallback

#### TemplateReloader Class
- `checkAndReloadAdminTemplates()` - Check and reload admin templates when changed
- `checkAndReloadFrontendTemplates()` - Check and reload frontend templates when changed
- `trackTemplateFiles(templatesPaths)` - Start tracking template files for changes
- `shouldReloadAdminTemplates(mappedAdminTemplates)` - Check if admin templates need reloading
- `shouldReloadFrontendTemplates(templatesPath, templateExtensions)` - Check if frontend templates need reloading
- `handleAdminTemplateReload(adminManager)` - Complete admin template reload process
- `handleFrontendTemplateReload(templateCache, templateResolver)` - Complete frontend template reload process

#### RequestProcessor Class
- `findRouteByPath(path, domain)` - Database route lookup
- `handleRouteRedirect(route, res)` - Handle route redirects
- `getDomainFromRequest(req)` - Extract domain from request
- `buildCacheKey(path, req)` - Generate cache keys

#### ContentRenderer Class
- `renderWithTemplateContent(content, data, domain, req, route)` - Main content rendering
- `generateRouteContent(route, domain, req)` - Route-based content generation
- `generateTemplateContent(templatePath, domain, req, data)` - Template-based content generation
- `fetchMetaFields(data)` - Process meta fields for templates

#### EntityAccessManager Class
- `loadEntityAccessRules()` - Load entity access configuration
- `isEntityAccessible(entityName)` - Check entity accessibility
- `findEntityByPath(path)` - Entity lookup by URL path

#### ResponseManager Class
- `renderWithCacheHandler(contentGenerator, errorHandler, responseHandler, domain, res, path, req)` - Generic cached response handler
- `renderNotFound(domain, res, req)` - 404 error handling

#### SearchRequestHandler Class
- `handleSearchRequest(req, res)` - Process search requests with template data support

### TemplateEngine Class
- `render(template, data, partials, domain, req, route, currentEntityData)` - Main template rendering with enhanced context
- `processAllTemplateFunctions(template, domain, req, systemVariables)` - Process all template functions
- `buildEnhancedRenderData(data, systemVariables, currentEntityData)` - Build template context with system variables

### SystemVariablesProvider Class
- `buildSystemVariables(req, route, domain)` - Create system variables for templates
- `buildCurrentRequestData(req, domain)` - Build request context
- `buildCurrentRouteData(route)` - Build route context
- `buildCurrentDomainData(domain)` - Build domain context

### Search Classes
- `Search.parseSearchParameters(query)` - Parse search query parameters including templateData
- `Search.executeSearch(config)` - Execute search with configuration
- `SearchRenderer.renderSearchResults(searchResults, config, domain, req)` - Render search results with template data

### Forms System Classes

#### DynamicForm Class
- `validateFormSubmission(formKey, submittedValues, req)` - Validate form submission
- `getFormConfig(formKey)` - Load form configuration from database
- `validateHoneypot(submittedValues)` - Check honeypot field for bots
- `validateFields(fieldsSchema, submittedValues)` - Schema-based field validation
- `prepareSubmittedValues(submittedValues, fieldsSchema)` - Process and normalize values
- `saveFormSubmission(formConfig, preparedValues)` - Save to database

#### DynamicFormRenderer Class
- `renderForm(formConfig, fieldsToRender, domain, req, attributes)` - Render complete form
- `renderFormFields(fieldsToRender, domain, req)` - Render field set
- `renderFormField(field, domain, submittedValues, errors)` - Render individual field
- `loadFormTemplate(templateName, domain)` - Load form template with domain fallback
- `findFormTemplate(templateName, domain)` - Template discovery for forms

#### DynamicFormRequestHandler Class
- `handleFormSubmission(req, res)` - Process POST form submissions
- `handleBadRequest(res, message)` - Handle validation errors
- `handleSuccessResponse(req, res, formKey, result)` - Handle successful submissions
- `buildErrorRedirectPath(req, error, formKey)` - Build error redirect URLs
- `buildSuccessRedirectPath(successRedirect, formKey)` - Build success redirect URLs

#### FormsTransformer Class
- `transform(template, domain, req, systemVariables, enhancedData)` - Process cmsForm tags
- `findAllFormTags(template)` - Find cmsForm tags in template
- `parseFormAttributes(fullTag)` - Parse tag attributes
- `parseFieldsFilter(attributes, formConfig)` - Filter fields based on attributes

### AdminManager Class
- `setupAdmin()` - Initialize admin panel
- `generateListRouteContent()` - Entity list pages
- `generateEditRouteContent()` - Entity edit forms
- `processSaveEntity()` - Handle form submissions

## File Structure

```
project/
├── admin/
│   └── templates/           # Admin panel templates
├── lib/
│   ├── frontend/           # Frontend specialized classes
│   │   ├── template-resolver.js
│   │   ├── template-cache.js
│   │   ├── request-processor.js
│   │   ├── entity-access-manager.js
│   │   ├── content-renderer.js
│   │   └── response-manager.js
│   ├── template-engine/    # Template processing classes
│   │   └── forms-transformer.js
│   ├── frontend.js         # Main Frontend orchestrator
│   ├── template-reloader.js # Template reloading functionality
│   ├── search-request-handler.js
│   ├── search.js           # Search functionality
│   ├── search-renderer.js  # Search result rendering
│   ├── dynamic-form.js     # Forms validation and processing
│   ├── dynamic-form-renderer.js # Forms template rendering
│   ├── dynamic-form-request-handler.js # Forms request handling
│   ├── template-engine.js  # Core template processing
│   ├── installer.js        # Installation with subprocess handling
│   ├── manager.js          # Main CMS orchestrator
│   ├── mysql-installer.js  # MySQL-specific installation
│   └── prisma-subprocess-worker.js # Subprocess worker
├── templates/
│   ├── layouts/            # Body content layouts
│   ├── domains/            # Domain-specific templates
│   │   └── example.com/
│   │       └── cms_forms/  # Domain-specific form templates
│   ├── partials/           # Shared template partials
│   ├── cms_forms/          # Default form templates
│   │   ├── form.html       # Main form wrapper
│   │   ├── field_text.html # Text field template
│   │   ├── field_email.html # Email field template
│   │   └── field_select.html # Select field template
│   ├── page.html           # Base HTML wrapper
│   └── 404.html            # Error page
├── translations/
│   ├── en.json             # English translations
│   ├── es.json             # Spanish translations
│   └── fr.json             # French translations
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
