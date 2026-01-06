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
