# SEO Guide: Sitemaps and Robots.txt

## Overview

The CMS provides built-in support for dynamic robots.txt and sitemap.xml generation using CMS pages and templates.

## Installation

During CMS installation, check the **"Install SEO files (robots.txt and sitemap.xml)"** option to automatically create:

- `/robots.txt` route and page (available to all domains)
- `/sitemap.xml` route and page (available to all domains)

## Robots.txt

### How It Works

**Route:** `/robots.txt`

**Database Configuration:**
- Template field: `'robots'` (extension omitted)
- Resolved template file: `templates/robots.txt`
- Layout: `'raw'` (passthrough only, no HTML wrapping)
- Content-Type: Automatically detected as `text/plain`

**Characteristics:**
- Simple static template pointing to `/sitemap.xml`
- Each domain serves its own robots.txt with a link to its own sitemap
- No database queries - pure static content

### Template Example

```
User-agent: *
Allow: /
Sitemap: {{currentRequest.publicUrl}}/sitemap.xml
```

## Sitemap.xml

### How It Works

**Route:** `/sitemap.xml`

**Database Configuration:**
- Template field: `'sitemap'` (extension omitted)
- Resolved template file: `templates/sitemap.xml`
- Layout: `'raw'` (passthrough only, no HTML wrapping)
- Content-Type: Automatically detected as `application/xml`

**Data Loading:**
- Uses `SitemapLoader` class to load data via `reldens.afterVariablesCreated` event
- Queries `routes` table with `cms_pages` relation using OR condition
- Includes routes where `domain IS NULL` OR `domain = mappedDomain`
- Excludes redirect routes (`redirect_url` and `redirect_type` must be null)
- Excludes pages with `meta_robots = 'noindex,nofollow'` (utility files like ads.txt)
- Lists only enabled routes with associated cms_pages
- Includes `path` and `updated_at` fields from routes table
- No arbitrary limits - fetches all matching routes
- Caches results on request object to avoid duplicate queries during multi-pass rendering
- Automatically leverages the CMS cache system (1 hour TTL)

### Template Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{{#sitemapPages}}
    <url>
        <loc>{{&currentRequest.publicUrl}}{{&path}}</loc>
        <lastmod>{{&updated_at}}</lastmod>
    </url>
{{/sitemapPages}}
</urlset>
```

The `sitemapPages` variable is automatically populated by `SitemapLoader` class which:

1. Listens to `reldens.afterVariablesCreated` event
2. Loads routes with `cms_pages` relation from database
3. Filters by domain and excludes noindex pages
4. Caches results on `req.sitemapPages` for subsequent renders

## Multi-Domain Setup

For multi-domain sites, each domain automatically gets its own filtered sitemap:

### Installation Creates Shared Route

Installation creates one shared route with `domain: NULL`
- This makes `/sitemap.xml` available to all domains
- Each domain serves the same URL but gets filtered results

### Automatic Domain Filtering

SitemapLoader automatically handles domain filtering:
- Uses `domainMapping` to resolve dev domains to production domains (e.g., `reldens.new` → `reldens.com`)
- Queries routes where `domain IS NULL` (shared) OR `domain = mappedDomain` (domain-specific)
- Excludes routes without cms_pages or with `meta_robots = 'noindex,nofollow'`

### No Additional Configuration Needed

Each domain accessing `/sitemap.xml` gets its own filtered results automatically.

## Implementation Details

### SitemapLoader Filter Logic

```javascript
{
    enabled: 1,
    redirect_url: null,
    redirect_type: null,
    OR: [
        {domain: null},
        {domain: mappedDomain}
    ]
}
```

### Database Query

- Queries `routes` table with `loadWithRelations(filters, 'cms_pages')`
- Translates to: `WHERE enabled=1 AND redirect_url IS NULL AND redirect_type IS NULL AND (domain IS NULL OR domain = mappedDomain)`
- Loads associated `cms_pages` in single query using Prisma/ObjectionJS/MikroORM relations

### JavaScript Post-Filter

- Excludes routes without `cms_pages` relation
- Excludes routes where `cms_pages[0].meta_robots === 'noindex,nofollow'`
- This avoids polluting sitemap with utility files (robots.txt, ads.txt, sitemap.xml itself)

## Benefits

**Dynamic:**
- Sitemaps update automatically when routes change

**Cached:**
- Route-level cache (1 hour TTL)
- Request-level cache to avoid duplicate queries

**SEO-friendly:**
- Standard XML sitemap format
- Proper lastmod dates

**Multi-domain:**
- Each domain gets its own sitemap
- Domain-specific + shared routes included

**Domain Mapping:**
- Automatically resolves dev domains to production domains for queries

**Smart Filtering:**
- Excludes utility files (robots.txt, ads.txt) via meta_robots field

**Event-driven:**
- Uses `reldens.afterVariablesCreated` event for extensibility

**No limits:**
- Fetches all matching routes (no arbitrary pagination)

**Efficient:**
- Single database query with relation loading
- JavaScript post-filter for meta_robots

**Cross-driver:**
- Works with Prisma, ObjectionJS, and MikroORM storage drivers
