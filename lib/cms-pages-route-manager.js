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
            return;
        }
        let routesRepository = this.dataServer.getEntity('routes');
        if(!routesRepository){
            Logger.error('Routes repository not found.');
            return false;
        }
        let existingRoute = await routesRepository.loadOne({
            router: 'cmsPages',
            cms_page_id: Number(event.renderedViewProperties.id)
        });
        event.renderedViewProperties.routePath = sc.get(existingRoute, 'path', '');
        event.renderedViewProperties.routeDomain = sc.get(existingRoute, 'domain', '');
        return true;
    }

    async populateEditFields(event)
    {
        if('cms_pages' !== event.driverResource.id()){
            return;
        }
        let routesRepository = this.dataServer.getEntity('routes');
        if(!routesRepository){
            Logger.error('Routes repository not found.');
            return false;
        }
        let existingRoute = await routesRepository.loadOne({
            router: 'cmsPages',
            cms_page_id: Number(event.renderedEditProperties.idValue)
        });
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
        let cmsPageId = Number(entityData.id);
        let existingRoute = await routesRepository.loadOne({router: 'cmsPages', cms_page_id: cmsPageId});
        let patchData = {
            path: sc.get(req.body, 'routePath', this.generateDefaultRoutePath(entityData)),
            router: sc.get(req.body, 'routeRouter', 'cmsPages'),
            cms_page_id: cmsPageId,
            cache_ttl_seconds: Number(sc.get(req.body, 'routeCacheTtl', 3600)),
            enabled: Number(sc.get(req.body, 'routeEnabled', 1)),
            domain: sc.get(req.body, 'routeDomain', null)
        };
        let result = existingRoute
            ? await routesRepository.updateById(existingRoute.id, patchData)
            : await routesRepository.create(patchData);
        if (!result){
            Logger.error('Route could not be saved.', patchData, existingRoute);
        }
        return result;
    }

    generateDefaultRoutePath(pageData)
    {
        return '/' + sc.get(pageData, 'title', 'page').toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

}

module.exports.CmsPagesRouteManager = CmsPagesRouteManager;
