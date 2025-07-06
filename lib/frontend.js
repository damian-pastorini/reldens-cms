/**
 *
 * Reldens - CMS - Frontend
 *
 */

const { TemplateEngine } = require('./template-engine');
const { Search } = require('./search');
const { SearchRenderer } = require('./search-renderer');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class Frontend
{

    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.appServerFactory = sc.get(props, 'appServerFactory', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.events = sc.get(props, 'events', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.templatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        this.publicPath = FileHandler.joinPaths(this.projectRoot, 'public');
        this.templateExtensions = sc.get(props, 'templateExtensions', ['.html', '.mustache', '.template']);
        this.defaultDomain = sc.get(props, 'defaultDomain', 'default');
        this.domainMapping = sc.get(props, 'domainMapping', {});
        this.siteKeyMapping = sc.get(props, 'siteKeyMapping', {});
        this.partialsCache = {};
        this.domainPartialsCache = new Map();
        this.domainTemplatesMap = new Map();
        this.entityAccessCache = new Map();
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.templateEngine = false;
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.searchPath = sc.get(props, 'searchPath', '/search');
        this.searchSets = sc.get(props, 'searchSets', false);
        this.searchConfig = {dataServer: this.dataServer};
        if(this.searchSets){
            this.searchConfig.searchSets = this.searchSets;
        }
        this.search = new Search(this.searchConfig);
        this.searchRenderer = new SearchRenderer({
            renderEngine: this.renderEngine,
            getPartials: this.getPartialsForDomain.bind(this)
        });
        this.metaDefaults = sc.get(props, 'metaDefaults', {
            locale: 'en',
            viewport: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover',
            meta_robots: 'index,follow',
            meta_theme_color: '#000000',
            meta_twitter_card_type: 'summary'
        });
    }

    async initialize()
    {
        if(!this.app || !this.dataServer){
            Logger.error('Missing app or dataServer');
            return false;
        }
        if(!this.renderEngine){
            Logger.error('Please, provide a renderEngine, it must contain a "render" method.');
            return false;
        }
        if(!sc.isFunction(this.renderEngine.render)){
            Logger.error('The provided renderEngine does not contain a "render" method.');
            return false;
        }
        if(!FileHandler.exists(this.templatesPath)){
            Logger.error('Templates folder not found: '+this.templatesPath);
            return false;
        }
        if(!FileHandler.exists(this.publicPath)){
            Logger.error('Public folder not found: '+this.publicPath);
            return false;
        }
        this.templateEngine = new TemplateEngine({
            renderEngine: this.renderEngine,
            dataServer: this.dataServer,
            getPartials: this.getPartialsForDomain.bind(this),
            entitiesConfig: this.entitiesConfig,
            events: this.events,
            defaultDomain: this.defaultDomain,
            projectRoot: this.projectRoot,
            publicPath: this.publicPath
        });
        this.searchConfig.jsonFieldsParser = this.templateEngine.jsonFieldsParser;
        await this.loadPartials();
        await this.setupDomainTemplates();
        await this.loadEntityAccessRules();
        this.setupStaticAssets();
        this.app.get(this.searchPath, async (req, res) => {
            return await this.handleSearchRequest(req, res);
        });
        this.app.get('*', async (req, res) => {
            return await this.handleRequest(req, res);
        });
        return true;
    }

    async loadEntityAccessRules()
    {
        let accessEntity = this.dataServer.getEntity('entitiesAccess');
        if(!accessEntity){
            Logger.warning('Entities Access not found.');
            return;
        }
        let accessRules = await accessEntity.loadAll();
        for(let rule of accessRules){
            this.entityAccessCache.set(rule.entity_name, rule.is_public);
        }
    }

    async loadPartials()
    {
        let partialsPath = FileHandler.joinPaths(this.templatesPath, 'partials');
        FileHandler.createFolder(partialsPath);
        let partialFiles = FileHandler.getFilesInFolder(partialsPath, this.templateExtensions);
        for(let file of partialFiles){
            let partialName = this.extractTemplateName(file);
            if(!partialName){
                continue;
            }
            let partialPath = FileHandler.joinPaths(partialsPath, file);
            let partialContent = FileHandler.readFile(partialPath);
            if(!partialContent){
                Logger.error('Failed to read partial: '+partialPath);
                continue;
            }
            this.partialsCache[partialName] = partialContent;
        }
    }

    async loadDomainPartials(domain, domainPath)
    {
        let domainPartialsPath = FileHandler.joinPaths(domainPath, 'partials');
        if(!FileHandler.exists(domainPartialsPath)){
            return;
        }
        let domainPartials = {};
        let partialFiles = FileHandler.getFilesInFolder(domainPartialsPath, this.templateExtensions);
        for(let file of partialFiles){
            let partialName = this.extractTemplateName(file);
            if(!partialName){
                continue;
            }
            let partialPath = FileHandler.joinPaths(domainPartialsPath, file);
            let partialContent = FileHandler.readFile(partialPath);
            if(!partialContent){
                Logger.error('Failed to read domain partial: '+partialPath);
                continue;
            }
            domainPartials[partialName] = partialContent;
        }
        this.domainPartialsCache.set(domain, domainPartials);
    }

    async setupDomainTemplates()
    {
        let domainsPath = FileHandler.joinPaths(this.templatesPath, 'domains');
        if(!FileHandler.exists(domainsPath)){
            return;
        }
        let domainFolders = FileHandler.fetchSubFoldersList(domainsPath);
        for(let domain of domainFolders){
            let domainPath = FileHandler.joinPaths(domainsPath, domain);
            this.domainTemplatesMap.set(domain, domainPath);
            await this.loadDomainPartials(domain, domainPath);
        }
    }

    extractTemplateName(filename)
    {
        for(let extension of this.templateExtensions){
            if(filename.endsWith(extension)){
                return filename.replace(extension, '');
            }
        }
        return false;
    }

    getDomainFromRequest(req)
    {
        let host = req.get('host');
        if(!host){
            return false;
        }
        return host.split(':')[0];
    }

    resolveDomainToFolder(domain)
    {
        if(!domain){
            domain = this.defaultDomain;
        }
        return sc.get(this.domainMapping, domain, domain);
    }

    resolveDomainToSiteKey(domain)
    {
        return sc.get(this.siteKeyMapping, this.resolveDomainToFolder(domain), 'default');
    }

    getPartialsForDomain(domain)
    {
        let resolvedDomain = this.resolveDomainToFolder(domain);
        let domainPartials = this.domainPartialsCache.get(resolvedDomain);
        if(!domainPartials && this.defaultDomain && resolvedDomain !== this.defaultDomain){
            domainPartials = this.domainPartialsCache.get(this.defaultDomain);
        }
        if(!domainPartials){
            return this.partialsCache;
        }
        return Object.assign({}, this.partialsCache, domainPartials);
    }

    findTemplatePath(templateName, domain)
    {
        let resolvedDomain = this.resolveDomainToFolder(domain);
        if(resolvedDomain){
            let domainPath = this.domainTemplatesMap.get(resolvedDomain);
            if(domainPath){
                let domainTemplatePath = this.findTemplateInPath(templateName, domainPath);
                if(domainTemplatePath){
                    return domainTemplatePath;
                }
            }
            if(this.defaultDomain && resolvedDomain !== this.defaultDomain){
                let defaultDomainPath = this.domainTemplatesMap.get(this.defaultDomain);
                if(defaultDomainPath){
                    let defaultTemplatePath = this.findTemplateInPath(templateName, defaultDomainPath);
                    if(defaultTemplatePath){
                        return defaultTemplatePath;
                    }
                }
            }
        }
        return this.findTemplateInPath(templateName, this.templatesPath);
    }

    findTemplateInPath(templateName, basePath)
    {
        for(let extension of this.templateExtensions){
            let templatePath = FileHandler.joinPaths(basePath, templateName + extension);
            if(FileHandler.exists(templatePath)){
                return templatePath;
            }
        }
        return false;
    }

    findLayoutPath(layoutName, domain)
    {
        let resolvedDomain = this.resolveDomainToFolder(domain);
        if(resolvedDomain){
            let domainPath = this.domainTemplatesMap.get(resolvedDomain);
            if(domainPath){
                let domainLayoutPath = this.findTemplateInPath('layouts/' + layoutName, domainPath);
                if(domainLayoutPath){
                    return domainLayoutPath;
                }
            }
        }
        return this.findTemplateInPath('layouts/' + layoutName, this.templatesPath);
    }

    setupStaticAssets()
    {
        if(!this.app || !this.appServerFactory || !this.publicPath){
            return false;
        }
        if(this.appServerFactory && this.appServerFactory.applicationFramework){
            this.app.use(this.appServerFactory.applicationFramework.static(this.publicPath));
            return true;
        }
        return false;
    }

    fetchMetaFields(data)
    {
        if(!sc.isObject(data) || 0 === Object.keys(data).length){
            return this.metaDefaults;
        }
        let result = Object.assign({}, this.metaDefaults);
        for(let key of Object.keys(data)){
            let value = data[key];
            if(null !== value && '' !== value && 'undefined' !== typeof value){
                result[key] = value;
            }
        }
        let titleValue = sc.get(result, 'title', '');
        let metaTitleValue = sc.get(result, 'meta_title', titleValue);
        if(metaTitleValue && '' !== metaTitleValue){
            result.meta_title = metaTitleValue;
        }
        let metaOgTitleValue = sc.get(result, 'meta_og_title', metaTitleValue);
        if(metaOgTitleValue && '' !== metaOgTitleValue){
            result.meta_og_title = metaOgTitleValue;
        }
        let metaDescValue = sc.get(result, 'meta_description', '');
        let metaOgDescValue = sc.get(result, 'meta_og_description', metaDescValue);
        if(metaOgDescValue && '' !== metaOgDescValue){
            result.meta_og_description = metaOgDescValue;
        }
        let jsonData = sc.get(result, 'json_data', null);
        if(sc.isString(jsonData)){
            jsonData = sc.toJson(jsonData, {});
        }
        if(!sc.isObject(jsonData)){
            jsonData = {};
        }
        let viewportValue = sc.get(jsonData, 'viewport', this.metaDefaults.viewport);
        if(viewportValue && '' !== viewportValue){
            jsonData.viewport = viewportValue;
        }
        result.json_data = jsonData;
        return result;
    }

    async handleSearchRequest(req, res)
    {
        try {
            let domain = this.getDomainFromRequest(req);
            let config = this.search.parseSearchParameters(req.query);
            if(!config){
                return res.redirect('/?error-message=searchInvalidParameters');
            }
            let cacheKey = this.buildCacheKey(req.path, req);
            if(this.cacheManager && this.cacheManager.isEnabled()){
                let cachedContent = await this.cacheManager.get(domain, cacheKey);
                if(cachedContent){
                    return res.send(cachedContent);
                }
            }
            let searchResults = await this.search.executeSearch(config);
            if(false === searchResults){
                return res.redirect('/?error-message=searchExecutionFailed');
            }
            let content = await this.renderWithTemplateContent(
                {
                    template: config.render.page,
                    layout: config.render.layout,
                    content: await this.searchRenderer.renderSearchResults(searchResults, config, domain, req)
                },
                Object.assign({}, {
                    search_query: sc.get(req.query, 'search', ''),
                    searchConfig: config,
                    query: req.query
                }),
                domain,
                req,
                null
            );
            if(this.cacheManager && this.cacheManager.isEnabled()){
                await this.cacheManager.set(domain, cacheKey, content);
            }
            return res.send(content);
        } catch (error) {
            Logger.error('Search request handling error: ' + error.message);
            return res.redirect('/?error-message=searchError');
        }
    }

    normalizePathForRouteSearch(path)
    {
        if(!path || '/' === path){
            return '/';
        }
        return path.endsWith('/') ? path.slice(0, -1) : path;
    }

    async handleRouteRedirect(route, res)
    {
        let redirectUrl = sc.get(route, 'redirect_url', null);
        if(!redirectUrl){
            return false;
        }
        let redirectType = sc.get(route, 'redirect_type', '301');
        let statusCode = '301' === redirectType ? 301 : 302;
        return res.redirect(statusCode, redirectUrl);
    }

    async handleRequest(req, res)
    {
        try {
            let originalPath = req.path;
            let domain = this.getDomainFromRequest(req);
            if(this.cacheManager && this.cacheManager.isEnabled()){
                let cachedContent = await this.cacheManager.get(domain, originalPath);
                if(cachedContent){
                    return res.send(cachedContent);
                }
            }
            let route = await this.findRouteByPath(originalPath, domain);
            if(route){
                let redirectResult = await this.handleRouteRedirect(route, res);
                if(redirectResult){
                    return redirectResult;
                }
                let normalizedPath = this.normalizePathForRouteSearch(originalPath);
                let routeFoundWithSlash = originalPath !== normalizedPath && route.path === normalizedPath + '/';
                if(!originalPath.endsWith('/') && routeFoundWithSlash){
                    return res.redirect(301, originalPath + '/');
                }
                return await this.renderRouteWithCache(route, domain, res, originalPath, req);
            }
            if(!originalPath.endsWith('/') && '/' !== originalPath){
                let routeWithSlash = await this.findRouteByPath(originalPath + '/', domain);
                if(routeWithSlash){
                    let redirectResult = await this.handleRouteRedirect(routeWithSlash, res);
                    if(redirectResult){
                        return redirectResult;
                    }
                    return res.redirect(301, originalPath + '/');
                }
            }
            let entityResult = await this.findEntityByPath(originalPath);
            if(entityResult){
                return await this.renderEntityWithCache(entityResult, domain, res, originalPath, req);
            }
            let templatePath = this.findTemplateByPath(originalPath, domain);
            if(templatePath){
                return await this.renderTemplateWithCache(templatePath, domain, res, originalPath, req);
            }
            return await this.renderNotFound(domain, res, req);
        } catch (error) {
            Logger.error('Request handling error: '+error.message);
            return res.status(500).send('Internal server error');
        }
    }

    async findRouteByPath(path, domain)
    {
        let routesEntity = this.dataServer.getEntity('routes');
        if(!routesEntity){
            Logger.error('Routes entity not found in dataServer.');
            return false;
        }
        let normalizedPath = this.normalizePathForRouteSearch(path);
        let domainFilter = domain || null;
        let routeFilters = {path: normalizedPath, enabled: 1};
        let routes = await routesEntity.load(routeFilters);
        let matchingRoute = false;
        let nullDomain = false;
        for(let route of routes){
            if(route.domain === domainFilter){
                matchingRoute = route;
                break;
            }
            if(!route.domain){
                nullDomain = route;
            }
        }
        if(matchingRoute){
            return matchingRoute;
        }
        if(nullDomain){
            return nullDomain;
        }
        if(normalizedPath !== path){
            let routeFiltersWithSlash = {path: path, enabled: 1};
            let routesWithSlash = await routesEntity.load(routeFiltersWithSlash);
            for(let route of routesWithSlash){
                if(route.domain === domainFilter){
                    return route;
                }
                if(!route.domain){
                    nullDomain = route;
                }
            }
            if(nullDomain){
                return nullDomain;
            }
        }
        return false;
    }

    async isEntityAccessible(entityName)
    {
        if(this.entityAccessCache.has(entityName)){
            return this.entityAccessCache.get(entityName);
        }
        return false;
    }

    async findEntityByPath(path)
    {
        let pathSegments = path.split('/').filter(segment => '' !== segment);
        if(2 > pathSegments.length){
            return false;
        }
        let entityName = pathSegments[0];
        if(!await this.isEntityAccessible(entityName)){
            return false;
        }
        let entityId = pathSegments[1];
        let entity = this.dataServer.getEntity(entityName);
        if(!entity){
            return false;
        }
        let loadedEntity = await entity.loadById(entityId);
        if(!loadedEntity){
            return false;
        }
        return {entity: loadedEntity, entityName};
    }

    findTemplateByPath(path, domain)
    {
        if('/' === path){
            path = '/index';
        }
        let templatePath = path.endsWith('/') ? path.slice(0, -1) : path;
        templatePath = templatePath.startsWith('/') ? templatePath.substring(1) : templatePath;
        if('page' === templatePath){
            return false;
        }
        return this.findTemplatePath(templatePath, domain);
    }

    async renderRouteWithCache(route, domain, res, path, req)
    {
        let renderedContent = await this.generateRouteContent(route, domain, req);
        if(!renderedContent){
            return await this.renderNotFound(domain, res, req);
        }
        if(this.cacheManager && this.cacheManager.isEnabled()){
            let cacheKey = this.buildCacheKey(path, req);
            await this.cacheManager.set(domain, cacheKey, renderedContent);
        }
        return res.send(renderedContent);
    }

    async renderEntityWithCache(entityResult, domain, res, path, req)
    {
        let renderedContent = await this.generateEntityContent(entityResult, domain, req);
        if(!renderedContent){
            return await this.renderNotFound(domain, res, req);
        }
        if(this.cacheManager && this.cacheManager.isEnabled()){
            let cacheKey = this.buildCacheKey(path, req);
            await this.cacheManager.set(domain, cacheKey, renderedContent);
        }
        return res.send(renderedContent);
    }

    async renderTemplateWithCache(templatePath, domain, res, path, req)
    {
        let renderedContent = await this.generateTemplateContent(templatePath, domain, req);
        if(!renderedContent){
            return res.status(500).send('Template error: '+templatePath);
        }
        if(this.cacheManager && this.cacheManager.isEnabled()){
            let cacheKey = this.buildCacheKey(path, req);
            await this.cacheManager.set(domain, cacheKey, renderedContent);
        }
        return await this.renderWithLayout({content: renderedContent}, {}, 'default', domain, res, req);
    }

    async generateRouteContent(route, domain, req)
    {
        if(!route.router){
            return false;
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            return false;
        }
        let content = await entity.loadOne({route_id: route.id});
        if(!content){
            return false;
        }
        return await this.renderWithTemplateContent(content, Object.assign({}, route, content), domain, req, route);
    }

    async generateEntityContent(entityResult, domain, req)
    {
        return await this.renderWithTemplateContent(entityResult.entity, entityResult.entity, domain, req, null);
    }

    async generateTemplateContent(templatePath, domain, req)
    {
        let template = FileHandler.readFile(templatePath);
        if(!template){
            Logger.error('Failed to read template: ' + templatePath);
            return false;
        }
        return await this.templateEngine.render(
            template,
            {},
            this.getPartialsForDomain(domain),
            domain,
            req,
            null,
            null
        );
    }

    async renderRoute(route, domain, res, req)
    {
        if(!route.router){
            return await this.renderNotFound(domain, res, req);
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            return await this.renderNotFound(domain, res, req);
        }
        let content = await entity.loadOne({route_id: route.id});
        if(!content){
            return await this.renderNotFound(domain, res, req);
        }
        return await this.renderWithTemplate(content, Object.assign({}, route, content), domain, res, req);
    }

    async renderWithTemplate(content, data, domain, res, req)
    {
        return res.send(await this.renderWithTemplateContent(content, data, domain, req, null));
    }

    async renderWithTemplateContent(content, data, domain, req, route)
    {
        let templateName = sc.get(content, 'template', 'page');
        if(!templateName){
            templateName = 'page';
        }
        let layoutName = sc.get(content, 'layout', '');
        if(!layoutName){
            layoutName = 'default';
        }
        let currentEntityData = Object.assign({}, content, data);
        let layoutContent = await this.processContentWithLayout(
            content,
            data,
            layoutName,
            domain,
            req,
            route,
            currentEntityData
        );
        let templatePath = this.findTemplatePath(templateName, domain);
        if(!templatePath){
            return layoutContent;
        }
        let pageTemplate = FileHandler.readFile(templatePath);
        if(!pageTemplate){
            return layoutContent;
        }
        return await this.templateEngine.render(
            pageTemplate,
            Object.assign(
                {},
                this.fetchMetaFields(data),
                {
                    content: layoutContent,
                    siteHandle: this.resolveDomainToSiteKey(domain)
                }
            ),
            this.getPartialsForDomain(domain),
            domain,
            req,
            route,
            currentEntityData
        );
    }

    async renderContentWithTemplate(templatePath, data, domain, req)
    {
        let template = FileHandler.readFile(templatePath);
        if(!template){
            Logger.error('Failed to read template: ' + templatePath);
            return false;
        }
        return await this.templateEngine.render(
            template,
            data,
            this.getPartialsForDomain(domain),
            domain,
            req,
            null,
            null
        );
    }

    async renderWithLayout(content, data, layoutName, domain, res, req)
    {
        return res.send(await this.renderWithTemplateContent(content, data, domain, req, null));
    }

    async processContentWithLayout(content, data, layoutName, domain, req, route, currentEntityData)
    {
        let processedContent = await this.processContent(content, data, domain, req, route, currentEntityData);
        let layoutPath = this.findLayoutPath(layoutName, domain);
        if(!layoutPath){
            return processedContent;
        }
        let layoutTemplate = FileHandler.readFile(layoutPath);
        if(!layoutTemplate){
            return processedContent;
        }
        return await this.templateEngine.render(
            layoutTemplate,
            Object.assign({}, data, {content: processedContent}),
            this.getPartialsForDomain(domain),
            domain,
            req,
            route,
            currentEntityData
        );
    }

    async processContent(content, data, domain, req, route, currentEntityData)
    {
        let contentText = sc.get(content, 'content', '');
        if(!contentText){
            return '';
        }
        return await this.templateEngine.render(
            contentText,
            data,
            this.getPartialsForDomain(domain),
            domain,
            req,
            route,
            currentEntityData
        );
    }

    async renderNotFound(domain, res, req)
    {
        let notFoundPath = this.findTemplatePath('404', domain);
        if(notFoundPath){
            let content = await this.renderContentWithTemplate(notFoundPath, {}, domain, req);
            if(content){
                res.status(404);
                return await this.renderWithLayout({content}, {}, 'default', domain, res, req);
            }
        }
        return res.status(404).send('Page not found');
    }

    buildCacheKey(path, req)
    {
        if(!req || !req.query){
            return path;
        }
        for(let key of Object.keys(req.query)){
            if(key.endsWith('-key')){
                let queryString = '';
                for(let qKey of Object.keys(req.query)){
                    queryString += (queryString ? '&' : '') + qKey + '=' + req.query[qKey];
                }
                let hash = 0;
                for(let i = 0; i < queryString.length; i++){
                    let char = queryString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return path + '_' + Math.abs(hash);
            }
        }
        return path;
    }

}

module.exports.Frontend = Frontend;
