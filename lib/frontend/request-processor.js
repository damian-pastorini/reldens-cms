/**
 *
 * Reldens - CMS - Frontend - RequestProcessor
 *
 */

const { Logger, sc } = require('@reldens/utils');

class RequestProcessor
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.templateResolver = sc.get(props, 'templateResolver', false);
    }

    getDomainFromRequest(req)
    {
        let host = req.get('host');
        if(!host){
            return false;
        }
        return host.split(':')[0];
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

module.exports.RequestProcessor = RequestProcessor;
