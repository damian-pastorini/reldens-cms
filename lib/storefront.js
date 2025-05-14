/**
 *
 * Reldens - CMS - Storefront
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const mustache = require('mustache');

class Storefront
{

    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.templatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        this.publicPath = FileHandler.joinPaths(this.projectRoot, 'public');
        this.encoding = sc.get(props, 'encoding', 'utf8');
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
        this.setupStaticAssets();
        this.app.get('*', async (req, res) => {
            return await this.handleRequest(req, res);
        });
        return true;
    }

    setupStaticAssets()
    {
        if(!this.app || !this.publicPath){
            return false;
        }
        this.app.use(this.app._router.constructor.static(this.publicPath));
        return true;
    }

    async handleRequest(req, res)
    {
        let path = req.path;
        if('/favicon.ico' === path){
            return res.status(404).send('');
        }
        try {
            let route = await this.findRouteByPath(path);
            if(route){
                return await this.renderContentFromRoute(res, route);
            }
            let pathSegments = path.split('/').filter(segment => segment !== '');
            if(0 < pathSegments.length){
                let entityResult = await this.findEntityByPath(pathSegments);
                if(entityResult){
                    return await this.renderContentFromEntity(
                        res,
                        entityResult.entity,
                        entityResult.entityName
                    );
                }
            }
            let templatePath = this.findTemplateByPath(path);
            if(templatePath){
                return await this.renderTemplateOnly(res, templatePath);
            }
            return await this.renderNotFoundPage(res);
        } catch (error) {
            Logger.error('Request handling error: '+error.message);
            return res.status(500).send('Internal server error');
        }
    }

    async findRouteByPath(path)
    {
        if('/' === path){
            path = '/home';
        }
        let routesEntity = this.dataServer.getEntity('routes');
        if(!routesEntity){
            return false;
        }
        return await routesEntity.loadOneBy('path', path);
    }

    async findEntityByPath(pathSegments)
    {
        if(1 > pathSegments.length){
            return false;
        }
        let entityName = pathSegments[0];
        let entityId = 2 > pathSegments.length ? false : pathSegments[1];
        if(!entityId){
            return false;
        }
        let entity = this.dataServer.getEntity(entityName);
        if(!entity){
            return false;
        }
        let loadedEntity = await entity.loadById(entityId);
        if(!loadedEntity){
            return false;
        }
        return {
            entity: loadedEntity,
            entityName
        };
    }

    findTemplateByPath(path)
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
        let fullPath = FileHandler.joinPaths(this.templatesPath, templatePath + '.html');
        if(FileHandler.exists(fullPath)){
            return fullPath;
        }
        return false;
    }

    async renderContentFromRoute(res, route)
    {
        if(!route.router || !route.content_id){
            return await this.renderNotFoundPage(res);
        }
        let entity = this.dataServer.getEntity(route.router);
        if(!entity){
            return await this.renderNotFoundPage(res);
        }
        let content = await entity.loadById(route.content_id);
        if(!content){
            return await this.renderNotFoundPage(res);
        }
        let templateName = content.template || route.router;
        let templatePath = FileHandler.joinPaths(this.templatesPath, templateName + '.html');
        if(!FileHandler.exists(templatePath)){
            templatePath = FileHandler.joinPaths(this.templatesPath, 'page.html');
            if(!FileHandler.exists(templatePath)){
                return await this.renderNotFoundPage(res);
            }
        }
        let template = FileHandler.readFile(templatePath, {
            encoding: this.encoding
        }).toString();
        let data = {
            ...route,
            ...content,
            current_year: new Date().getFullYear()
        };
        let rendered = mustache.render(template, data);
        return res.send(rendered);
    }

    async renderContentFromEntity(res, entity, entityName)
    {
        let templatePath = FileHandler.joinPaths(this.templatesPath, entityName + '.html');
        if(!FileHandler.exists(templatePath)){
            templatePath = FileHandler.joinPaths(this.templatesPath, 'page.html');
            if(!FileHandler.exists(templatePath)){
                return await this.renderNotFoundPage(res);
            }
        }
        let template = FileHandler.readFile(templatePath, {
            encoding: this.encoding
        }).toString();
        let data = {
            ...entity,
            title: entity.title || entity.name || entityName,
            current_year: new Date().getFullYear()
        };
        let rendered = mustache.render(template, data);
        return res.send(rendered);
    }

    async renderTemplateOnly(res, templatePath)
    {
        let template = FileHandler.readFile(templatePath, {
            encoding: this.encoding
        }).toString();
        let data = {
            title: 'Page Title',
            current_year: new Date().getFullYear()
        };
        let rendered = mustache.render(template, data);
        return res.send(rendered);
    }

    async renderNotFoundPage(res)
    {
        let templatePath = FileHandler.joinPaths(this.templatesPath, '404.html');
        if(!FileHandler.exists(templatePath)){
            return res.status(404).send('Page not found');
        }
        let template = FileHandler.readFile(templatePath, {
            encoding: this.encoding
        }).toString();
        let data = {
            title: '404 - Page Not Found',
            current_year: new Date().getFullYear()
        };
        let rendered = mustache.render(template, data);
        return res.status(404).send(rendered);
    }

}

module.exports.Storefront = Storefront;
