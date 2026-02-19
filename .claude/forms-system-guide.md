# Dynamic Forms System Guide

## Basic Form Usage

Create forms in your templates using the `<cmsForm>` tag:

```html
<cmsForm key="contactForm"/>
<cmsForm key="contactForm" fields="name,email,subject,message"/>
<cmsForm key="newsletterSignup"
    fields="email,name"
    submitButtonText="Subscribe Now"
    cssClass="newsletter-form"
    successRedirect="/thank-you"
    errorRedirect="/contact-error"/>
```

## Form Configuration

Forms are configured in the `cms_forms` table via the admin panel.

### Supported Field Types

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

```json
{
    "name": "fieldName",
    "type": "text",
    "label": "Field Label",
    "required": true,
    "placeholder": "Enter text...",
    "helpText": "Additional help",
    "maxLength": 100,
    "minLength": 3,
    "pattern": "^[A-Za-z]+$",
    "min": 0,
    "max": 100,
    "step": 1,
    "defaultValue": "default",
    "options": [
        {"value": "val1", "label": "Option 1"},
        {"value": "val2", "label": "Option 2"}
    ]
}
```

## Security Features

### Honeypot Protection

Automatic bot detection using invisible fields.

### Server-Side Validation

- SchemaValidator integration
- Required field validation
- Type validation
- Length limits
- Custom validation

### Data Sanitization

- XSS protection
- Input normalization
- Length truncation

### Rate Limiting

Uses AppServerFactory integration from server-utils.

## Template Customization

Forms use a domain-aware template fallback system:

```
templates/
├── domains/
│   └── example.com/
│       └── cms_forms/
│           ├── form.html
│           ├── field_text.html
│           └── field_email.html
└── cms_forms/
    ├── form.html
    ├── field_text.html
    ├── field_email.html
    ├── field_textarea.html
    ├── field_select.html
    └── field_number.html
```

## Event System Integration

### Available Form Events

- `reldens.formsTransformer.beforeRender` - Before form rendering
- `reldens.formsTransformer.afterRender` - After form rendering
- `reldens.dynamicForm.beforeValidation` - Before form validation
- `reldens.dynamicForm.afterValidation` - After form validation
- `reldens.dynamicForm.beforeSave` - Before saving to database
- `reldens.dynamicForm.afterSave` - After successful save
- `reldens.dynamicFormRenderer.beforeFieldsRender` - Before rendering fields
- `reldens.dynamicFormRenderer.afterFieldsRender` - After rendering fields
- `reldens.dynamicFormRequestHandler.beforeValidation` - Before request validation
- `reldens.dynamicFormRequestHandler.beforeSave` - Before save process
- `reldens.dynamicFormRequestHandler.afterSave` - After successful save

### Example Event Usage

```javascript
cms.events.on('reldens.formsTransformer.beforeRender', (eventData) => {
    eventData.formAttributes.cssClass += ' custom-form';
});

cms.events.on('reldens.dynamicForm.afterSave', (eventData) => {
    console.log('Form saved:', eventData.result.id);
});
```

## Database Tables

### cms_forms Table

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

### cms_forms_submitted Table

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

## Form Processing Flow

1. Template Processing - FormsTransformer finds cmsForm tags
2. Form Loading - Loads form configuration from database
3. Field Filtering - Applies field filter if specified
4. Template Rendering - Renders form using domain-aware templates
5. Form Submission - POST request to /dynamic-form endpoint
6. Validation - Honeypot, required fields, and schema validation
7. Data Processing - Input sanitization and normalization
8. Database Storage - Save to cms_forms_submitted table
9. Response - Redirect with success/error parameters

## Advanced Usage

### AJAX Form Submissions

```javascript
const cms = new Manager({
    enableJsonResponse: true
});
```

```javascript
document.querySelector('.dynamic-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    let response = await fetch('/dynamic-form', {method: 'POST', body: new FormData(this)});
    let result = await response.json();
    if(result.success){
        alert('Form submitted successfully!');
        return;
    }
    alert('Error: '+result.error);
});
```
