/**
 *
 * Reldens - CMS - Manager
 *
 */

const { TemplatesList } = require('./templates-list');
const { AdminTranslations } = require('./admin-translations');
const { AdminTemplatesLoader } = require('./admin-templates-loader');
const { AdminManagerValidator } = require('./admin-manager-validator');
const { MimeTypes } = require('./mime-types');
const { AllowedExtensions } = require('./allowed-extensions');
const { TemplatesToPathMapper } = require('./templates-to-path-mapper');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { LoadedEntitiesProcessor } = require('./loaded-entities-processor');
const { AdminManager } = require('./admin-manager');
const { Installer } = require('./installer');
const { Frontend } = require('./frontend');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');
const { DriversMap } = require('@reldens/storage');
const { AppServerFactory, FileHandler, Encryptor } = require('@reldens/server-utils');
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
        this.adminEntities = sc.get(props, 'adminEntities', {});
        this.rawRegisteredEntities = sc.get(props, 'rawRegisteredEntities', {});
        this.entitiesTranslations = sc.get(props, 'entitiesTranslations', {});
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.processedEntities = sc.get(props, 'processedEntities', {});
        this.entityAccess = sc.get(props, 'entityAccess', {});
        this.authenticationMethod = sc.get(props, 'authenticationMethod', 'db-users');
        this.authenticationCallback = sc.get(props, 'authenticationCallback', false);
        this.events = sc.get(props, 'events', EventsManagerSingleton);
        this.adminTemplatesList = sc.get(props, 'adminTemplatesList', TemplatesList);
        this.projectAdminPath = FileHandler.joinPaths(this.projectRoot, 'admin');
        this.projectAdminTemplatesPath = FileHandler.joinPaths(this.projectAdminPath, 'templates');
        this.mimeTypes = sc.get(props, 'mimeTypes', MimeTypes);
        this.allowedExtensions = sc.get(props, 'allowedExtensions', AllowedExtensions)
        this.adminRoleId = sc.get(props, 'adminRoleId', 99);
        this.stylesFilePath = sc.get(props, 'stylesFilePath', '/css/reldens-admin-client.css');
        this.scriptsFilePath = sc.get(props, 'scriptsFilePath', '/js/reldens-admin-client.js');
        this.companyName = sc.get(props, 'companyName', 'Reldens - CMS');
        this.logo = sc.get(props, 'logo', '/assets/web/reldens-your-logo-mage.png');
        this.favicon = sc.get(props, 'favicon', '/assets/web/favicon.ico');
        this.defaultDomain = sc.get(props, 'defaultDomain', (process.env.RELDENS_DEFAULT_DOMAIN || ''));
        this.domainMapping = sc.get(props, 'domainMapping', sc.toJson(process.env.RELDENS_DOMAIN_MAPPING));
        this.siteKeyMapping = sc.get(props, 'siteKeyMapping', sc.toJson(process.env.RELDENS_SITE_KEY_MAPPING));
        this.templateExtensions = sc.get(props, 'templateExtensions', ['.html', '.template']);
        this.app = sc.get(props, 'app', false);
        this.appServer = sc.get(props, 'appServer', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.adminManager = sc.get(props, 'adminManager', false);
        this.frontend = sc.get(props, 'frontend', false);
        this.renderEngine = sc.get(props, 'renderEngine', mustache);
        this.prismaClient = sc.get(props, 'prismaClient', false);
        this.appServerFactory = new AppServerFactory();
        this.adminEntitiesGenerator = new AdminEntitiesGenerator();
        this.installer = new Installer({
            projectRoot: this.projectRoot,
            prismaClient: this.prismaClient,
            postInstallCallback: this.initializeCmsAfterInstall.bind(this)
        });
        this.useProvidedServer = this.validateProvidedServer();
        this.useProvidedDataServer = this.validateProvidedDataServer();
        this.useProvidedAdminManager = this.validateProvidedAdminManager();
        this.useProvidedFrontend = this.validateProvidedFrontend();
    }

    validateProvidedServer()
    {
        if(!this.app){
            return false;
        }
        if(!this.appServer){
            return false;
        }
        if('function' !== typeof this.app.use){
            Logger.critical('Invalid app instance provided - missing use method.');
            return false;
        }
        if('function' !== typeof this.appServer.listen){
            Logger.critical('Invalid appServer instance provided - missing listen method.');
            return false;
        }
        return true;
    }

    validateProvidedDataServer()
    {
        if(!this.dataServer){
            return false;
        }
        if('function' !== typeof this.dataServer.connect){
            Logger.critical('Invalid dataServer instance provided - missing connect method.');
            return false;
        }
        if('function' !== typeof this.dataServer.generateEntities){
            Logger.critical('Invalid dataServer instance provided - missing generateEntities method.');
            return false;
        }
        return true;
    }

    validateProvidedAdminManager()
    {
        if(!this.adminManager){
            return false;
        }
        if('function' !== typeof this.adminManager.setupAdmin){
            Logger.critical('Invalid adminManager instance provided - missing setupAdmin method.');
            return false;
        }
        return true;
    }

    validateProvidedFrontend()
    {
        if(!this.frontend){
            return false;
        }
        if('function' !== typeof this.frontend.initialize){
            Logger.critical('Invalid frontend instance provided - missing initialize method.');
            return false;
        }
        return true;
    }

    loadConfigFromEnv()
    {
        let envVars = process.env;
        return {
            host: sc.get(envVars, 'RELDENS_APP_HOST', 'http://localhost'),
            port: Number(sc.get(envVars, 'RELDENS_APP_PORT', 8080)),
            adminPath: sc.get(envVars, 'RELDENS_ADMIN_ROUTE_PATH', '/reldens-admin'),
            adminSecret: sc.get(envVars, 'RELDENS_ADMIN_SECRET', ''),
            database: {
                client: sc.get(envVars, 'RELDENS_DB_CLIENT', 'mysql'),
                host: sc.get(envVars, 'RELDENS_DB_HOST', 'localhost'),
                port: Number(sc.get(envVars, 'RELDENS_DB_PORT', 3306)),
                name: sc.get(envVars, 'RELDENS_DB_NAME', 'reldens_cms'),
                user: sc.get(envVars, 'RELDENS_DB_USER', ''),
                password: sc.get(envVars, 'RELDENS_DB_PASSWORD', ''),
                driver: sc.get(envVars, 'RELDENS_STORAGE_DRIVER', 'prisma')
            }
        };
    }

    isInstalled()
    {
        return FileHandler.exists(this.installLockPath);
    }

    async start()
    {
        if(!this.useProvidedServer){
            let createdAppServer = this.appServerFactory.createAppServer();
            if(this.appServerFactory.error.message){
                Logger.error('App server error: '+this.appServerFactory.error.message);
                return false;
            }
            this.app = createdAppServer.app;
            this.appServer = createdAppServer.appServer;
        }
        if(!this.isInstalled()){
            Logger.info('CMS not installed, preparing setup');
            await this.installer.prepareSetup(this.app, this.appServer, this.appServerFactory, this.renderEngine);
            if(!this.useProvidedServer){
                await this.appServer.listen(this.config.port);
            }
            Logger.info('Installer running on '+this.config.host+':'+this.config.port);
            return true;
        }
        try {
            await this.initializeServices();
            Logger.info('CMS running on '+this.config.host+':'+this.config.port);
            return true;
        } catch (error) {
            Logger.critical('Failed to start CMS: '+error.message);
            return false;
        }
    }

    async initializeCmsAfterInstall(props)
    {
        try {
            this.rawRegisteredEntities = props.loadedEntities.rawRegisteredEntities;
            this.entitiesTranslations = props.loadedEntities.entitiesTranslations;
            this.entitiesConfig = props.loadedEntities.entitiesConfig;
            this.config = props.mappedVariablesForConfig;
            await this.initializeServices();
            Logger.info('CMS initialized after installation on '+this.config.host+':'+this.config.port);
            return true;
        } catch (error) {
            Logger.critical('Failed to initialize CMS after installation: '+error.message);
            return false;
        }
    }

    async initializeServices()
    {
        if(!this.useProvidedDataServer){
            if(!await this.initializeDataServer()){
                return false;
            }
        }
        if(0 < Object.keys(this.entityAccess).length){
            await this.setupEntityAccess();
        }
        if(!this.loadProcessedEntities()){
            return false;
        }
        if(!await this.generateAdminEntities()){
            return false;
        }
        if(!this.useProvidedAdminManager){
            if(!await this.initializeAdminManager()){
                return false;
            }
        }
        if(!this.useProvidedFrontend){
            if(!await this.initializeFrontend()){
                return false;
            }
        }
        if(!this.useProvidedServer){
            await this.appServer.listen(this.config.port);
        }
        return true;
    }

    async setupEntityAccess()
    {
        let accessEntity = this.dataServer.getEntity('cmsEntityAccess');
        if(!accessEntity){
            Logger.warning('Entity access control table not found.');
            return;
        }
        for(let entityName of Object.keys(this.entityAccess)){
            let accessConfig = this.entityAccess[entityName];
            if(!await accessEntity.loadOneBy('entity_name', entityName)){
                await accessEntity.create({
                    entity_name: entityName,
                    is_public: sc.get(accessConfig, 'public', false),
                    allowed_operations: JSON.stringify(sc.get(accessConfig, 'operations', ['read']))
                });
            }
        }
    }

    loadProcessedEntities()
    {
        if(0 === Object.keys(this.processedEntities).length){
            this.processedEntities = LoadedEntitiesProcessor.process(
                this.rawRegisteredEntities,
                this.entitiesTranslations,
                this.entitiesConfig
            );
        }
        if(!this.processedEntities?.entities){
            Logger.critical('Processed entities undefined.');
            return false;
        }
        return true;
    }

    async generateAdminEntities()
    {
        if(0 < Object.keys(this.adminEntities).length){
            return true;
        }
        if(!this.dataServer.rawEntities && this.rawRegisteredEntities){
            this.dataServer.rawEntities = this.rawRegisteredEntities;
        }
        Logger.debug('Generate entities count: '+Object.keys(this.rawRegisteredEntities).length);
        await this.dataServer.generateEntities();
        this.adminEntities = this.adminEntitiesGenerator.generate(
            this.processedEntities.entities,
            this.dataServer.entityManager.entities
        );
        if(0 === Object.keys(this.adminEntities).length){
            Logger.warning('Admin entities not found.');
            return false;
        }
        return true;
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
            rawEntities: this.rawRegisteredEntities
        };
        let driverClass = DriversMap[this.config.database.driver];
        if(!driverClass){
            Logger.critical('Invalid database driver: '+this.config.database.driver);
            return false;
        }
        if('prisma' === this.config.database.driver && this.prismaClient){
            dbConfig.prismaClient = this.prismaClient;
        }
        this.dataServer = new driverClass(dbConfig);
        if(!await this.dataServer.connect()){
            Logger.critical('Failed to connect to database.');
            return false;
        }
        Logger.debug('Entities count: '+Object.keys(this.rawRegisteredEntities).length);
        await this.dataServer.generateEntities();
        return true;
    }

    async initializeAdminManager()
    {
        let authenticationCallback = this.authenticationCallback;
        if('db-users' === this.authenticationMethod && !authenticationCallback){
            authenticationCallback = async (email, password, roleId) => {
                Logger.debug('Running default "db-users" authentication.');
                let usersEntity = this.dataServer.getEntity('users');
                if(!usersEntity){
                    Logger.critical('No users entity found.');
                    return false;
                }
                let user = await usersEntity.loadOneBy('email', email);
                if(!user){
                    Logger.debug('User not found by email: '+email+'.', user);
                    return false;
                }
                if(Number(user.role_id) !== Number(roleId)){
                    Logger.debug('Invalid user role ID: '+roleId+' / '+user.role_id+'.');
                    return false;
                }
                let passwordResult = Encryptor.validatePassword(password, user.password) ? user : false;
                if(!passwordResult){
                    Logger.debug('Invalid user password for: '+email+'.');
                }
                return passwordResult;
            };
        }
        let adminConfig = {
            events: this.events,
            dataServer: this.dataServer,
            authenticationCallback,
            app: this.app,
            appServerFactory: this.appServerFactory,
            entities: this.adminEntities,
            validator: new AdminManagerValidator(),
            renderCallback: this.renderCallback.bind(this),
            secret: this.config.adminSecret,
            rootPath: this.config.adminPath,
            translations: AdminTranslations.appendTranslations(this.entitiesTranslations || {}),
            adminFilesContents: await AdminTemplatesLoader.fetchAdminFilesContents(
                TemplatesToPathMapper.map(this.adminTemplatesList, this.projectAdminTemplatesPath)
            ),
            mimeTypes: this.mimeTypes,
            allowedExtensions: this.allowedExtensions,
            adminRoleId: this.adminRoleId,
            stylesFilePath: this.stylesFilePath,
            scriptsFilePath: this.scriptsFilePath,
            branding: {
                companyName: this.companyName,
                logo: this.logo,
                favicon: this.favicon,
                copyRight: await FileHandler.fetchFileContents(
                    FileHandler.joinPaths(this.projectAdminTemplatesPath, this.adminTemplatesList.defaultCopyRight)
                )
            }
        };
        this.adminManager = new AdminManager(adminConfig);
        await this.adminManager.setupAdmin();
        return true;
    }

    async renderCallback(template, params = {})
    {
        if(!template){
            return '';
        }
        return this.renderEngine.render(template, params);
    }

    async initializeFrontend()
    {
        this.frontend = new Frontend({
            app: this.app,
            dataServer: this.dataServer,
            renderEngine: this.renderEngine,
            projectRoot: this.projectRoot,
            appServerFactory: this.appServerFactory,
            defaultDomain: this.defaultDomain,
            domainMapping: this.domainMapping,
            siteKeyMapping: this.siteKeyMapping,
            templateExtensions: this.templateExtensions
        });
        return await this.frontend.initialize();
    }
}

module.exports.Manager = Manager;
