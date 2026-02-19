# Multi-Domain and Internationalization Guide

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
[translate(navigation.home)]
[t(navigation.home, Home)]
[t(messages.greeting, Hello!, {name: John})]
```

Locale detection from request headers or ?locale=es parameter.

## Multi-Domain Setup

### Directory Structure

```
templates/
├── layouts/
│   ├── default.html
│   ├── full-width.html
│   └── minimal.html
├── domains/
│   ├── example.com/
│   │   ├── layouts/
│   │   ├── partials/
│   │   │   ├── header.html
│   │   │   └── footer.html
│   │   ├── cms_forms/
│   │   │   ├── form.html
│   │   │   └── field_text.html
│   │   ├── page.html
│   │   └── index.html
│   └── dev.example.com/
│       └── page.html
├── partials/
│   ├── header.html (default)
│   └── footer.html (default)
├── cms_forms/
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

### Template Resolution Order

1. Domain-specific: `templates/domains/{domain}/template.html`
2. Default: `templates/template.html`
3. Base: Package default templates

### Configuration

```javascript
const cms = new Manager({
    defaultDomain: 'example.com',
    domainMapping: {'dev.example.com': 'development'},
    siteKeyMapping: {'example.com': 'main'}
});
```

## Layout System

The CMS uses a two-tier layout system:

**page.html - Full HTML wrapper:**

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

**layouts/default.html - Body content only:**

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

**Available Layouts:**

Pages can use different layouts by setting the `layout` field in `cms_pages`:

- `default` - Header, sidebar, main content, footer
- `full-width` - Full width without sidebars
- `minimal` - Basic layout with minimal styling

## Content Blocks

Create reusable content blocks in the `cms_blocks` table via admin panel:

```sql
INSERT INTO cms_blocks (name, title, content) VALUES
('contact-info', 'Contact Information', '<p>Email: info@example.com</p>'),
('article-sidebar', 'Article Categories',
'<div class="categories"><h3>Categories</h3><ul><li><a href="[url(/articles/technology)]">Technology</a></li></ul></div>');
```

## Entity Access Control

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
