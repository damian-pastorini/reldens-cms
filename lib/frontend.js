/**
 *
 * Reldens - CMS - Frontend
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const mustache = require('mustache');

class Frontend
{

    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.appServerFactory = sc.get(props, 'appServerFactory', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.templatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        this.publicPath = FileHandler.joinPaths(this.projectRoot, 'public');
        this.partialsExtensions = sc.get(props, 'partialsExtensions', ['.html', '.mustache', '.template']);
        this.partialsCache = {};
        this.domainPartialsCache = new Map();
        this.domainTemplatesMap = new Map();
        this.error = false;
    }

    async initialize()
    {
        if(!this.app || !this.dataServer){
            this.error = 'Missing app or dataServer';
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
        await this.loadPartials();
        await this.setupDomainTemplates();
        this.setupStaticAssets();
        this.app.get('*', async (req, res) => {
            return await this.handleRequest(req, res);
        });
        return true;
    }

    async loadPartials()
    {
        let partialsPath = FileHandler.joinPaths(this.templatesPath, 'partials');
        FileHandler.createFolder(partialsPath);
        let partialFiles = FileHandler.getFilesInFolder(partialsPath, this.partialsExtensions);
        for(let file of partialFiles){
            let partialName = '';
            for(let extension of this.partialsExtensions){
                if(file.endsWith(extension)){
                    partialName = file.replace(extension, '');
                    break;
                }
            }
            let partialPath = FileHandler.joinPaths(partialsPath, file);
            let partialContent = FileHandler.readFile(partialPath);
            this.partialsCache[partialName] = partialContent.toString();
        }
    }

    async loadDomainPartials(domain, domainPath)
    {
        let domainPartialsPath = FileHandler.joinPaths(domainPath, 'partials');
        if(!FileHandler.exists(domainPartialsPath)){
            return;
        }
        let domainPartials = {};
        let partialFiles = FileHandler.getFilesInFolder(domainPartialsPath, this.partialsExtensions);
        for(let file of partialFiles){
            let partialName = '';
            for(let extension of this.partialsExtensions){
                if(file.endsWith(extension)){
                    partialName = file.replace(extension, '');
                    break;
                }
            }
            let partialPath = FileHandler.joinPaths(domainPartialsPath, file);
            let partialContent = FileHandler.readFile(partialPath);
            domainPartials[partialName] = partialContent.toString();
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

    getDomainFromRequest(req)
    {
        let host = req.get('host');
        if(!host){
            return false;
        }
        return host.split(':')[0];
    }

    getPartialsForDomain(domain)
    {
        let domainPartials = this.domainPartialsCache.get(domain);
        if(!domainPartials){
            return this.partialsCache;
        }
        return Object.assign({}, this.partialsCache, domainPartials);
    }

    findTemplatePathForDomain(templateName, domain)
    {
        if(!domain){
            return this.getDefaultTemplatePath(templateName);
        }
        let domainPath = this.domainTemplatesMap.get(domain);
        if(!domainPath){
            return this.getDefaultTemplatePath(templateName);
        }
        let domainTemplatePath = FileHandler.joinPaths(domainPath, templateName + '.html');
        if(!FileHandler.exists(domainTemplatePath)){
            return this.getDefaultTemplatePath(templateName);
        }
        return domainTemplatePath;
    }

    getDefaultTemplatePath(templateName)
    {
        return FileHandler.joinPaths(this.templatesPath, templateName + '.html');
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
        let path = req.path;
        if('/favicon.ico' === path){
            return res.status(404).send('');
        }
        try {
            let domain = this.getDomainFromRequest(req);
            let route = await this.findRouteByPath(path);
            if(route){
                Logger.debug('Found route for path: '+path, route);
                return await this.renderContentFromRoute(res, route, domain);
            }
            let pathSegments = path.split('/').filter(segment => segment !== '');
            if(0 < pathSegments.length){
                let entityResult = await this.findEntityByPath(pathSegments);
                if(entityResult){
                    Logger.debug('Found entity for path segments: '+pathSegments.join('/'));
                    return await this.renderContentFromEntity(
                        res,
                        entityResult.entity,
                        entityResult.entityName,
                        domain
                    );
                }
            }
            let templatePath = this.findTemplateByPath(path, domain);
            if(templatePath){
                Logger.debug('Found template for path: '+path+' at: '+templatePath);
                return await this.renderTemplateOnly(res, templatePath, domain);
            }
            Logger.debug('No template found for path: '+path+', rendering 404');
            return await this.renderNotFoundPage(res, domain);
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

    async findEntityByPath(pathSegments)
    {
        if(1 > pathSegments.length){
            Logger.debug('No path segments provided');
            return false;
        }
        let entityName = pathSegments[0];
        let entityId = 2 > pathSegments.length ? false : pathSegments[1];
        if(!entityId){
            Logger.debug('No entity ID in path segments');
            return false;
        }
        let entity = this.dataServer.getEntity(entityName);
        if(!entity){
            Logger.debug('Entity not found: '+entityName);
            return false;
        }
        let loadedEntity = await entity.loadById(entityId);
        if(!loadedEntity){
            Logger.debug('Entity not loaded by ID: '+entityId);
            return false;
        }
        return {
            entity: loadedEntity,
            entityName
        };
    }

    findTemplateByPath(path, domain)
    {
        if('/' === path){
            path = '/index';
        }
        let templatePath = path.endsWith('/')
            ? path.slice(0, -1)
            : path;
        templatePath = templatePath.startsWith('/')
            ? templatePath.substring(1)
            : templatePath;
        let fullPath = this.findTemplatePathForDomain(templatePath, domain);
        if(FileHandler.exists(fullPath)){
            return fullPath;
        }
        return false;
    }

    async renderContentFromRoute(res, route, domain)
    {
        if(!route.router || !route.content_id){
            Logger.debug('Route missing router or content_id');
            return await this.renderNotFoundPage(res, domain);
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            Logger.debug('Entity not found: '+route.router);
            return await this.renderNotFoundPage(res, domain);
        }
        let content = await entity.loadById(route.content_id);
        if(!content){
            Logger.debug('Content not found for ID: '+route.content_id+' in entity: '+route.router);
            return await this.renderNotFoundPage(res, domain);
        }
        let templateName = content.template || route.router;
        let templatePath = this.findTemplatePathForDomain(templateName, domain);
        if(!FileHandler.exists(templatePath)){
            templatePath = this.findTemplatePathForDomain('page', domain);
            if(!FileHandler.exists(templatePath)){
                Logger.debug('Neither template found: '+templateName+'.html nor page.html');
                return await this.renderNotFoundPage(res, domain);
            }
        }
        let template = FileHandler.readFile(templatePath).toString();
        let data = {
            ...route,
            ...content,
            current_year: new Date().getFullYear()
        };
        let partials = this.getPartialsForDomain(domain);
        let rendered = mustache.render(template, data, partials);
        return res.send(rendered);
    }

    async renderContentFromEntity(res, entity, entityName, domain)
    {
        let templatePath = this.findTemplatePathForDomain(entityName, domain);
        if(!FileHandler.exists(templatePath)){
            templatePath = this.findTemplatePathForDomain('page', domain);
            if(!FileHandler.exists(templatePath)){
                return await this.renderNotFoundPage(res, domain);
            }
        }
        let template = FileHandler.readFile(templatePath).toString();
        let data = {
            ...entity,
            title: entity.title || entity.name || entityName,
            current_year: new Date().getFullYear()
        };
        let partials = this.getPartialsForDomain(domain);
        let rendered = mustache.render(template, data, partials);
        return res.send(rendered);
    }

    async renderTemplateOnly(res, templatePath, domain)
    {
        let template = FileHandler.readFile(templatePath).toString();
        let data = {
            title: 'Page Title',
            current_year: new Date().getFullYear()
        };
        let partials = this.getPartialsForDomain(domain);
        let rendered = mustache.render(template, data, partials);
        return res.send(rendered);
    }

    async renderNotFoundPage(res, domain)
    {
        let templatePath = this.findTemplatePathForDomain('404', domain);
        if(!FileHandler.exists(templatePath)){
            return res.status(404).send('Page not found');
        }
        let template = FileHandler.readFile(templatePath).toString();
        let data = {
            title: '404 - Page Not Found',
            current_year: new Date().getFullYear()
        };
        let partials = this.getPartialsForDomain(domain);
        let rendered = mustache.render(template, data, partials);
        return res.status(404).send(rendered);
    }

}

module.exports.Frontend = Frontend;
