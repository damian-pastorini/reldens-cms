# API Reference

## Manager Class

- `start()` - Initialize and start the CMS
- `isInstalled()` - Check if CMS is installed
- `buildAppServerConfiguration()` - Build server configuration
- `validateCdnMappingsInDevelopment()` - Warn when CDN domains are missing from CSP directives
- `isCdnUrlInDirectives(cdnUrlWithProtocol, cdnHostname)` - Check if a CDN URL appears in any CSP directive
- `initializeCmsAfterInstall(props)` - Post-installation callback

## ManagerComponentValidator Class (lib/manager-component-validator.js)

Static validators called from the Manager constructor:

- `validateProvidedServer(app, appServer)` - Validate provided Express app and server
- `validateProvidedDataServer(dataServer)` - Validate provided data server
- `validateProvidedAdminManager(adminManager)` - Validate provided admin manager
- `validateProvidedFrontend(frontend)` - Validate provided frontend

## ManagerConfigLoader Class (lib/manager-config-loader.js)

- `loadFromEnv()` - Build config object from `RELDENS_*` environment variables

## ManagerServicesInitializer Class (lib/manager-services-initializer.js)

Receives the Manager instance via constructor and handles all service initialization:

- `initializeServices()` - Orchestrate full service initialization sequence
- `initializeDataServer()` - Create data server; auto-creates PrismaClient via PrismaClientLoader when driver is `prisma` and no client provided
- `setupEntityAccess()` - Sync entity access rules to database
- `loadProcessedEntities()` - Apply config overrides and process raw entities
- `generateAdminEntities()` - Generate admin panel entity definitions
- `initializeAdminManager()` - Set up admin routes and authentication
- `initializePasswordEncryptionHandler()` - Register password encryption event listeners
- `initializeCmsPagesRouteManager()` - Wire CMS page routes to the data server
- `initializeFrontend()` - Create and initialize Frontend instance
- `renderCallback(template, params)` - Render a template via the configured render engine

## Installer Class

- `isInstalled()` - Check installation status
- `configureAppServerRoutes(app, appServer, appServerFactory, renderEngine)` - Setup installer routes
- `executeInstallProcess(req, res)` - Complete installation process
- `runSubprocessInstallation(dbConfig, templateVariables)` - Handle subprocess operations
- `checkAndInstallPackages(requiredPackages)` - Check and install dependencies
- `generateEntities(server, isOverride, isInstallationMode, isDryPrisma, dbConfig)` - Generate entities
- `createEnvFile(templateVariables)` - Create environment configuration
- `copyAdminDirectory()` - Copy admin assets and templates

## Frontend Architecture Classes

### Frontend Class (Orchestrator)

- `initialize()` - Set up frontend routes and templates
- `handleRequest(req, res)` - Main request handler
- `renderRoute(route, domain, res, req)` - Route-based rendering
- `setupStaticAssets()` - Configure static asset serving

### TemplateResolver Class

- `findTemplatePath(templateName, domain)` - Template discovery with domain fallback
- `findLayoutPath(layoutName, domain)` - Layout path resolution
- `findTemplateByPath(path, domain)` - Template lookup by URL path
- `resolveDomainToFolder(domain)` - Domain to folder mapping
- `resolveDomainToSiteKey(domain)` - Domain to site key mapping

### TemplateCache Class

- `loadPartials()` - Load and cache template partials
- `setupDomainTemplates()` - Initialize domain-specific templates
- `getPartialsForDomain(domain)` - Get domain-specific partials with fallback

### TemplateReloader Class

- `checkAndReloadAdminTemplates()` - Check and reload admin templates when changed
- `checkAndReloadFrontendTemplates()` - Check and reload frontend templates when changed
- `trackTemplateFiles(templatesPaths)` - Start tracking template files for changes
- `shouldReloadAdminTemplates(mappedAdminTemplates)` - Check if admin templates need reloading
- `shouldReloadFrontendTemplates(templatesPath, templateExtensions)` - Check if frontend templates need reloading
- `handleAdminTemplateReload(adminManager)` - Complete admin template reload process
- `handleFrontendTemplateReload(templateCache, templateResolver)` - Complete frontend template reload process

### RequestProcessor Class

- `findRouteByPath(path, domain)` - Database route lookup
- `handleRouteRedirect(route, res)` - Handle route redirects
- `getDomainFromRequest(req)` - Extract domain from request
- `buildCacheKey(path, req)` - Generate cache keys

### ContentRenderer Class

- `renderWithTemplateContent(content, data, domain, req, route)` - Main content rendering
- `generateRouteContent(route, domain, req)` - Route-based content generation
- `generateTemplateContent(templatePath, domain, req, data)` - Template-based content generation
- `fetchMetaFields(data)` - Process meta fields for templates

### EntityAccessManager Class

- `loadEntityAccessRules()` - Load entity access configuration
- `isEntityAccessible(entityName)` - Check entity accessibility
- `findEntityByPath(path)` - Entity lookup by URL path

### ResponseManager Class

- `renderWithCacheHandler(contentGenerator, errorHandler, responseHandler, domain, res, path, req)` - Generic cached response handler
- `renderNotFound(domain, res, req)` - 404 error handling

### SearchRequestHandler Class

- `handleSearchRequest(req, res)` - Process search requests with template data support

## TemplateEngine Class

- `render(template, data, partials, domain, req, route, currentEntityData)` - Main template rendering with enhanced context
- `processAllTemplateFunctions(template, domain, req, systemVariables)` - Process all template functions
- `buildEnhancedRenderData(data, systemVariables, currentEntityData)` - Build template context with system variables

## SystemVariablesProvider Class

- `buildSystemVariables(req, route, domain)` - Create system variables for templates
- `buildCurrentRequestData(req, domain)` - Build request context
- `buildCurrentRouteData(route)` - Build route context
- `buildCurrentDomainData(domain)` - Build domain context

## Search Classes

- `Search.parseSearchParameters(query)` - Parse search query parameters including templateData
- `Search.executeSearch(config)` - Execute search with configuration
- `SearchRenderer.renderSearchResults(searchResults, config, domain, req)` - Render search results with template data

## Forms System Classes

### DynamicForm Class

- `validateFormSubmission(formKey, submittedValues, req)` - Validate form submission
- `getFormConfig(formKey)` - Load form configuration from database
- `validateHoneypot(submittedValues)` - Check honeypot field for bots
- `validateFields(fieldsSchema, submittedValues)` - Schema-based field validation
- `prepareSubmittedValues(submittedValues, fieldsSchema)` - Process and normalize values
- `saveFormSubmission(formConfig, preparedValues)` - Save to database

### DynamicFormRenderer Class

- `renderForm(formConfig, fieldsToRender, domain, req, attributes)` - Render complete form
- `renderFormFields(fieldsToRender, domain, req)` - Render field set
- `renderFormField(field, domain, submittedValues, errors)` - Render individual field
- `loadFormTemplate(templateName, domain)` - Load form template with domain fallback
- `findFormTemplate(templateName, domain)` - Template discovery for forms

### DynamicFormRequestHandler Class

- `handleFormSubmission(req, res)` - Process POST form submissions
- `handleBadRequest(res, message)` - Handle validation errors
- `handleSuccessResponse(req, res, formKey, result)` - Handle successful submissions
- `buildErrorRedirectPath(req, error, formKey)` - Build error redirect URLs
- `buildSuccessRedirectPath(successRedirect, formKey)` - Build success redirect URLs

### FormsTransformer Class

- `transform(template, domain, req, systemVariables, enhancedData)` - Process cmsForm tags
- `findAllFormTags(template)` - Find cmsForm tags in template
- `parseFormAttributes(fullTag)` - Parse tag attributes
- `parseFieldsFilter(attributes, formConfig)` - Filter fields based on attributes

## AdminManager Class

- `setupAdmin()` - Initialize admin panel
- `generateListRouteContent()` - Entity list pages
- `generateEditRouteContent()` - Entity edit forms
- `processSaveEntity()` - Handle form submissions
