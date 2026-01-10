/**
 *
 * Reldens - CMS - CacheRoutesHandler
 *
 */

const { Logger, sc } = require('@reldens/utils');

class CacheRoutesHandler
{

    constructor(props)
    {
        this.router = sc.get(props, 'router', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        /** @type {CacheManager} **/
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.rootPath = sc.get(props, 'rootPath', '');
        this.cacheCleanPath = '/cache-clean';
        this.cacheCleanRoute = this.rootPath+this.cacheCleanPath;
        this.clearAllCachePath = '/cache-clear-all';
        this.clearAllCacheRoute = this.rootPath+this.clearAllCachePath;
        this.setupRoutes();
    }

    setupRoutes()
    {
        if(!this.cacheManager){
            Logger.debug('Cache Manager not found on CacheRoutesHandler.');
            return false;
        }
        if(!this.cacheManager.isEnabled()){
            Logger.debug('Cache Manager not enabled on CacheRoutesHandler.');
            return false;
        }
        if(!this.router){
            Logger.debug('Router not found on CacheRoutesHandler.');
            return false;
        }
        this.router.adminRouter.post(
            this.cacheCleanPath,
            this.router.isAuthenticated.bind(this.router),
            async (req, res) => {
                return await this.processCacheClean(req, res);
            }
        );
        this.router.adminRouter.post(
            this.clearAllCachePath,
            this.router.isAuthenticated.bind(this.router),
            async (req, res) => {
                return await this.processClearAllCache(req, res);
            }
        );
        return true;
    }

    async processCacheClean(req, res)
    {
        if(!this.cacheManager){
            return res.json({error: 'Cache manager not available'});
        }
        let routeId = sc.get(req.body, 'routeId', '');
        if(!routeId){
            return res.json({error: 'Route ID is required'});
        }
        let routesEntity = this.dataServer.getEntity('routes');
        if(!routesEntity){
            return res.json({error: 'Routes entity not found'});
        }
        let route = await routesEntity.loadById(routeId);
        if(!route){
            return res.json({error: 'Route not found'});
        }
        let domain = sc.get(route, 'domain', '');
        let path = route.path;
        let cleanResult = await this.cacheManager.delete(domain, path);
        if(!cleanResult){
            return res.json({error: 'Failed to clean cache'});
        }
        let defaultRedirect = this.rootPath+'/routes/view?id='+routeId;
        let refererUrl = sc.get(req.body, 'refererUrl', defaultRedirect);
        let redirectUrl = refererUrl+(refererUrl.includes('?') ? '&' : '?')+'result=success';
        return res.redirect(redirectUrl);
    }

    async processClearAllCache(req, res)
    {
        if(!this.cacheManager){
            return res.json({error: 'Cache manager not available'});
        }
        let clearResult = await this.cacheManager.clear();
        if(!clearResult){
            Logger.error('Failed to clear all cache');
            return res.redirect(this.rootPath+'/routes?result=errorClearAllCache');
        }
        Logger.info('All cache cleared successfully');
        return res.redirect(this.rootPath+'/routes?result=success');
    }

}

module.exports.CacheRoutesHandler = CacheRoutesHandler;
