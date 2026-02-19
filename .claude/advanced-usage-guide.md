# Advanced Usage Guide

## Template Reloading for Development

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

const cms = new Manager({
    reloadTime: isDevelopment ? -1 : 0,
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

## Event System

The CMS provides hooks for customization through event listeners:

```javascript
cms.events.on('reldens.afterVariablesCreated', (eventData) => {
    eventData.variables.customData = {
        timestamp: Date.now(),
        version: '1.0.0'
    };
});

cms.events.on('reldens.beforeContentProcess', (eventData) => {
    eventData.content = eventData.content.replace(/\[custom\]/g, 'Custom Value');
});

cms.events.on('reldens.afterContentProcess', (eventData) => {
    eventData.processedContent += '\n<!-- Processed at '+new Date()+' -->';
});

cms.events.on('reldens.templateReloader.templatesChanged', (eventData) => {
    console.log('Templates changed:', eventData.changedFiles);
});

cms.events.on('reldens.dynamicForm.afterSave', (eventData) => {
    console.log('Form submission received:', eventData.result.id);
});
```

## Custom Authentication

```javascript
const customAuth = async (email, password, roleId) => {
    let user = await yourAuthService.authenticate(email, password);
    return user && user.role_id === roleId ? user : false;
};

const cms = new Manager({
    authenticationMethod: 'custom',
    authenticationCallback: customAuth
});
```

## File Upload Configuration

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

## Event Hooks

```javascript
cms.events.on('reldens.setupAdminRoutes', ({adminManager}) => {
    adminManager.adminRouter.get('/custom', (req, res) => {
        res.send('Custom admin page');
    });
});

cms.events.on('adminEntityExtraData', ({entitySerializedData, entity}) => {
    entitySerializedData.customField = 'Custom Value';
});
```

## Event-Driven Customizations

The CMS uses an event system for extensibility. This allows you to add custom behavior without modifying core CMS files.

### Admin UI Customizations

Add buttons and content to admin views using events. Always use templates and renderCallback - never hardcode HTML in classes.

**Step 1: Create template file** (`admin/templates/custom-button.html`):
```html
<button class="button button-primary" type="submit" form="edit-form"
        name="customAction" value="customValue">
    {{&buttonText}}
</button>
```

**Step 2: Register template** in `lib/templates-list.js`:
```javascript
module.exports.TemplatesList = {
    // ... existing templates
    customButton: 'custom-button.html',
};
```

**Step 3: Create subscriber class**:
```javascript
const { Logger, sc } = require('@reldens/utils');

class CustomButtonSubscriber
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        this.renderCallback = sc.get(props, 'renderCallback', false);
        this.customButtonTemplate = sc.get(props, 'customButtonTemplate', '');
        this.translations = sc.get(props, 'translations', {});
        this.setupEvents();
    }

    setupEvents()
    {
        if(!this.events){
            Logger.error('Events Manager not found on CustomButtonSubscriber.');
            return false;
        }
        this.events.on('reldens.adminEditPropertiesPopulation', this.addCustomButton.bind(this));
    }

    async addCustomButton(event)
    {
        if(!this.customButtonTemplate){
            Logger.error('Custom button template not found');
            return '';
        }
        if(!this.renderCallback){
            Logger.error('Render callback not available');
            return '';
        }
        if(!event.renderedEditProperties.extraContentForEdit){
            event.renderedEditProperties.extraContentForEdit = '';
        }
        let buttonHtml = await this.renderCallback(
            this.customButtonTemplate,
            {
                buttonText: sc.get(this.translations.labels, 'customAction', 'Custom Action')
            }
        );
        event.renderedEditProperties.extraContentForEdit += buttonHtml;
    }

}
```

**Step 4: Initialize in AdminManager**:
```javascript
this.customButtonSubscriber = new CustomButtonSubscriber({
    events: this.events,
    renderCallback: this.renderCallback,
    customButtonTemplate: this.adminFilesContents.customButton,
    translations: this.translations
});
```

**See `lib/cache/save-and-clear-cache-subscriber.js` for complete working example.**

### Form Processing Customizations

Handle custom save actions and form submissions:

```javascript
class CustomFormHandler
{

    constructor(props)
    {
        this.events = props.events;
        this.dataServer = props.dataServer;
        this.setupEvents();
    }

    setupEvents()
    {
        this.events.on('reldens.dynamicFormRequestHandler.beforeSave', this.beforeSave.bind(this));
        this.events.on('reldens.dynamicFormRequestHandler.afterSave', this.afterSave.bind(this));
    }

    async beforeSave(event)
    {
        if(event.validationResult.errors){
            event.validationResult.extraErrors = this.customValidation(event.formData);
        }
    }

    async afterSave(event)
    {
        let customAction = event.req?.body?.customAction;
        if('customValue' === customAction){
            await this.performCustomAction(event.result);
        }
    }

    customValidation(formData)
    {
        let errors = [];
        if(formData.customField && formData.customField.length < 10){
            errors.push('customField must be at least 10 characters');
        }
        return errors;
    }

    async performCustomAction(savedEntity)
    {
        Logger.info('Performing custom action for entity:', savedEntity.id);
    }

}

let manager = new Manager(managerConfiguration);
new CustomFormHandler({
    events: manager.events,
    dataServer: manager.dataServer
});
```

### Entity Config Overrides

Customize generated entity configurations without editing generated files:

```javascript
class CmsPagesOverride
{

    /**
     * @param {Object} baseConfig
     * @param {Object} props
     * @returns {Object}
     */
    static propertiesConfig(baseConfig, props)
    {
        baseConfig.properties.meta_og_image = {
            ...baseConfig.properties.meta_og_image,
            isUpload: true,
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
            bucket: 'cms-og-images',
            bucketPath: '/og-images/'
        };
        baseConfig.properties.status = {
            ...baseConfig.properties.status,
            type: 'select',
            options: [
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' }
            ]
        };
        return baseConfig;
    }

}

let manager = new Manager({
    ...managerConfiguration,
    entitiesConfigOverride: {
        'cmsPages': CmsPagesOverride  // CRITICAL: Use camelCase key from entities-config.js
    }
});
```

**CRITICAL: Entity keys must match exactly as defined in `generated-entities/entities-config.js`:**
- Use `'cmsPages'` NOT `'cms-pages'`
- Use `'cmsBlocks'` NOT `'cms-blocks'`
- Use `'cmsForms'` NOT `'cms-forms'`
- Keys are camelCase, not kebab-case

### Conditional Event Handling

Control when customizations apply based on conditions:

```javascript
const { Logger, sc } = require('@reldens/utils');

class ConditionalCustomization
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.renderCallback = sc.get(props, 'renderCallback', false);
        this.contentTemplate = sc.get(props, 'contentTemplate', '');
        this.setupEvents();
    }

    setupEvents()
    {
        if(!this.cacheManager?.isEnabled()){
            return false;
        }
        if(!this.events){
            Logger.error('Events Manager not found.');
            return false;
        }
        this.events.on('reldens.adminEditPropertiesPopulation', this.addContent.bind(this));
    }

    async addContent(event)
    {
        if('routes' !== event.driverResource.id()){
            return false;
        }
        if(!this.contentTemplate || !this.renderCallback){
            return false;
        }
        if(!event.renderedEditProperties.extraContentForEdit){
            event.renderedEditProperties.extraContentForEdit = '';
        }
        let contentHtml = await this.renderCallback(this.contentTemplate, {});
        event.renderedEditProperties.extraContentForEdit += contentHtml;
    }

}

let manager = new Manager(managerConfiguration);
new ConditionalCustomization({
    events: manager.events,
    cacheManager: manager.cacheManager,
    renderCallback: manager.renderCallback,
    contentTemplate: manager.adminFilesContents.conditionalContent
});
```

**CRITICAL: Never hardcode HTML strings in subscriber classes. Always use templates with renderCallback and translations.**

### Available Admin Events

**View/Edit/List Property Population**:
- `reldens.adminViewPropertiesPopulation` - Add content to view pages
- `reldens.adminEditPropertiesPopulation` - Add content to edit pages
- `reldens.adminListPropertiesPopulation` - Add content to list pages

**Entity Operations**:
- `reldens.adminBeforeEntitySave` - Before entity save
- `reldens.adminAfterEntitySave` - After entity save

**Form Processing**:
- `reldens.dynamicFormRequestHandler.beforeValidation` - Before form validation
- `reldens.dynamicFormRequestHandler.beforeSave` - Before form save
- `reldens.dynamicFormRequestHandler.afterSave` - After form save

**Setup Events**:
- `reldens.setupAdminRouter` - Setup admin router
- `reldens.setupAdminRoutes` - Setup admin routes
- `reldens.setupAdminManagers` - Setup admin managers
