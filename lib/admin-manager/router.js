/**
 *
 * Reldens - Router
 *
 */

const { Logger } = require('@reldens/utils');

class Router
{

    constructor(props)
    {
        this.app = props.app;
        this.applicationFramework = props.applicationFramework;
        this.bodyParser = props.bodyParser;
        this.session = props.session;
        this.secret = props.secret;
        this.rootPath = props.rootPath;
        this.adminRoleId = props.adminRoleId;
        this.authenticationCallback = props.authenticationCallback;
        this.uploaderFactory = props.uploaderFactory;
        this.buckets = props.buckets;
        this.blackList = props.blackList;
        this.loginPath = props.loginPath;
        this.logoutPath = props.logoutPath;
        this.viewPath = props.viewPath;
        this.editPath = props.editPath;
        this.savePath = props.savePath;
        this.deletePath = props.deletePath;
        this.resources = props.resources;
        this.emitEvent = props.emitEvent;
        this.fetchUploadProperties = props.fetchUploadProperties;
        this.adminContents = props.adminContents;
        this.generateListRouteContent = props.generateListRouteContent;
        this.generateViewRouteContent = props.generateViewRouteContent;
        this.generateEditRouteContent = props.generateEditRouteContent;
        this.processDeleteEntities = props.processDeleteEntities;
        this.processSaveEntity = props.processSaveEntity;
        this.setupAdminRouter();
    }

    setupAdminRouter()
    {
        if(!this.applicationFramework){
            Logger.critical('ApplicationFramework is required for AdminRouter setup.');
            return false;
        }
        this.adminRouter = this.applicationFramework.Router();
        if(this.session){
            if(!this.secret){
                Logger.warning('Admin Manager "secret" key was not provided.');
            }
            this.adminRouter.use(this.session({secret: this.secret, resave: false, saveUninitialized: true}));
        }
        if(!this.bodyParser){
            Logger.critical('BodyParser is required for AdminRouter setup.');
            return false;
        }
        this.adminRouter.use(this.bodyParser.json());
        return true;
    }

    setupAdminRoutes()
    {
        this.adminRouter.get(this.loginPath, async (req, res) => {
            return res.send(this.adminContents().login);
        });
        this.adminRouter.post(this.loginPath, async (req, res) => {
            let { email, password } = req.body;
            let loginResult = await this.authenticationCallback(email, password, this.adminRoleId);
            if(loginResult){
                req.session.user = loginResult;
                return res.redirect(this.rootPath);
            }
            return res.redirect(this.rootPath+this.loginPath+'?login-error=true');
        });
        this.adminRouter.get('/', this.isAuthenticated.bind(this), async (req, res) => {
            return res.send(this.adminContents().dashboard);
        });
        this.adminRouter.get(this.logoutPath, (req, res) => {
            req.session.destroy();
            res.redirect(this.rootPath+this.loginPath);
        });
        this.app.use(this.rootPath, this.adminRouter);
    }

    async setupEntitiesRoutes()
    {
        let resources = this.resources();
        if(!resources || 0 === resources.length){
            return;
        }
        for(let driverResource of resources){
            let entityPath = driverResource.entityPath;
            let entityRoute = '/'+entityPath;
            this.adminRouter.get(entityRoute, this.isAuthenticated.bind(this), async (req, res) => {
                return res.send(await this.generateListRouteContent(req, driverResource, entityPath));
            });
            this.adminRouter.post(entityRoute, this.isAuthenticated.bind(this), async (req, res) => {
                return res.send(await this.generateListRouteContent(req, driverResource, entityPath));
            });
            this.adminRouter.get(entityRoute+this.viewPath, this.isAuthenticated.bind(this), async (req, res) => {
                let routeContents = await this.generateViewRouteContent(req, driverResource, entityPath);
                if('' === routeContents){
                    return res.redirect(this.rootPath+'/'+entityPath+'?result=errorView');
                }
                return res.send(routeContents);
            });
            this.adminRouter.get(entityRoute+this.editPath, this.isAuthenticated.bind(this), async (req, res) => {
                await this.emitEvent('reldens.adminBeforeEntityEdit', {
                    req,
                    res,
                    driverResource,
                    entityPath
                });
                let routeContents = await this.generateEditRouteContent(req, driverResource, entityPath);
                if('' === routeContents){
                    return res.redirect(this.rootPath+'/'+entityPath+'?result=errorEdit');
                }
                return res.send(routeContents);
            });
            this.setupSavePath(entityRoute, driverResource, entityPath);
            this.adminRouter.post(entityRoute+this.deletePath, this.isAuthenticated.bind(this), async (req, res) => {
                return res.redirect(await this.processDeleteEntities(req, res, driverResource, entityPath));
            });
            await this.emitEvent('reldens.setupEntitiesRoutes', {
                entityPath,
                entityRoute,
                driverResource
            });
        }
    }

    setupSavePath(entityRoute, driverResource, entityPath)
    {
        let uploadProperties = this.fetchUploadProperties(driverResource);
        if(0 === Object.keys(uploadProperties || {}).length){
            this.adminRouter.post(
                entityRoute+this.savePath,
                this.isAuthenticated.bind(this),
                async (req, res) => {
                    await this.emitEvent('reldens.adminBeforeEntitySave', {
                        req,
                        res,
                        driverResource,
                        entityPath
                    });
                    return res.redirect(await this.processSaveEntity(req, res, driverResource, entityPath));
                }
            );
            return;
        }
        let fields = [];
        let allowedFileTypes = {};
        for(let uploadPropertyKey of Object.keys(uploadProperties)){
            let property = uploadProperties[uploadPropertyKey];
            allowedFileTypes[uploadPropertyKey] = property.allowedTypes || false;
            let field = {name: uploadPropertyKey};
            if(!property.isArray){
                field.maxCount = 1;
            }
            fields.push(field);
            this.buckets[uploadPropertyKey] = property.bucket;
        }
        this.adminRouter.post(
            entityRoute + this.savePath,
            this.isAuthenticated.bind(this),
            this.uploaderFactory.createUploader(fields, this.buckets, allowedFileTypes),
            async (req, res) => {
                await this.emitEvent('reldens.adminBeforeEntitySave', {
                    req,
                    res,
                    driverResource,
                    entityPath
                });
                return res.redirect(await this.processSaveEntity(req, res, driverResource, entityPath));
            }
        );
    }

    isAuthenticated(req, res, next)
    {
        let allowContinue = {result: true, callback: null};
        let event = {req, res, next, allowContinue};
        this.emitEvent('reldens.adminIsAuthenticated', event);
        let returnPath = this.rootPath+this.loginPath;
        if(false === allowContinue.result){
            return res.redirect(returnPath);
        }
        if(null !== allowContinue.callback){
            return allowContinue.callback(event);
        }
        let user = req.session?.user;
        if(!user){
            return res.redirect(returnPath);
        }
        let userBlackList = this.blackList[user.role_id] || [];
        if(-1 !== userBlackList.indexOf(req.path)){
            let referrer = String(req.headers?.referer || '');
            return res.redirect('' !== referrer ? referrer : returnPath);
        }
        return next();
    }

}

module.exports.Router = Router;
