# Sitemap Generator Guide

## Overview

The Sitemap Generator is a CLI tool and service class that automatically generates sitemap.xml files from enabled CMS routes. It supports multi-domain configurations and creates both domain-specific sitemaps and a sitemap index file.

## Key Features

- Loads enabled routes from `routes` table
- Generates sitemap.xml per domain
- Creates sitemap index pointing to all domain sitemaps
- Supports optional single-domain generation
- Uses domain public URL mapping for correct URLs
- Includes route metadata (lastmod from updated_at)
- XML generation via template strings with placeholders

## CLI Command Usage

### Basic Usage

```bash
# Generate sitemaps for all domains
npx reldens-cms-generate-sitemap

# Generate sitemap for specific domain only
npx reldens-cms-generate-sitemap --domain=example.com

# Show help
npx reldens-cms-generate-sitemap --help
npx reldens-cms-generate-sitemap -h
```

### Options

- `--domain=[domain]` - Generate sitemap for specific domain only
- `--help` or `-h` - Show help message

### Requirements

- CMS must be installed (install.lock exists)
- Database must be accessible
- Routes entity must be available
- Generated entities must exist (run `npx reldens-cms-generate-entities` first)

## Generated File Structure

```
[project-root]/
├── public/
│   ├── sitemap.xml                          # Sitemap index (all domains)
│   └── sitemap/
│       ├── example.com/
│       │   └── sitemap.xml                  # Domain-specific sitemap
│       ├── dev.example.com/
│       │   └── sitemap.xml
│       └── another-domain.com/
│           └── sitemap.xml
```

### Sitemap Index Format

Located at `public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap/example.com/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://dev.example.com/sitemap/dev.example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
```

### Domain Sitemap Format

Located at `public/sitemap/[domain]/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-01-15</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2025-01-14</lastmod>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
    <lastmod>2025-01-13</lastmod>
  </url>
</urlset>
```

## SitemapGenerator Class

### Location

`lib/sitemap-generator.js`

### Constructor Parameters

```javascript
new SitemapGenerator({
    dataServer,              // Required - DataServer instance
    projectRoot,             // Required - Project root path
    defaultDomain,           // Optional - Default domain for routes without domain
    domainMapping,           // Optional - Domain to site key mapping
    domainPublicUrlMapping   // Optional - Domain to public URL mapping
})
```

### Key Methods

**generate(specificDomain = null)**
- Main entry point for sitemap generation
- Loads enabled routes from database
- Filters routes by domain if specified
- Groups routes by domain
- Generates sitemap files
- Generates sitemap index (if no specific domain)
- Returns boolean success status

**loadEnabledRoutes()**
- Queries `routes` entity with `{enabled: 1}` filter
- Returns array of route objects or false on error
- Logs critical errors if routes entity not found

**groupRoutesByDomain(routes)**
- Groups routes by domain field
- Uses `defaultDomain` for routes without domain
- Returns object: `{domain: [routes]}`

**buildSitemapXml(routes, domain)**
- Generates sitemap XML string for routes array
- Builds URL entries with loc and lastmod tags
- Uses `sc.sanitize()` for XML escaping
- Uses `sc.formatDate(new Date(route.updated_at), 'Y-m-d')` for date formatting
- Returns complete XML string with template placeholders replaced

**buildSitemapIndexXml(domainRoutes)**
- Generates sitemap index XML string
- Creates sitemap entries pointing to domain sitemaps
- Uses `sc.sanitize()` for XML escaping
- Returns complete XML string with template placeholders replaced

**buildUrl(domain, path)**
- Constructs full URL from domain and path
- Uses `domainPublicUrlMapping` for base URL
- Defaults to `http://[domain]` if no mapping exists
- Ensures proper slash handling (removes trailing, adds leading)

**saveSitemaps(domainRoutes)**
- Creates domain-specific directories under `public/sitemap/`
- Writes sitemap.xml for each domain
- Uses `FileHandler.createFolder()` and `FileHandler.writeFile()`
- Returns false if any operation fails

**saveSitemapIndex(domainRoutes)**
- Creates `public/sitemap/` directory if needed
- Writes sitemap index to `public/sitemap.xml`
- Returns false if operation fails

**getSitemapTemplate()**
- Returns XML template string with `{{URLS}}` placeholder
- Used by `buildSitemapXml()`

**getSitemapIndexTemplate()**
- Returns XML template string with `{{SITEMAPS}}` placeholder
- Used by `buildSitemapIndexXml()`

## XML Template Approach

The generator uses simple template strings with placeholders instead of file-based templates or raw string concatenation.

### Template Methods

```javascript
getSitemapTemplate()
{
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
        +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        +'{{URLS}}\n'
        +'</urlset>\n';
}

getSitemapIndexTemplate()
{
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
        +'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        +'{{SITEMAPS}}\n'
        +'</sitemapindex>\n';
}
```

### Placeholder Replacement

- `{{URLS}}` - Replaced with array of URL entries joined by newlines
- `{{SITEMAPS}}` - Replaced with array of sitemap entries joined by newlines

### Entry Generation

```javascript
// URL entry
let urlEntry = '  <url>\n';
urlEntry += '    <loc>'+sc.sanitize(this.buildUrl(domain, route.path))+'</loc>\n';
if(route.updated_at){
    urlEntry += '    <lastmod>'+sc.formatDate(new Date(route.updated_at), 'Y-m-d')+'</lastmod>\n';
}
urlEntry += '  </url>';

// Sitemap entry
let sitemapEntry = '  <sitemap>\n';
sitemapEntry += '    <loc>'+sc.sanitize(this.buildUrl(domain, '/sitemap/'+domain+'/sitemap.xml'))+'</loc>\n';
sitemapEntry += '  </sitemap>';
```

## Multi-Domain Support

### Configuration

Multi-domain support relies on Manager configuration passed to SitemapGenerator:

```javascript
// In Manager
this.defaultDomain = process.env.RELDENS_DEFAULT_DOMAIN || '';
this.domainMapping = this.parseDomainMapping(process.env.RELDENS_DOMAIN_MAPPING || '{}');
this.domainPublicUrlMapping = this.parseDomainMapping(process.env.RELDENS_DOMAIN_PUBLIC_URL_MAPPING || '{}');

// Passed to SitemapGenerator
let sitemapGenerator = new SitemapGenerator({
    dataServer: manager.dataServer,
    projectRoot: this.projectRoot,
    defaultDomain: manager.defaultDomain,
    domainMapping: manager.domainMapping,
    domainPublicUrlMapping: manager.domainPublicUrlMapping
});
```

### Environment Variables

```bash
# .env
RELDENS_DEFAULT_DOMAIN=example.com
RELDENS_DOMAIN_MAPPING={"dev.example.com":"development","staging.example.com":"staging"}
RELDENS_DOMAIN_PUBLIC_URL_MAPPING={"example.com":"https://www.example.com","dev.example.com":"https://dev.example.com"}
```

### Domain Resolution

1. Route has `domain` field → use route.domain
2. Route has no domain → use `defaultDomain`
3. No defaultDomain → use 'default'

### URL Generation

1. Check `domainPublicUrlMapping` for domain
2. Use mapped URL if exists
3. Default to `http://[domain]` if no mapping

## Integration with Routes Entity

### Routes Table Structure

Required fields for sitemap generation:

- `id` - Primary key
- `path` - Route path (e.g., '/', '/about', '/contact')
- `enabled` - Boolean flag (1 = enabled, 0 = disabled)
- `domain` - Optional domain assignment
- `updated_at` - Optional timestamp for lastmod

### Query

```javascript
let routes = await routesEntity.load({enabled: 1});
```

Only enabled routes are included in sitemaps. Disabled routes are excluded.

### Path Format

- Paths should start with '/' (added automatically if missing)
- Full URLs constructed: `https://example.com/path`

## CLI Implementation

### Location

`bin/reldens-cms-generate-sitemap.js`

### Class Structure

**CmsSitemapGenerator**
- Constructor: Parses command line arguments
- `parseArguments()` - Extracts config from process.argv
- `shouldShowHelp()` - Checks for help flags
- `showHelp()` - Displays usage information
- `run()` - Main execution flow

### Execution Flow

1. Check for help flag → show help and exit
2. Extract domain parameter (if provided)
3. Load .env file from project root
4. Detect storage driver from environment
5. Load entities using EntitiesLoader
6. Create Manager instance with loaded entities
7. Verify CMS installation
8. Initialize DataServer
9. Create SitemapGenerator instance
10. Call `generate(domain)` method
11. Log success/failure and exit

### Dependencies

```javascript
const { Manager } = require('../index');
const { SitemapGenerator } = require('../lib/sitemap-generator');
const { EntitiesLoader } = require('../lib/entities-loader');
const { PrismaClientLoader } = require('@reldens/storage');
const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const dotenv = require('dotenv');
```

## Programmatic Usage

### Basic Example

```javascript
const { Manager } = require('@reldens/cms');
const { SitemapGenerator } = require('@reldens/cms/lib/sitemap-generator');

let manager = new Manager({projectRoot: process.cwd()});
await manager.initializeDataServer();

let sitemapGenerator = new SitemapGenerator({
    dataServer: manager.dataServer,
    projectRoot: process.cwd(),
    defaultDomain: manager.defaultDomain,
    domainMapping: manager.domainMapping,
    domainPublicUrlMapping: manager.domainPublicUrlMapping
});

// Generate all sitemaps
let success = await sitemapGenerator.generate();

// Generate for specific domain
let successSingle = await sitemapGenerator.generate('example.com');
```

### Custom Integration

```javascript
// In your application after CMS startup
let manager = require('./path/to/cms-manager-instance');
let { SitemapGenerator } = require('@reldens/cms/lib/sitemap-generator');

// Generate sitemaps on schedule (e.g., daily cron job)
async function regenerateSitemaps() {
    let generator = new SitemapGenerator({
        dataServer: manager.dataServer,
        projectRoot: manager.projectRoot,
        defaultDomain: manager.defaultDomain,
        domainMapping: manager.domainMapping,
        domainPublicUrlMapping: manager.domainPublicUrlMapping
    });

    let success = await generator.generate();
    if(success){
        console.log('Sitemaps regenerated successfully');
    }
}

// Regenerate on route changes
manager.eventsManager.on('reldens.routeSaved', async () => {
    await regenerateSitemaps();
});
```

## Error Handling

### Common Errors

**DataServer not provided**
```
CRITICAL: DataServer is required for sitemap generation.
```
Solution: Ensure DataServer is initialized and passed to constructor

**Routes entity not found**
```
CRITICAL: Routes entity not found in dataServer.
```
Solution: Run `npx reldens-cms-generate-entities` to generate entities

**Failed to load routes**
```
CRITICAL: Failed to load routes: [error message]
```
Solution: Check database connection and routes table existence

**Directory creation failed**
```
CRITICAL: Failed to create sitemap directory: [path]
```
Solution: Check filesystem permissions for public folder

**File write failed**
```
CRITICAL: Failed to write sitemap: [path]
```
Solution: Check filesystem permissions and disk space

**No enabled routes**
```
WARNING: No enabled routes found for sitemap generation.
```
Not an error - returns true but no files generated

**No routes for specific domain**
```
WARNING: No routes found for domain: [domain]
```
Not an error - returns true but no files generated for that domain

### Debug Logging

Set environment variable for detailed logging:

```bash
RELDENS_LOG_LEVEL=9 npx reldens-cms-generate-sitemap
```

## Best Practices

1. **Regenerate on Route Changes**: Set up event listeners to regenerate sitemaps when routes are created, updated, or deleted
2. **Schedule Regular Generation**: Run CLI command daily or weekly via cron job to ensure sitemaps stay current
3. **Use Domain Mapping**: Configure `RELDENS_DOMAIN_PUBLIC_URL_MAPPING` for production URLs (especially for CDN or www subdomain)
4. **Submit to Search Engines**: Submit sitemap index URL to Google Search Console and Bing Webmaster Tools
5. **Monitor File Sizes**: Large sitemaps (>50k URLs) should be split - consider filtering by category or date
6. **Set updated_at Properly**: Ensure routes table has accurate updated_at timestamps for lastmod accuracy
7. **Enable Only Public Routes**: Use enabled=1 flag to control which routes appear in sitemaps

## SEO Integration

### Robots.txt

Add sitemap reference to robots.txt:

```
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

### Search Console

1. Go to Google Search Console
2. Add property for your domain
3. Navigate to Sitemaps section
4. Submit: `https://example.com/sitemap.xml`
5. Monitor indexing status

### Multi-Domain SEO

Each domain gets its own sitemap, referenced in the index:

```xml
<sitemapindex>
  <sitemap>
    <loc>https://example.com/sitemap/example.com/sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://blog.example.com/sitemap/blog.example.com/sitemap.xml</loc>
  </sitemap>
</sitemapindex>
```

Submit the index URL to search engines, or submit individual domain sitemaps to domain-specific Search Console properties.

## Troubleshooting

**Issue**: Sitemaps not updating
- Solution: Check if routes have `enabled=1` flag
- Solution: Verify `updated_at` field is being updated on route changes
- Solution: Delete existing sitemaps and regenerate

**Issue**: Wrong URLs in sitemap
- Solution: Check `RELDENS_DOMAIN_PUBLIC_URL_MAPPING` configuration
- Solution: Verify route `domain` field matches configured domains
- Solution: Check `defaultDomain` setting

**Issue**: CLI command not found
- Solution: Run `npm install` to ensure bin scripts are linked
- Solution: Use `npx reldens-cms-generate-sitemap` instead of direct path

**Issue**: Permission denied errors
- Solution: Check filesystem permissions on public folder
- Solution: Run command with appropriate user permissions
- Solution: Ensure public/sitemap directories are writable

**Issue**: Empty sitemaps generated
- Solution: Check if routes exist with `enabled=1`
- Solution: Verify database connection
- Solution: Check entity generation completed successfully
