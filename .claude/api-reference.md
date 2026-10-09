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
- `loadPrismaModules(projectRoot, clientPath, connectionData, adapterPackage, adapterClass)` - Static; resolves the Prisma adapter from the project and loads the Prisma modules via PrismaClientLoader
- `initializeDataServer()` - Create data server; loads the `[driver]Modules` object through `StorageDriversResolver.loadModules()` (or `loadPrismaModules()` for prisma) when the Manager did not receive it
- `setupEntityAccess()` - Sync entity access rules to database
- `loadProcessedEntities()` - Apply config overrides and process raw entities
- `generateAdminEntities()` - Generate admin panel entity definitions
- `initializeAdminManager()` - Set up admin routes and authentication
- `initializePasswordEncryptionHandler()` - Register password encryption event listeners
- `initializeCmsPagesRouteManager()` - Wire CMS page routes to the data server
- `initializeFrontend()` - Create and initialize Frontend instance
- `renderCallback(template, params)` - Render a template via the configured render engine

## StorageDriversResolver Class (lib/storage-drivers-resolver.js)

Static registry of the `@reldens/storage` drivers, built on the `@reldens/server-utils` `PackageResolver` and the storage `*ModulesLoader` classes:

- `drivers()` - Driver list with `key`, `label`, `modulesProp` and the packages each optional driver needs
- `modulesProp(driverKey)` - Name of the `[driver]Modules` prop for a driver key
- `available(projectRoot, prismaAdapter)` - Drivers whose packages resolve from the project (`knex` always)
- `loadModules(driverKey, projectRoot, client)` - Load the driver modules with the matching storage loader (prisma excluded)

## Installer Class

- `isInstalled()` - Check installation status
- `storageDriversOptions(selectedDriver)` - Selector options for the drivers available in the project
- `appendDriverModules(dbConfig, selectedDriver)` - Load the selected driver modules into the installation data server config
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
- `findTemplateByPath(path, domain)` - Template lookup by URL path, a template name that fails `FileHandler.isValidPath` (for example with `../`) is never resolved, so a request path can not reach a file outside the templates folders
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
- `buildCacheKey(path, req)` - Cache key of a page request (used for the cache read and write): the path without `-key` query parameters, false (no cache) for a form result page (`form-key`), otherwise the path plus the SHA-256 of the sorted `-key` parameters only
- `buildQueryCacheKey(path, query, queryKeys)` - Path plus the SHA-256 of the given query values, used by the search with every query parameter
- `CacheManager.set(domain, path, content, basePath)` - A query variant (path different from `basePath`) is not written when the path already has `maxVariantsPerPath` cached files (Manager `cacheMaxVariantsPerPath`, default 100, `0` without limit)
- `CacheManager.generateCacheKey(domain, path)` returns false (no cache read or write) when the request domain and path fail `FileHandler.isValidPath`, so the Host header or a `..` path can not leave the cache domain folder, and `CacheManager.generateEnabledCacheKey(domain, path)` (used by `get` and `set`) only caches the configured domains (`defaultDomain`, the `domainMapping` keys and values, the `domainPublicUrlMapping` keys, the `domains` hostnames and aliases and the `RELDENS_APP_HOST` and `RELDENS_PUBLIC_URL` hostnames), any other Host value is rendered without cache

### ContentRenderer Class

- `renderWithTemplateContent(content, data, domain, req, route)` - Main content rendering
- `generateRouteContent(route, domain, req)` - Route-based content generation
- `generateTemplateContent(templatePath, domain, req, data)` - Template-based content generation
- `fetchMetaFields(data)` - Process meta fields for templates

### EntityAccessManager Class

- `loadEntityAccessRules()` - Load the `entities_access` rows (`is_public` and the `access_rules` JSON)
- `getAccessRules(entityName)` - The Manager `entityAccess[entityName].accessRules` overridden by the row `access_rules` (`publicFilters`, `publicSort`, `publicMaxLimit`, `publicConditions`, `publicRelations`, and `searchSets` for the `cmsSearch` entry)
- `resolvePublicAccess(entityName, defaultValue)` - The row `is_public` when the row exists, otherwise the default (used for `searchEnabled`)
- `isEntityAccessible(entityName)` - Check entity accessibility
- `findEntityByPath(path)` - Entity lookup by URL path for the public entities
- `loadPublicEntity(entity, entityName, entityId)` - Load the row by id with the `publicConditions`, with only the `publicRelations` (no relations by default)

### ResponseManager Class

- `renderWithCacheHandler(contentGenerator, errorHandler, responseHandler, domain, res, path, req)` - Generic cached response handler
- `renderNotFound(domain, res, req)` - 404 error handling

### SearchRequestHandler Class

- `handleSearchRequest(req, res)` - Process search requests with template data support

## PaginationHandler Class

- `extractCollectionKeyFromRequest(req, collectionId)` - Parse and sanitize the `<collectionId>-key` request parameter (page, limit, sortBy, sortDirection, filters)
- `mergeCollectionParameters(templateParams, requestParams, entityName)` - Merge the request parameters into the template ones with the entity access rules (`getAccessRules` prop): the template filters always win, the request filters are kept only for the `publicFilters`, the sort only for the `publicSort` and the limit is capped by `resolvePublicLimit`
- `fetchPublicFields(entityName, rulesKey)` - The `publicFilters` or `publicSort` array of the entity access rules
- `filterPublicFilters(requestFilters, entityName)` - Keep the request filters of the `publicFilters` properties with scalar values
- `resolvePublicSort(requestSortBy, templateSortBy, entityName)` - The request sort only for a `publicSort` property, otherwise the template sort, also used by `Search.searchEntity`
- `resolvePublicLimit(requestLimit, templateLimit, entityName)` - Template limit without a request limit, otherwise the request limit capped to the entity `publicMaxLimit` (default `defaultPublicMaxLimit`, 100), `publicMaxLimit: 0` allows any limit, also used by `Search.searchEntity` (the search `limit` and `sortBy` query values are kept as `requestLimit` and `requestSortBy` in the pagination config)

## TemplateEngine Class

- `render(template, data, partials, domain, req, route, currentEntityData)` - Main template rendering with enhanced context
- `processAllTemplateFunctions(template, domain, req, systemVariables)` - Process all template functions
- `buildEnhancedRenderData(data, systemVariables, currentEntityData)` - Build template context with system variables

## SystemVariablesProvider Class

- `buildSystemVariables(req, route, domain)` - Create system variables for templates
- `buildCurrentRequestData(req, domain)` - Build request context, the X-Public-URL header and the X-Forwarded-Host public URL mapping are only used for requests from a trusted proxy
- `isTrustedProxyRequest(req)` - Check the request peer with the Express `trust proxy fn`, false when the request has no app or socket
- `buildCurrentRouteData(route)` - Build route context
- `buildCurrentDomainData(domain)` - Build domain context

## Search Classes

- `Search.parseSearchParameters(query)` - Parse the search query parameters allowed by the search set `requestOptions` (default only `pagination`), the set `render` config is the default render config and a fresh `templateData` copy is used for each search
- `Search.applyRenderQuery(query, renderConfig)` / `Search.applyTemplateDataQuery(query, templateData)` - Read the render and templateData URL parameters when their request options are enabled
- `Search.applySearchAccessRules(searchAccessRules)` - Replace the search sets with the `searchSets` of the `cmsSearch` access rules, called by the Frontend after loading the entities access rows
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
- `loadFormTemplate(templateName, domain)` - Load form template with domain fallback, the loaded templates are kept by template file path so the request domain values can not grow the memory
- `findFormTemplate(templateName, domain)` - Template discovery for forms

### DynamicFormRequestHandler Class

- `handleFormSubmission(req, res)` - Process POST form submissions
- `handleBadRequest(res, message)` - Handle validation errors
- `handleSuccessResponse(req, res, formKey, result)` - Handle successful submissions
- `buildErrorRedirectPath(req, error, formKey)` - Build error redirect URLs
- `buildSuccessRedirectPath(successRedirect, formKey)` - Build success redirect URLs
- `resolveRedirectPath(redirectValue)` - Keep only the path and query of the redirect target (body `successRedirect` and `errorRedirect`, `Referer` header), a value that is not a same site path becomes `/`

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
