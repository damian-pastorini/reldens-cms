/**
 *
 * Reldens - CMS - Frontend
 *
 */

const { TemplateEngine } = require('./template-engine');
const { Search } = require('./search');
const { SearchRenderer } = require('./search-renderer');
const { SearchRequestHandler } = require('./search-request-handler');
const { DynamicForm } = require('./dynamic-form');
const { DynamicFormRenderer } = require('./dynamic-form-renderer');
const { DynamicFormRequestHandler } = require('./dynamic-form-request-handler');
const { TemplateResolver } = require('./frontend/template-resolver');
const { TemplateCache } = require('./frontend/template-cache');
const { RequestProcessor } = require('./frontend/request-processor');
const { EntityAccessManager } = require('./frontend/entity-access-manager');
const { ContentRenderer } = require('./frontend/content-renderer');
const { ResponseManager } = require('./frontend/response-manager');
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
        this.domainPublicUrlMapping = sc.get(props, 'domainPublicUrlMapping', {});
        this.defaultPublicUrl = sc.get(props, 'defaultPublicUrl', '');
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.templateEngine = false;
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.handleFrontendTemplateReload = sc.get(props, 'handleFrontendTemplateReload', false);
        this.searchPath = sc.get(props, 'searchPath', '/search');
        this.dynamicFormPath = sc.get(props, 'dynamicFormPath', '/dynamic-form');
        this.dynamicFormDisplayPath = sc.get(props, 'dynamicFormDisplayPath', '/form');
        this.searchSets = sc.get(props, 'searchSets', false);
        this.searchConfig = {dataServer: this.dataServer};
        if(this.searchSets){
            this.searchConfig.searchSets = this.searchSets;
        }
        this.search = new Search(this.searchConfig);
        this.dynamicFormConfig = {
            dataServer: this.dataServer,
            allowedOrigins: sc.get(props, 'allowedOrigins', []),
            honeypotFieldName: sc.get(props, 'honeypotFieldName', 'website_url'),
            rateLimitWindow: sc.get(props, 'rateLimitWindow', 300000),
            rateLimitMax: sc.get(props, 'rateLimitMax', 5),
            events: this.events
        };
        this.dynamicForm = new DynamicForm(this.dynamicFormConfig);
        this.metaDefaults = sc.get(props, 'metaDefaults', {
            locale: 'en',
            viewport: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover',
            meta_robots: 'index,follow',
            meta_theme_color: '#000000',
            meta_twitter_card_type: 'summary'
        });
        this.templateResolver = new TemplateResolver(this);
        this.templateCache = new TemplateCache(this);
        this.requestProcessor = new RequestProcessor(this);
        this.entityAccessManager = new EntityAccessManager(this);
        this.contentRenderer = new ContentRenderer(this);
        this.responseManager = new ResponseManager(this);
        this.searchRenderer = new SearchRenderer({
            renderEngine: this.renderEngine,
            getPartials: this.templateCache.getPartialsForDomain.bind(this.templateCache)
        });
        this.dynamicFormRenderer = new DynamicFormRenderer({
            renderEngine: this.renderEngine,
            getPartials: this.templateCache.getPartialsForDomain.bind(this.templateCache),
            projectRoot: this.projectRoot,
            defaultDomain: this.defaultDomain,
            events: this.events
        });
        this.searchRequestHandler = new SearchRequestHandler(this);
        this.dynamicFormRequestHandler = new DynamicFormRequestHandler({
            dynamicForm: this.dynamicForm,
            contentRenderer: this.contentRenderer,
            requestProcessor: this.requestProcessor,
            cacheManager: this.cacheManager,
            enableJsonResponse: sc.get(props, 'enableJsonResponse', false),
            events: this.events
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
        this.templateResolver.domainTemplatesMap = this.templateCache.getDomainTemplatesMap();
        this.templateEngine = new TemplateEngine({
            renderEngine: this.renderEngine,
            dataServer: this.dataServer,
            getPartials: this.templateCache.getPartialsForDomain.bind(this.templateCache),
            entitiesConfig: this.entitiesConfig,
            events: this.events,
            defaultDomain: this.defaultDomain,
            projectRoot: this.projectRoot,
            publicPath: this.publicPath,
            domainPublicUrlMapping: this.domainPublicUrlMapping,
            defaultPublicUrl: this.defaultPublicUrl,
            dynamicForm: this.dynamicForm,
            dynamicFormRenderer: this.dynamicFormRenderer
        });
        this.contentRenderer.templateEngine = this.templateEngine;
        this.searchConfig.jsonFieldsParser = this.templateEngine.jsonFieldsParser;
        await this.templateCache.loadPartials();
        await this.templateCache.setupDomainTemplates();
        await this.entityAccessManager.loadEntityAccessRules();
        this.setupStaticAssets();
        this.app.get(this.searchPath, async (req, res) => {
            return await this.searchRequestHandler.handleSearchRequest(req, res);
        });
        this.app.post(this.dynamicFormPath, async (req, res) => {
            return await this.dynamicFormRequestHandler.handleFormSubmission(req, res);
        });
        this.app.get('*', async (req, res) => {
            return await this.handleRequest(req, res);
        });
        return true;
    }

    async handleRequest(req, res)
    {
        try {
            if(this.handleFrontendTemplateReload){
                await this.handleFrontendTemplateReload(this.templateCache, this.templateResolver);
            }
            let originalPath = req.path;
            let domain = this.requestProcessor.getDomainFromRequest(req);
            if(this.cacheManager && this.cacheManager.isEnabled()){
                let cachedContent = await this.cacheManager.get(domain, originalPath);
                if(cachedContent){
                    return res.send(cachedContent);
                }
            }
            let route = await this.requestProcessor.findRouteByPath(originalPath, domain);
            if(route){
                let redirectResult = await this.requestProcessor.handleRouteRedirect(route, res);
                if(redirectResult){
                    return redirectResult;
                }
                let normalizedPath = this.requestProcessor.normalizePathForRouteSearch(originalPath);
                let routeFoundWithSlash = originalPath !== normalizedPath && route.path === normalizedPath + '/';
                if(!originalPath.endsWith('/') && routeFoundWithSlash){
                    return res.redirect(301, originalPath + '/');
                }
                return await this.responseManager.renderWithCacheHandler(
                    async () => await this.contentRenderer.generateRouteContent(route, domain, req),
                    async () => await this.responseManager.renderNotFound(domain, res, req),
                    async (content) => res.send(content),
                    domain,
                    res,
                    originalPath,
                    req
                );
            }
            if(!originalPath.endsWith('/') && '/' !== originalPath){
                let routeWithSlash = await this.requestProcessor.findRouteByPath(originalPath + '/', domain);
                if(routeWithSlash){
                    let redirectResult = await this.requestProcessor.handleRouteRedirect(routeWithSlash, res);
                    if(redirectResult){
                        return redirectResult;
                    }
                    return res.redirect(301, originalPath + '/');
                }
            }
            let entityResult = await this.entityAccessManager.findEntityByPath(originalPath);
            if(entityResult){
                return await this.responseManager.renderWithCacheHandler(
                    async () => await this.contentRenderer.renderWithTemplateContent(
                        entityResult.entity,
                        {},
                        domain,
                        req,
                        null
                    ),
                    async () => await this.responseManager.renderNotFound(domain, res, req),
                    async (content) => res.send(content),
                    domain,
                    res,
                    originalPath,
                    req
                );
            }
            let templatePath = this.templateResolver.findTemplateByPath(originalPath, domain);
            if(templatePath){
                return await this.responseManager.renderWithCacheHandler(
                    async () => await this.contentRenderer.generateTemplateContent(templatePath, domain, req),
                    async () => res.status(500).send('Template error: '+templatePath),
                    async (content) => res.send(
                        await this.contentRenderer.renderWithTemplateContent({content}, {}, domain, req, null)
                    ),
                    domain,
                    res,
                    originalPath,
                    req
                );
            }
            return await this.responseManager.renderNotFound(domain, res, req);
        } catch (error) {
            Logger.error('Request handling error: '+error.message);
            return res.status(500).send('Internal server error');
        }
    }

    async renderRoute(route, domain, res, req)
    {
        if(!route.router){
            return await this.responseManager.renderNotFound(domain, res, req);
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            return await this.responseManager.renderNotFound(domain, res, req);
        }
        let content = await entity.loadOne({route_id: route.id});
        if(!content){
            return await this.responseManager.renderNotFound(domain, res, req);
        }
        return res.send(await this.contentRenderer.renderWithTemplateContent(
            content,
            Object.assign({}, route, content),
            domain,
            req,
            null
        ));
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

}

module.exports.Frontend = Frontend;
