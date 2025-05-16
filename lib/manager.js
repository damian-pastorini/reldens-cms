/**
 *
 * Reldens - CMS - Manager
 *
 */

const { AppServerFactory, FileHandler, Encryptor } = require('@reldens/server-utils');
const { DriversMap } = require('@reldens/storage');
const { AdminManager } = require('./admin-manager');
const { Installer } = require('./installer');
const { Storefront } = require('./storefront');
const { Logger, sc } = require('@reldens/utils');
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
        this.authenticationMethod = sc.get(props, 'authenticationMethod', 'db-users');
        this.authenticationCallback = sc.get(props, 'authenticationCallback', false);
        this.appServerFactory = new AppServerFactory();
        this.installer = new Installer({
            projectRoot: this.projectRoot
        });
        this.dataServer = false;
        this.app = false;
        this.appServer = false;
        this.adminManager = false;
        this.storefront = false;
    }

    loadConfigFromEnv()
    {
        return {
            host: process.env.RELDENS_CMS_HOST || 'http://localhost',
            port: Number(process.env.RELDENS_CMS_PORT || 8000),
            adminPath: process.env.RELDENS_CMS_ADMIN_PATH || '/reldens-admin',
            adminSecret: process.env.RELDENS_CMS_ADMIN_SECRET || '',
            database: {
                client: process.env.RELDENS_CMS_DB_CLIENT || 'mysql',
                host: process.env.RELDENS_CMS_DB_HOST || 'localhost',
                port: Number(process.env.RELDENS_CMS_DB_PORT || 3306),
                name: process.env.RELDENS_CMS_DB_NAME || 'reldens_cms',
                user: process.env.RELDENS_CMS_DB_USER || '',
                password: process.env.RELDENS_CMS_DB_PASSWORD || '',
                driver: process.env.RELDENS_CMS_DB_DRIVER || 'prisma'
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
            await this.installer.prepareSetup(this.app, this.appServerFactory);
            await this.appServer.listen(this.config.port);
            Logger.info('Installer running on '+this.config.host+':'+this.config.port);
            return true;
        }
        try {
            await this.initializeDataServer();
            await this.initializeAdminManager();
            await this.initializeStorefront();
            await this.appServer.listen(this.config.port);
            Logger.info('CMS running on '+this.config.host+':'+this.config.port);
            return true;
        } catch (error) {
            Logger.error('Failed to start CMS: '+error.message);
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
            }
        };
        let DriverClass = DriversMap[this.config.database.driver];
        if(!DriverClass){
            throw new Error('Invalid database driver: '+this.config.database.driver);
        }
        this.dataServer = new DriverClass(dbConfig);
        if(!await this.dataServer.connect()){
            throw new Error('Failed to connect to database');
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
            events: false,
            renderCallback: this.renderCallback.bind(this),
            dataServer: this.dataServer,
            authenticationCallback,
            app: this.app,
            appServerFactory: this.appServerFactory,
            secret: this.config.adminSecret,
            rootPath: this.config.adminPath,
            adminRoleId: 99,
            entities: this.entities
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

    async initializeStorefront()
    {
        this.storefront = new Storefront({
            app: this.app,
            dataServer: this.dataServer,
            projectRoot: this.projectRoot
        });
        return await this.storefront.initialize();
    }
}

module.exports.Manager = Manager;
