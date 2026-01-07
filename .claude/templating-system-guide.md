# Enhanced Templating System Guide

## System Variables

Every template has access to system variables providing context about the current request:

```html
{{currentRequest.baseUrl}}
{{currentRequest.protocol}}
{{currentRequest.host}}
{{currentRequest.path}}
{{currentRequest.method}}
{{currentRequest.userAgent}}
{{currentRequest.isSecure}}

{{currentRoute.id}}
{{currentRoute.path}}
{{currentRoute.title}}
{{currentRoute.template}}
{{currentRoute.layout}}

{{currentDomain.current}}
{{currentDomain.default}}
{{currentDomain.resolved}}

{{systemInfo.environment}}
{{systemInfo.nodeVersion}}
{{systemInfo.timestamp}}
```

## Template Functions

### URL Transformers

The CMS provides three URL transformers with different behaviors for CDN support:

#### [url()] - Public URL (No CDN)

Generates URLs using the **public base URL** without CDN support.

```html
[url(/articles)]
[url(/contact#form)]
[url(/css/styles.css)]
```

**Output:**
- Without CDN: `https://example.com/css/styles.css`
- With CDN configured: `https://example.com/css/styles.css` (same, CDN ignored)

**Use for:** Internal application routes, API endpoints, form actions.

#### [cdn()] - CDN or Public URL

Generates URLs using the **CDN URL if configured**, otherwise falls back to public URL.

```html
[cdn(/css/styles.css)]
[cdn(/js/scripts.js)]
[cdn(/assets/web/logo.png)]
```

**Output:**
- Without CDN: `https://example.com/css/styles.css`
- With CDN configured: `https://cdn.example.com/css/styles.css`

**Use for:** Static assets outside `/assets` folder (CSS, JS, fonts, etc.).

#### [asset()] - CDN or Public URL + /assets Prefix

Generates URLs using the **CDN URL if configured** and **automatically prepends `/assets`** to the path.

```html
[asset(/web/logo.png)]
[asset(/images/hero.jpg)]
```

**Output:**
- Without CDN: `https://example.com/assets/web/logo.png`
- With CDN configured: `https://cdn.example.com/assets/web/logo.png`

**Use for:** Static assets inside `/assets` folder (images, downloads, media files).

---

### URL Transformer Best Practices

**Based on folder structure:**

```
public/
  assets/          # Use [asset(/file)] OR [cdn(/assets/file)]
    web/
    images/
    downloads/
  css/             # Use [cdn(/css/file)]
  js/              # Use [cdn(/js/file)]
  fonts/           # Use [cdn(/fonts/file)]
```

**Examples:**

```html
<!-- Files in public/assets/ -->
<meta property="og:image" content="[asset(/web/logo.png)]"/>
<img src="[asset(/images/hero.jpg)]" alt="Hero"/>

<!-- Files in public/css/, public/js/, etc. -->
<link rel="stylesheet" href="[cdn(/css/styles.css)]"/>
<script src="[cdn(/js/scripts.js)]"></script>

<!-- Internal routes -->
<form action="[url(/api/submit)]" method="post">
<a href="[url(/articles)]">Articles</a>
```

**Key Rules:**
- `[asset(/file)]` adds `/assets` prefix automatically → Use for files in `/assets` folder
- `[cdn(/assets/file)]` requires full path → Alternative for files in `/assets` folder
- `[cdn(/css/file)]` requires full path → Use for files outside `/assets` (css, js, fonts)
- `[url(/path)]` never uses CDN → Use for application routes only

**Recommendation:** Use `[asset()]` for `/assets` files (cleaner syntax), `[cdn()]` for everything else.

### Date Formatting

```html
[date()]
[date(now, Y-m-d)]
[date(2024-01-01, d/m/Y)]
```

### Internationalization

```html
[translate(welcome.message)]
[t(hello.world, Hello World!)]
[t(greeting, Hi {name}!, {name: John})]
```

## Enhanced Context Passing

Child content blocks and partials receive context from parent pages:

```html
<entity name="cmsBlocks" field="name" value="article-sidebar"/>

{{currentEntity.title}}
{{currentEntity.id}}
{{currentEntity.template}}
```

## Entity Rendering

### Single Entity

```html
<entity name="cmsBlocks" field="name" value="header-main"/>
<entity name="cmsBlocks" field="name" value="sidebar-left"/>
<entity name="articles" id="123"/>
<entity name="cmsPages" id="1"/>
```

### Single Field Collections

Extract and concatenate a single field from multiple records:

```html
<collection name="cmsBlocks" filters="{status: 'active', category: 'navigation'}" field="content"/>
<collection name="articles" filters="{featured: true}" field="title"/>
<collection name="articles" filters="{featured: true}" field="title" data="{limit: 5, sortBy: 'created_at', sortDirection: 'desc'}"/>
```

### Loop Collections

```html
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
```

### Paginated Collections

```html
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
```

**Pagination Attributes:**

- `pagination="collection-id"` - Enables pagination with unique identifier
- `container="templateName"` - Custom pagination template (defaults to "pagedCollection")
- `prevPages="2"` - Number of previous page links to show (default: 2)
- `nextPages="2"` - Number of next page links to show (default: 2)

**Pagination URL Parameters:**

```
/articles?articles-1-key={"page":2,"limit":10,"sortBy":"created_at","sortDirection":"desc"}
```

**Available Pagination Template Variables:**

- `{{&collectionContentForCurrentPage}}` - Rendered collection items for current page
- `{{currentPage}}` - Current page number
- `{{totalPages}}` - Total number of pages
- `{{totalRecords}}` - Total number of records
- `{{prevPageUrl}}` / `{{nextPageUrl}}` - Previous/next page URLs
- `{{&prevPageLabel}}` / `{{&nextPageLabel}}` - Previous/next link labels
- `{{#prevPages}}` / `{{#nextPages}}` - Arrays of page objects with pageUrl and pageLabel
- `{{hasNextPage}}` / `{{hasPrevPage}}` - Boolean flags for navigation availability

## Custom Partials

### HTML-style Syntax

```html
<partial name="hero"
    sectionStyle=" bg-black"
    bigTextHtml="A free open-source platform!"
    mediumTextHtml="Build with Node.js, MySQL"
    imageUrl="/assets/web/logo.png"
    imageAlt="Logo" />

<partial name="productCard"
    title="Premium Package"
    price="$99"
    highlighted="true">
</partial>
```

### Mustache Syntax

```html
{{>hero -{
    bigTextHtml: "Welcome!",
    mediumTextHtml: "Build with Node.js",
    imageUrl: "https://example.com/hero.jpg",
    ctaText: "Get Started",
    ctaLink: "/documentation"
}-}}

<collection name="cmsPages" filters="{featured: true}" data="{limit: 3}">
    {{>cardView -{row}-}}
</collection>

{{>productCard -{
    title: "Premium Package",
    price: "$99",
    features: ["Advanced Analytics", "Priority Support"],
    highlighted: true
}-}}
```

## Collection Query Options

Collections support advanced query parameters:

- **limit** - Maximum number of records to return
- **offset** - Number of records to skip (for pagination)
- **sortBy** - Field name to sort by
- **sortDirection** - Sort direction ('asc' or 'desc')

### Examples

```html
<collection name="articles" filters="{}" field="title" data="{limit: 5, sortBy: 'title'}"/>

<collection name="articles" filters="{published: true}" data="{limit: 10, offset: 20, sortBy: 'created_at', sortDirection: 'desc'}">
  <article>{{row.title}}</article>
</collection>

<collection name="articles" filters="{featured: true}" data="{limit: 3, sortBy: 'created_at', sortDirection: 'desc'}">
  <div class="featured-article">{{row.title}}</div>
</collection>
```

## Layout System

### page.html - Full HTML wrapper

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

### layouts/default.html - Body content only

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

## Content Blocks

Create reusable content blocks in the cms_blocks table via admin panel:

```sql
INSERT INTO cms_blocks (name, title, content) VALUES
('contact-info', 'Contact Information', '<p>Email: info@example.com</p>'),
('article-sidebar', 'Article Categories',
'<div class="categories"><h3>Categories</h3><ul><li><a href="[url(/articles/technology)]">Technology</a></li></ul></div>');
```
