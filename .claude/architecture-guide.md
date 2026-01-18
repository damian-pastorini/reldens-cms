# Architecture Guide

## Core Orchestrators

### Manager

**File:** `lib/manager.js`

Main CMS orchestrator that:

- Initializes all services (data server, admin, frontend)
- Handles configuration and environment variables
- Manages multi-domain setup and security
- Coordinates service lifecycle
- Initializes password encryption handler
- Defines default templateExtensions: `['.html', '.mustache', '.template', '.txt', '.xml', '.json']`
- Passes templateExtensions to all frontend components ensuring consistency

### Frontend

**File:** `lib/frontend.js`

Frontend orchestrator that:

- Coordinates all frontend operations
- Manages template engine, cache, and rendering
- Handles search and dynamic forms
- Routes requests to appropriate handlers
- Receives templateExtensions from Manager and passes to TemplateResolver and TemplateCache
- Handles Content-Type detection based on request path extensions

### Admin Manager

**File:** `lib/admin-manager.js`

Admin panel orchestrator that:

- Manages admin panel routes and authentication
- Handles entity CRUD operations
- Processes file uploads
- Builds admin UI from entity configurations

### Password Encryption Handler

**File:** `lib/password-encryption-handler.js`

Password encryption handler that:

- Automatic password encryption for users entity
- Event-driven architecture
- PBKDF2 encryption with 100k iterations
- Detects and skips already-encrypted passwords
- Configurable entity and field names

### Admin Router Contents

**File:** `lib/admin-manager/router-contents.js`

Admin routing and form handling that:

- Password field handling (type="password", empty on edit)
- Password updates optional (skip if empty when editing)
- Configurable password field names via passwordFieldNames

## Installation & Setup

### Installer

**File:** `lib/installer.js`

Installation orchestrator that:

- Web-based installer with subprocess management
- Dependency checking and installation
- Database schema creation
- Environment file generation
- Post-installation callbacks

### MySQL Installer

**File:** `lib/mysql-installer.js`

Database-specific installation that:

- MySQL schema creation
- Schema migration support
- Database validation

### Prisma Subprocess Worker

**File:** `lib/prisma-subprocess-worker.js`

Subprocess worker that:

- Handles Prisma client generation
- Progress tracking for long operations

## Frontend Architecture

### Template Resolver

**File:** `lib/frontend/template-resolver.js`

Template discovery that:

- Domain-aware template resolution with fallback system (domain → default domain → base)
- Automatic extension resolution (tries `.html`, `.mustache`, `.template`, `.txt`, `.xml`, `.json`)
- Layout and partial template lookup
- Path-to-template mapping
- Logs warnings when templates are not found in any location

### Template Cache

**File:** `lib/frontend/template-cache.js`

Template caching that:

- Loads and caches partials
- Domain-specific template management
- Partial inheritance and overrides
- Uses templateExtensions to discover partial files in directories
- Supports all configured extensions for partial templates

### Request Processor

**File:** `lib/frontend/request-processor.js`

Request routing that:

- Route database lookup
- Domain extraction from requests
- Path normalization
- Cache key generation

### Entity Access Manager

**File:** `lib/frontend/entity-access-manager.js`

Entity access control that:

- Loads entity access rules
- Public/private entity validation
- Entity lookup by path

### Content Renderer

**File:** `lib/frontend/content-renderer.js`

Content generation that:

- Main content rendering logic
- Route-based content generation
- Template processing
- Meta field handling

### Response Manager

**File:** `lib/frontend/response-manager.js`

Response handling that:

- HTTP response management
- Cache integration
- Error handling (404, 500)

## Template Engine

### Template Engine Core

**File:** `lib/template-engine.js`

Core template processor that:

- Orchestrates all template transformers
- System variables injection
- Event-driven rendering pipeline
- Mustache integration

### Template Transformers

**Entities Transformer**
- File: `lib/template-engine/entities-transformer.js`
- Single entity rendering `<entity name="cmsBlocks" field="name" value="header"/>`

**Collections Transformer**
- File: `lib/template-engine/collections-transformer.js`
- Collection loops with pagination

**Collections Single Transformer**
- File: `lib/template-engine/collections-single-transformer.js`
- Single field collections

**Partials Transformer**
- File: `lib/template-engine/partials-transformer.js`
- Partial template processing

**Forms Transformer**
- File: `lib/template-engine/forms-transformer.js`
- Dynamic forms rendering `<cmsForm key="contact"/>`

**URL Transformer**
- File: `lib/template-engine/url-transformer.js`
- URL generation `[url(/path)]`

**Asset Transformer**
- File: `lib/template-engine/asset-transformer.js`
- Asset URLs `[asset(/img/logo.png)]`

**CDN Transformer**
- File: `lib/template-engine/cdn-transformer.js`
- CDN URL transformation

**Date Transformer**
- File: `lib/template-engine/date-transformer.js`
- Date formatting `[date(now, Y-m-d)]`

**Translate Transformer**
- File: `lib/template-engine/translate-transformer.js`
- Internationalization `[translate(key)]`

### System Variables Provider

**File:** `lib/template-engine/system-variables-provider.js`

System variables that:

- Current request context (host, path, protocol)
- Current route data
- Current domain information
- System information (environment, timestamp)

### Translation Service

**File:** `lib/template-engine/translation-service.js`

Translation loading that:

- JSON translation file management
- Locale detection
- Fallback handling

## Dynamic Forms System

### Dynamic Form

**File:** `lib/dynamic-form.js`

Form validation and processing that:

- Schema-based validation
- Honeypot protection
- Rate limiting integration
- Data sanitization
- Database storage

### Dynamic Form Renderer

**File:** `lib/dynamic-form-renderer.js`

Form template rendering that:

- Domain-aware form templates
- Field type templates
- Error display
- Form attribute handling

### Dynamic Form Request Handler

**File:** `lib/dynamic-form-request-handler.js`

Form request handling that:

- POST request processing
- Validation orchestration
- Success/error redirects
- JSON response support

## Search System

### Search

**File:** `lib/search.js`

Search functionality that:

- Multi-entity search
- Custom search sets
- Query parameter parsing
- Pagination support

### Search Renderer

**File:** `lib/search-renderer.js`

Search result rendering that:

- Template-based result display
- Custom column classes
- Domain-aware templates

### Search Request Handler

**File:** `lib/search-request-handler.js`

Search request handling that:

- Query processing
- Template data support
- Error handling

## Cache System

### Cache Manager

**File:** `lib/cache/cache-manager.js`

Cache orchestrator that:

- Domain and path-based caching
- Cache invalidation
- Enable/disable functionality

### Cache Routes Handler

**File:** `lib/cache/cache-routes-handler.js`

Cache admin routes that:

- Cache clearing endpoints
- Cache management UI integration

### Add Cache Button Subscriber

**File:** `lib/cache/add-cache-button-subscriber.js`

Cache UI integration that:

- Adds cache buttons to admin panel
- Event-driven cache controls

## Admin System

### Router

**File:** `lib/admin-manager/router.js`

Admin routing that:

- Authentication middleware
- Session management
- CRUD route setup
- File upload handling

### Router Contents

**File:** `lib/admin-manager/router-contents.js`

Admin content generation that:

- List view generation
- Edit form generation
- Relation handling
- Save/delete processing

### Contents Builder

**File:** `lib/admin-manager/contents-builder.js`

Admin UI builder that:

- Sidebar navigation
- Entity list/edit views
- Form field generation
- Branding and styling

### Admin Filters Manager

**File:** `lib/admin-manager/admin-filters-manager.js`

Entity filtering that:

- Filter UI generation
- Query building

### Default Translations

**File:** `lib/admin-manager/default-translations.js`

Admin translations that:

- Default English labels
- Extensible translation system

## Utility Classes

**Entities Loader**
- File: `lib/entities-loader.js`
- Entity loading from files

**Loaded Entities Processor**
- File: `lib/loaded-entities-processor.js`
- Entity configuration processing

**Admin Entities Generator**
- File: `lib/admin-entities-generator.js`
- Admin entity configuration

**Admin Templates Loader**
- File: `lib/admin-templates-loader.js`
- Admin template loading

**Templates To Path Mapper**
- File: `lib/templates-to-path-mapper.js`
- Template path mapping

**Templates List**
- File: `lib/templates-list.js`
- Template file list

**JSON Fields Parser**
- File: `lib/json-fields-parser.js`
- JSON field parsing

**Pagination Handler**
- File: `lib/pagination-handler.js`
- Pagination logic

**Template Reloader**
- File: `lib/template-reloader.js`
- Development template reloading

**CMS Pages Route Manager**
- File: `lib/cms-pages-route-manager.js`
- CMS page routing

**Admin Manager Validator**
- File: `lib/admin-manager-validator.js`
- Admin config validation

**Admin Dist Helper**
- File: `lib/admin-dist-helper.js`
- Admin asset distribution

**MIME Types**
- File: `lib/mime-types.js`
- File type definitions

**Allowed Extensions**
- File: `lib/allowed-extensions.js`
- Upload extension whitelist
