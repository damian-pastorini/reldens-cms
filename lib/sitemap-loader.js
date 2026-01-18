/**
 *
 * Reldens - CMS - SitemapLoader
 *
 */

const { Logger, sc } = require('@reldens/utils');

class SitemapLoader
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.routesRepository = this.dataServer?.getEntity('routes');
        this.events = sc.get(props, 'events', false);
        this.domainMapping = sc.get(props, 'domainMapping', {});
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not provided for SitemapLoader.');
            return;
        }
        this.events.on('reldens.afterVariablesCreated', this.loadSitemapData.bind(this));
    }

    async loadSitemapData(eventData)
    {
        if(!this.dataServer){
            Logger.error('DataServer not provided for SitemapLoader.');
            return;
        }
        if(!this.routesRepository){
            Logger.error('Routes repository not found for SitemapLoader.');
            return;
        }
        let req = eventData.renderContext.req;
        if(!req){
            return;
        }
        if(!req.path){
            return;
        }
        if('/sitemap.xml' !== req.path){
            return;
        }
        if(req.sitemapPages){
            eventData.variables.sitemapPages = req.sitemapPages;
            return;
        }
        let currentDomain = eventData.renderContext.domain;
        let mappedDomain = this.resolveMappedDomain(currentDomain);
        let filters = {
            enabled: 1,
            redirect_url: null,
            redirect_type: null,
            OR: [
                {domain: null},
                {domain: mappedDomain}
            ]
        };
        try {
            let routesWithPages = await this.routesRepository.loadWithRelations(filters, 'cms_pages');
            let sitemapPages = routesWithPages.filter(route => {
                if(!route.cms_pages || 0 === route.cms_pages.length){
                    return false;
                }
                let page = route.cms_pages[0];
                if('noindex,nofollow' === page.meta_robots){
                    return false;
                }
                return true;
            });
            req.sitemapPages = sitemapPages;
            eventData.variables.sitemapPages = sitemapPages;
        } catch (error) {
            Logger.error('Error loading sitemap data: '+error.message);
        }
    }

    resolveMappedDomain(currentDomain)
    {
        if(!this.domainMapping){
            return currentDomain;
        }
        if(!sc.isObject(this.domainMapping)){
            return currentDomain;
        }
        let mappedValue = sc.get(this.domainMapping, currentDomain, false);
        if(!mappedValue){
            return currentDomain;
        }
        return mappedValue;
    }

}

module.exports.SitemapLoader = SitemapLoader;
