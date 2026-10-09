/**
 *
 * Reldens - CMS - Frontend - RequestProcessor
 *
 */

const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class RequestProcessor
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.templateResolver = sc.get(props, 'templateResolver', false);
        this.domainMapping = sc.get(props, 'domainMapping', {});
        this.formKeyParam = 'form-key';
    }

    resolveDomainMapping(domain)
    {
        if(!domain){
            return domain;
        }
        return sc.get(this.domainMapping, domain, domain);
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
        let statusCode = 301 === Number(redirectType) ? 301 : 302;
        res.redirect(statusCode, redirectUrl);
        return true;
    }

    async findRouteByPath(path, domain)
    {
        let routesEntity = this.dataServer.getEntity('routes');
        if(!routesEntity){
            Logger.error('Routes entity not found in dataServer.');
            return false;
        }
        let normalizedPath = this.normalizePathForRouteSearch(path);
        let resolvedDomain = this.resolveDomainMapping(domain);
        let domainFilter = resolvedDomain || null;
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
        let queryKeys = Object.keys(req.query);
        if(queryKeys.includes(this.formKeyParam)){
            return false;
        }
        let collectionKeys = queryKeys.filter(queryKey => queryKey.endsWith('-key')).sort();
        if(0 === collectionKeys.length){
            return path;
        }
        return this.buildQueryCacheKey(path, req.query, collectionKeys);
    }

    buildQueryCacheKey(path, query, queryKeys)
    {
        let queryValues = {};
        for(let queryKey of queryKeys){
            queryValues[queryKey] = query[queryKey];
        }
        return path+'_'+Encryptor.hashData(sc.toJsonString(queryValues));
    }

}

module.exports.RequestProcessor = RequestProcessor;
