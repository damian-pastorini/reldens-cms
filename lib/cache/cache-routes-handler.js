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
        this.setupRoutes();
    }

    setupRoutes()
    {
        if(!this.cacheManager){
            Logger.error('Cache Manager not found on CacheRoutesHandler.');
            return false;
        }
        if(!this.cacheManager.isEnabled()){
            Logger.debug('Cache Manager not enabled.');
            return false;
        }
        if(!this.router){
            Logger.error('Router not found on CacheRoutesHandler.');
            return false;
        }
        this.router.adminRouter.post(
            this.cacheCleanPath,
            this.router.isAuthenticated.bind(this.router),
            async (req, res) => {
                return await this.processCacheClean(req, res);
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
        return res.redirect(this.rootPath+'/routes/view'+'?id='+routeId+'&result=success');
    }

}

module.exports.CacheRoutesHandler = CacheRoutesHandler;
