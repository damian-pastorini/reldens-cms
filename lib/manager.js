/**
 *
 * Reldens - CMS - Manager
 *
 */

const { AppServerFactory, FileHandler, Encryptor } = require('@reldens/server-utils');
const { DriversMap } = require('@reldens/storage');
const { AdminManager } = require('./admin-manager');
const { Installer } = require('./installer');
const { Frontend } = require('./frontend');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');
const dotenv = require('dotenv');
const mustache = require('mustache');

class Manager
{

    constructor(props = {})
    {
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        this.installLockPath = FileHandler.joinPaths(this.projectRoot, 'install.lock');
        dotenv.config({path: this.envFilePath});
        this.config = this.loadConfigFromEnv();
        this.entities = sc.get(props, 'entities', {});
        this.rawEntities = sc.get(props, 'rawEntities', {});
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.entitiesTranslations = sc.get(props, 'entitiesTranslations', {});
        this.authenticationMethod = sc.get(props, 'authenticationMethod', 'db-users');
        this.authenticationCallback = sc.get(props, 'authenticationCallback', false);
        this.events = sc.get(props, 'events', EventsManagerSingleton);
        this.appServerFactory = new AppServerFactory();
        this.installer = new Installer({
            projectRoot: this.projectRoot,
            postInstallCallback: this.initializeCmsAfterInstall.bind(this)
        });
        this.dataServer = false;
        this.app = false;
        this.appServer = false;
        this.adminManager = false;
        this.frontend = false;
    }

    loadConfigFromEnv()
    {
        let envVars = process.env;
        return {
            host: sc.get(envVars, 'RELDENS_CMS_HOST', 'http://localhost'),
            port: Number(sc.get(envVars, 'RELDENS_CMS_PORT', 8000)),
            adminPath: sc.get(envVars, 'RELDENS_CMS_ADMIN_PATH', '/reldens-admin'),
            adminSecret: sc.get(envVars, 'RELDENS_CMS_ADMIN_SECRET', ''),
            database: {
                client: sc.get(envVars, 'RELDENS_CMS_DB_CLIENT', 'mysql'),
                host: sc.get(envVars, 'RELDENS_CMS_DB_HOST', 'localhost'),
                port: Number(sc.get(envVars, 'RELDENS_CMS_DB_PORT', 3306)),
                name: sc.get(envVars, 'RELDENS_CMS_DB_NAME', 'reldens_cms'),
                user: sc.get(envVars, 'RELDENS_CMS_DB_USER', ''),
                password: sc.get(envVars, 'RELDENS_CMS_DB_PASSWORD', ''),
                driver: sc.get(envVars, 'RELDENS_CMS_DB_DRIVER', 'prisma')
            }
        };
    }

    isInstalled()
    {
        return FileHandler.exists(this.installLockPath);
    }

    async start()
    {
        let createdAppServer = this.appServerFactory.createAppServer();
        if(this.appServerFactory.error.message){
            Logger.error('App server error: '+this.appServerFactory.error.message);
            return false;
        }
        this.app = createdAppServer.app;
        this.appServer = createdAppServer.appServer;
        if(!this.isInstalled()){
            Logger.info('CMS not installed, preparing setup');
            await this.installer.prepareSetup(this.app, this.appServer, this.appServerFactory);
            await this.appServer.listen(this.config.port);
            Logger.info('Installer running on '+this.config.host+':'+this.config.port);
            return true;
        }
        try {
            await this.initializeDataServer();
            await this.initializeAdminManager();
            await this.initializeFrontend();
            await this.appServer.listen(this.config.port);
            Logger.info('CMS running on '+this.config.host+':'+this.config.port);
            return true;
        } catch (error) {
            Logger.error('Failed to start CMS: '+error.message);
            return false;
        }
    }

    async initializeCmsAfterInstall(entitiesData)
    {
        try {
            if(entitiesData){
                this.entities = sc.get(entitiesData, 'entities', this.entities);
                this.rawEntities = sc.get(entitiesData, 'rawEntities', this.rawEntities);
                this.entitiesConfig = sc.get(entitiesData, 'entitiesConfig', this.entitiesConfig);
                this.entitiesTranslations = sc.get(entitiesData, 'entitiesTranslations', this.entitiesTranslations);
            }
            this.config = this.loadConfigFromEnv();
            if(this.appServerFactory.error.message){
                Logger.critical('App server creation failed: '+this.appServerFactory.error.message);
                return false;
            }
            await this.initializeDataServer();
            await this.initializeAdminManager();
            await this.initializeFrontend();
            await this.appServer.listen(this.config.port);
            Logger.info('CMS initialized after installation on '+this.config.host+':'+this.config.port);
            return true;
        } catch (error) {
            Logger.critical('Failed to initialize CMS after installation: '+error.message);
            return false;
        }
    }

    async initializeDataServer()
    {
        let dbConfig = {
            client: this.config.database.client,
            config: {
                host: this.config.database.host,
                port: this.config.database.port,
                database: this.config.database.name,
                user: this.config.database.user,
                password: this.config.database.password
            },
            rawEntities: this.rawEntities
        };
        let DriverClass = DriversMap[this.config.database.driver];
        if(!DriverClass){
            Logger.critical('Invalid database driver: '+this.config.database.driver);
            return false;
        }
        this.dataServer = new DriverClass(dbConfig);
        if(!await this.dataServer.connect()){
            Logger.critical('Failed to connect to database.');
            return false;
        }
        await this.dataServer.generateEntities();
        return true;
    }

    async initializeAdminManager()
    {
        let authenticationCallback = this.authenticationCallback;
        if('db-users' === this.authenticationMethod){
            authenticationCallback = async (email, password, roleId) => {
                let usersEntity = this.dataServer.getEntity('users');
                if(!usersEntity){
                    return false;
                }
                let user = await usersEntity.loadOneBy('email', email);
                if(!user){
                    return false;
                }
                if(Number(user.role_id) !== Number(roleId)){
                    return false;
                }
                return Encryptor.validatePassword(password, user.password) ? user : false;
            };
        }
        let adminConfig = {
            events: this.events,
            renderCallback: this.renderCallback.bind(this),
            dataServer: this.dataServer,
            authenticationCallback,
            app: this.app,
            appServerFactory: this.appServerFactory,
            secret: this.config.adminSecret,
            rootPath: this.config.adminPath,
            adminRoleId: 99,
            entities: this.entities,
            entitiesConfig: this.entitiesConfig,
            translations: this.entitiesTranslations
        };
        this.adminManager = new AdminManager(adminConfig);
        await this.adminManager.setupAdmin();
        return true;
    }

    async renderCallback(template, params)
    {
        if(!template){
            return '';
        }
        return mustache.render(template, params);
    }

    async initializeFrontend()
    {
        this.frontend = new Frontend({
            app: this.app,
            dataServer: this.dataServer,
            projectRoot: this.projectRoot,
            appServerFactory: this.appServerFactory
        });
        return await this.frontend.initialize();
    }
}

module.exports.Manager = Manager;
