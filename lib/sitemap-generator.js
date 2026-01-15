/**
 *
 * Reldens - CMS - SitemapGenerator
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class SitemapGenerator
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.defaultDomain = sc.get(props, 'defaultDomain', '');
        this.domainMapping = sc.get(props, 'domainMapping', {});
        this.domainPublicUrlMapping = sc.get(props, 'domainPublicUrlMapping', {});
        this.sitemapDir = FileHandler.joinPaths(this.projectRoot, 'public', 'sitemap');
    }

    async generate(specificDomain = null)
    {
        if(!this.dataServer){
            Logger.critical('DataServer is required for sitemap generation.');
            return false;
        }
        let routes = await this.loadEnabledRoutes();
        if(!routes){
            return false;
        }
        if(0 === routes.length){
            Logger.warning('No enabled routes found for sitemap generation.');
            return true;
        }
        let filteredRoutes = routes;
        if(specificDomain){
            filteredRoutes = routes.filter((route) => {
                let routeDomain = route.domain || this.defaultDomain;
                return routeDomain === specificDomain;
            });
            if(0 === filteredRoutes.length){
                Logger.warning('No routes found for domain: '+specificDomain);
                return true;
            }
        }
        let domainRoutes = this.groupRoutesByDomain(filteredRoutes);
        if(!await this.saveSitemaps(domainRoutes)){
            return false;
        }
        if(!specificDomain){
            if(!await this.saveSitemapIndex(domainRoutes)){
                return false;
            }
        }
        Logger.info('Sitemap generation completed successfully.');
        return true;
    }

    async loadEnabledRoutes()
    {
        let routesEntity = this.dataServer.getEntity('routes');
        if(!routesEntity){
            Logger.critical('Routes entity not found in dataServer.');
            return false;
        }
        try {
            let routes = await routesEntity.load({enabled: 1});
            Logger.debug('Loaded '+routes.length+' enabled routes.');
            return routes;
        } catch(error) {
            Logger.critical('Failed to load routes: '+error.message);
            return false;
        }
    }

    groupRoutesByDomain(routes)
    {
        let domainRoutes = {};
        for(let route of routes){
            let domain = route.domain || this.defaultDomain || 'default';
            if(!sc.hasOwn(domainRoutes, domain)){
                domainRoutes[domain] = [];
            }
            domainRoutes[domain].push(route);
        }
        return domainRoutes;
    }

    buildSitemapXml(routes, domain)
    {
        let urlEntries = [];
        for(let route of routes){
            let urlEntry = '  <url>\n';
            urlEntry += '    <loc>'+sc.sanitize(this.buildUrl(domain, route.path))+'</loc>\n';
            if(route.updated_at){
                urlEntry += '    <lastmod>'+sc.formatDate(new Date(route.updated_at), 'Y-m-d')+'</lastmod>\n';
            }
            urlEntry += '  </url>';
            urlEntries.push(urlEntry);
        }
        return this.getSitemapTemplate().replace('{{URLS}}', urlEntries.join('\n'));
    }

    buildSitemapIndexXml(domainRoutes)
    {
        let sitemapEntries = [];
        for(let domain in domainRoutes){
            let sitemapEntry = '  <sitemap>\n';
            sitemapEntry += '    <loc>'+sc.sanitize(this.buildUrl(domain, '/sitemap/'+domain+'/sitemap.xml'))+'</loc>\n';
            sitemapEntry += '  </sitemap>';
            sitemapEntries.push(sitemapEntry);
        }
        return this.getSitemapIndexTemplate().replace('{{SITEMAPS}}', sitemapEntries.join('\n'));
    }

    getSitemapTemplate()
    {
        return '<?xml version="1.0" encoding="UTF-8"?>\n'
            +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            +'{{URLS}}\n'
            +'</urlset>\n';
    }

    getSitemapIndexTemplate()
    {
        return '<?xml version="1.0" encoding="UTF-8"?>\n'
            +'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            +'{{SITEMAPS}}\n'
            +'</sitemapindex>\n';
    }

    async saveSitemaps(domainRoutes)
    {
        for(let domain in domainRoutes){
            let domainDir = FileHandler.joinPaths(this.sitemapDir, domain);
            if(!FileHandler.createFolder(domainDir)){
                Logger.critical('Failed to create sitemap directory: '+domainDir);
                return false;
            }
            let sitemapPath = FileHandler.joinPaths(domainDir, 'sitemap.xml');
            if(!FileHandler.writeFile(sitemapPath, this.buildSitemapXml(domainRoutes[domain], domain))){
                Logger.critical('Failed to write sitemap: '+sitemapPath);
                return false;
            }
            Logger.info('Sitemap saved: '+sitemapPath);
        }
        return true;
    }

    async saveSitemapIndex(domainRoutes)
    {
        if(!FileHandler.createFolder(this.sitemapDir)){
            Logger.critical('Failed to create sitemap directory: '+this.sitemapDir);
            return false;
        }
        let indexPath = FileHandler.joinPaths(this.projectRoot, 'public', 'sitemap.xml');
        if(!FileHandler.writeFile(indexPath, this.buildSitemapIndexXml(domainRoutes))){
            Logger.critical('Failed to write sitemap index: '+indexPath);
            return false;
        }
        Logger.info('Sitemap index saved: '+indexPath);
        return true;
    }

    buildUrl(domain, path)
    {
        let publicUrl = sc.get(this.domainPublicUrlMapping, domain, 'http://'+domain);
        if(publicUrl.endsWith('/')){
            publicUrl = publicUrl.slice(0, -1);
        }
        if(!path.startsWith('/')){
            path = '/'+path;
        }
        return publicUrl+path;
    }

}

module.exports.SitemapGenerator = SitemapGenerator;
