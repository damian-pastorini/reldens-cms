/**
 *
 * Reldens - CMS - Frontend
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { TemplateEngine } = require('./template-engine');

class Frontend
{

    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.appServerFactory = sc.get(props, 'appServerFactory', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.renderEngine = sc.get(props, 'renderEngine', false);
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
        this.templateEngine = false;
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
            getPartials: this.getPartialsForDomain.bind(this)
        });
        await this.loadPartials();
        await this.setupDomainTemplates();
        await this.loadEntityAccessRules();
        this.setupStaticAssets();
        this.app.get('*', async (req, res) => {
            return await this.handleRequest(req, res);
        });
        return true;
    }

    async loadEntityAccessRules()
    {
        let accessEntity = this.dataServer.getEntity('cmsEntityAccess');
        if(!accessEntity){
            Logger.warning('CMS Entity Access not found.');
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

    async handleRequest(req, res)
    {
        try {
            let path = req.path;
            let domain = this.getDomainFromRequest(req);
            this.templateEngine.setCurrentDomain(domain);
            let route = await this.findRouteByPath(path);
            if(route){
                return await this.renderRoute(route, domain, res);
            }
            let entityResult = await this.findEntityByPath(path);
            if(entityResult){
                return await this.renderEntity(entityResult, domain, res);
            }
            let templatePath = this.findTemplateByPath(path, domain);
            if(templatePath){
                return await this.renderTemplate(templatePath, domain, res);
            }
            return await this.renderNotFound(domain, res);
        } catch (error) {
            Logger.error('Request handling error: '+error.message);
            return res.status(500).send('Internal server error');
        }
    }

    async findRouteByPath(path)
    {
        let routesEntity = this.dataServer.getEntity('routes');
        if(!routesEntity){
            Logger.error('Routes entity not found in dataServer');
            return false;
        }
        let route = await routesEntity.loadOneBy('path', path);
        if(route){
            return route;
        }
        if('/' === path){
            return await routesEntity.loadOneBy('path', '/home');
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

    async renderRoute(route, domain, res)
    {
        if(!route.router || !route.content_id){
            return await this.renderNotFound(domain, res);
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            return await this.renderNotFound(domain, res);
        }
        let content = await entity.loadById(route.content_id);
        if(!content){
            return await this.renderNotFound(domain, res);
        }
        return await this.renderWithLayout(
            content,
            Object.assign({}, route, content),
            sc.get(content, 'layout', 'default'),
            domain,
            res
        );
    }

    async renderEntity(entityResult, domain, res)
    {
        return await this.renderWithLayout(
            entityResult.entity,
            Object.assign({}, entityResult.entity),
            sc.get(entityResult.entity, 'layout', 'default'),
            domain,
            res
        );
    }

    async renderTemplate(templatePath, domain, res)
    {
        let content = await this.renderContentWithTemplate(templatePath, {}, domain);
        if(!content){
            return res.status(500).send('Template error: '+templatePath);
        }
        return await this.renderWithLayout({content}, {}, 'default', domain, res);
    }

    async renderContentWithTemplate(templatePath, data, domain)
    {
        let template = FileHandler.readFile(templatePath);
        if(!template){
            Logger.error('Failed to read template: ' + templatePath);
            return false;
        }
        return await this.templateEngine.render(template, data, this.getPartialsForDomain(domain));
    }

    async renderWithLayout(content, data, layoutName, domain, res)
    {
        let layoutPath = this.findLayoutPath(layoutName, domain);
        let layoutContent = '';
        if(layoutPath){
            let layoutTemplate = FileHandler.readFile(layoutPath);
            if(layoutTemplate){
                let processedContent = sc.get(content, 'content', '');
                if(processedContent){
                    processedContent = await this.templateEngine.render(
                        processedContent,
                        data,
                        this.getPartialsForDomain(domain)
                    );
                }
                layoutContent = await this.templateEngine.render(
                    layoutTemplate,
                    Object.assign({}, data, {
                        content: processedContent
                    }),
                    this.getPartialsForDomain(domain)
                );
            }
        }
        if('' === layoutContent){
            let processedContent = sc.get(content, 'content', '');
            if(processedContent){
                layoutContent = await this.templateEngine.render(
                    processedContent,
                    data,
                    this.getPartialsForDomain(domain)
                );
            }
        }
        let pagePath = this.findTemplatePath('page', domain);
        if(!pagePath){
            return res.send(layoutContent);
        }
        let pageTemplate = FileHandler.readFile(pagePath);
        if(!pageTemplate){
            return res.send(layoutContent);
        }
        return res.send(
            await this.templateEngine.render(
                pageTemplate,
                Object.assign({}, data, {
                    content: layoutContent,
                    siteHandle: this.resolveDomainToSiteKey(domain)
                }),
                this.getPartialsForDomain(domain)
            )
        );
    }

    async renderNotFound(domain, res)
    {
        let templatePath = this.findTemplatePath('404', domain);
        if(!templatePath){
            return res.status(404).send('Page not found');
        }
        let data = {title: '404 - Page Not Found'};
        let content = await this.renderContentWithTemplate(templatePath, data, domain);
        if(!content){
            return res.status(404).send('Page not found');
        }
        res.status(404);
        return await this.renderWithLayout({content}, data, 'default', domain, res);
    }

}

module.exports.Frontend = Frontend;
