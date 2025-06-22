/**
 *
 * Reldens - CMS Pages Route Manager
 *
 */

const { Logger, sc } = require('@reldens/utils');

class CmsPagesRouteManager
{

    constructor(props)
    {
        this.dataServer = props.dataServer;
        this.events = props.events;
        this.setupEventListeners();
    }

    setupEventListeners()
    {
        this.events.on('reldens.adminViewPropertiesPopulation', this.populateViewFields.bind(this));
        this.events.on('reldens.adminEditPropertiesPopulation', this.populateEditFields.bind(this));
        this.events.on('reldens.adminAfterEntitySave', this.handleAfterEntitySave.bind(this));
    }

    async populateViewFields(event)
    {
        if('cms_pages' !== event.driverResource.id()){
            return false;
        }
        if(!event.loadedEntity || !event.loadedEntity.route_id){
            event.renderedViewProperties.routePath = '';
            event.renderedViewProperties.routeDomain = '';
            return true;
        }
        let routesRepository = this.dataServer.getEntity('routes');
        if(!routesRepository){
            Logger.error('Routes repository not found.');
            return false;
        }
        let existingRoute = await routesRepository.loadById(event.loadedEntity.route_id);
        event.renderedViewProperties.routePath = sc.get(existingRoute, 'path', '');
        event.renderedViewProperties.routeDomain = sc.get(existingRoute, 'domain', '');
        return true;
    }

    async populateEditFields(event)
    {
        if('cms_pages' !== event.driverResource.id()){
            return false;
        }
        if(!event.loadedEntity || !event.loadedEntity.route_id){
            event.renderedEditProperties.routePath = '';
            event.renderedEditProperties.routeDomain = '';
            return true;
        }
        let routesRepository = this.dataServer.getEntity('routes');
        if(!routesRepository){
            Logger.error('Routes repository not found.');
            return false;
        }
        let existingRoute = await routesRepository.loadById(event.loadedEntity.route_id);
        event.renderedEditProperties.routePath = sc.get(existingRoute, 'path', '');
        event.renderedEditProperties.routeDomain = sc.get(existingRoute, 'domain', '');
        return true;
    }

    async handleAfterEntitySave(event)
    {
        let {req, driverResource, entityData} = event;
        if('cms_pages' !== driverResource.id()){
            return;
        }
        let routesRepository = this.dataServer.getEntity('routes');
        if(!routesRepository){
            Logger.error('Routes repository not found.');
            return;
        }
        let path = sc.get(req.body, 'routePath', this.generateDefaultRoutePath(entityData));
        if(!path || '' === path.trim()){
            Logger.debug('No valid path available for CMS page route creation. Skipping route management.');
            return;
        }
        let cmsPageId = Number(entityData.id);
        let routePatchData = {
            path,
            router: sc.get(req.body, 'routeRouter', 'cmsPages'),
            cache_ttl_seconds: Number(sc.get(req.body, 'routeCacheTtl', 3600)),
            enabled: Number(sc.get(req.body, 'routeEnabled', 1)),
            domain: sc.get(req.body, 'routeDomain', null)
        };
        let routeResult = false;
        if(entityData.route_id){
            routeResult = await routesRepository.updateById(entityData.route_id, routePatchData);
        }
        if(!routeResult){
            routeResult = await routesRepository.create(routePatchData);
            if(routeResult){
                let pagesRepository = this.dataServer.getEntity('cmsPages');
                if(pagesRepository){
                    let pageResult = await pagesRepository.updateById(cmsPageId, {route_id: routeResult.id});
                    if(!pageResult){
                        Logger.error('Page could not be updated with route ID.', routeResult);
                    }
                }
            }
        }
        if(!routeResult){
            Logger.error('Route could not be saved.', routePatchData);
        }
        return routeResult;
    }

    generateDefaultRoutePath(pageData)
    {
        let title = sc.get(pageData, 'title', '');
        if(!title || '' === title.trim()){
            return '';
        }
        return '/' + title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

}

module.exports.CmsPagesRouteManager = CmsPagesRouteManager;
