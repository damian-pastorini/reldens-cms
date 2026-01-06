/**
 *
 * Reldens - CMS - Manager
 *
 */

const { TemplatesList } = require('./templates-list');
const { DefaultTranslations } = require('./admin-manager/default-translations');
const { AdminTemplatesLoader } = require('./admin-templates-loader');
const { AdminManagerValidator } = require('./admin-manager-validator');
const { MimeTypes } = require('./mime-types');
const { AllowedExtensions } = require('./allowed-extensions');
const { TemplatesToPathMapper } = require('./templates-to-path-mapper');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { LoadedEntitiesProcessor } = require('./loaded-entities-processor');
const { AdminManager } = require('./admin-manager');
const { CmsPagesRouteManager } = require('./cms-pages-route-manager');
const { Installer } = require('./installer');
const { Frontend } = require('./frontend');
const { CacheManager } = require('./cache/cache-manager');
const { TemplateReloader } = require('./template-reloader');
const { PasswordEncryptionHandler } = require('./password-encryption-handler');
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
        this.adminTranslations = sc.get(props, 'adminTranslations', {});
        this.adminEntities = sc.get(props, 'adminEntities', {});
        this.rawRegisteredEntities = sc.get(props, 'rawRegisteredEntities', {});
        this.entitiesTranslations = sc.get(props, 'entitiesTranslations', {});
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.processedEntities = sc.get(props, 'processedEntities', {});
        this.entityAccess = sc.get(props, 'entityAccess', {});
        this.authenticationMethod = sc.get(props, 'authenticationMethod', 'db-users');
        this.authenticationCallback = sc.get(props, 'authenticationCallback', false);
        this.enablePasswordEncryption = sc.get(props, 'enablePasswordEncryption', true);
        this.events = sc.get(props, 'events', EventsManagerSingleton);
        this.adminTemplatesList = sc.get(props, 'adminTemplatesList', TemplatesList);
        this.projectAdminPath = FileHandler.joinPaths(this.projectRoot, 'admin');
        this.projectAdminTemplatesPath = FileHandler.joinPaths(this.projectAdminPath, 'templates');
        this.mimeTypes = sc.get(props, 'mimeTypes', MimeTypes);
        this.allowedExtensions = sc.get(props, 'allowedExtensions', AllowedExtensions);
        this.adminRoleId = sc.get(props, 'adminRoleId', 99);
        this.mappedAdminTemplates = TemplatesToPathMapper.map(this.adminTemplatesList, this.projectAdminTemplatesPath);
        this.stylesFilePath = sc.get(props, 'stylesFilePath', '/css/reldens-admin-client.css');
        this.scriptsFilePath = sc.get(props, 'scriptsFilePath', '/js/reldens-admin-client.js');
        this.companyName = sc.get(props, 'companyName', 'Reldens - CMS');
        this.logo = sc.get(props, 'logo', '/assets/web/reldens-your-logo-mage.png');
        this.favicon = sc.get(props, 'favicon', '/assets/web/favicon.ico');
        this.defaultDomain = sc.get(props, 'defaultDomain', (process.env.RELDENS_DEFAULT_DOMAIN || ''));
        this.domainMapping = sc.get(props, 'domainMapping', sc.toJson(process.env.RELDENS_DOMAIN_MAPPING));
        this.siteKeyMapping = sc.get(props, 'siteKeyMapping', sc.toJson(process.env.RELDENS_SITE_KEY_MAPPING));
        this.domainPublicUrlMapping = sc.get(
            props,
            'domainPublicUrlMapping',
            sc.toJson(process.env.RELDENS_DOMAIN_PUBLIC_URL_MAPPING, {})
        );
        this.domainCdnMapping = sc.get(
            props,
            'domainCdnMapping',
            sc.toJson(process.env.RELDENS_DOMAIN_CDN_MAPPING, {})
        );
        this.templateExtensions = sc.get(props, 'templateExtensions', ['.html', '.template']);
        this.cache = sc.get(props, 'cache', false);
        this.reloadTime = sc.get(props, 'reloadTime', 0);
        this.app = sc.get(props, 'app', false);
        this.appServer = sc.get(props, 'appServer', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.adminManager = sc.get(props, 'adminManager', false);
        this.frontend = sc.get(props, 'frontend', false);
        this.renderEngine = sc.get(props, 'renderEngine', mustache);
        this.prismaClient = sc.get(props, 'prismaClient', false);
        this.domains = sc.get(props, 'domains', []);
        this.developmentPatterns = sc.get(props, 'developmentPatterns', []);
        this.developmentEnvironments = sc.get(props, 'developmentEnvironments', []);
        this.developmentPorts = sc.get(props, 'developmentPorts', []);
        this.developmentMultiplier = sc.get(props, 'developmentMultiplier', 10);
        this.appServerConfig = sc.get(props, 'appServerConfig', {});
        this.useDefaultErrorCallback = sc.get(props, 'useDefaultErrorCallback', true);
        this.developmentExternalDomains = sc.get(props, 'developmentExternalDomains', {});
        this.appServerFactory = new AppServerFactory();
        this.adminEntitiesGenerator = new AdminEntitiesGenerator();
        this.cacheManager = new CacheManager({projectRoot: this.projectRoot, enabled: this.cache});
        this.templateReloader = new TemplateReloader({
            reloadTime: this.reloadTime,
            events: this.events,
            adminTemplatesLoader: AdminTemplatesLoader,
            mappedAdminTemplates: this.mappedAdminTemplates,
            templatesPath: FileHandler.joinPaths(this.projectRoot, 'templates'),
            templateExtensions: this.templateExtensions
        });
        this.installer = new Installer({
            projectRoot: this.projectRoot,
            prismaClient: this.prismaClient,
            postInstallCallback: this.initializeCmsAfterInstall.bind(this)
        });
        this.useProvidedServer = this.validateProvidedServer();
        this.useProvidedDataServer = this.validateProvidedDataServer();
        this.useProvidedAdminManager = this.validateProvidedAdminManager();
        this.useProvidedFrontend = this.validateProvidedFrontend();
        this.cmsPagesRouteManager = new CmsPagesRouteManager({
            dataServer: this.dataServer,
            events: this.events
        });
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
            },
            publicUrl: sc.get(envVars, 'RELDENS_PUBLIC_URL', '')
        };
    }

    isInstalled()
    {
        return FileHandler.exists(this.installLockPath);
    }

    async start()
    {
        if(!this.useProvidedServer){
            let appServerConfig = this.buildAppServerConfiguration();
            let createdAppServer = this.appServerFactory.createAppServer(appServerConfig);
            if(this.appServerFactory.error.message){
                Logger.error('App server error: '+this.appServerFactory.error.message);
                return false;
            }
            this.app = createdAppServer.app;
            this.appServer = createdAppServer.appServer;
        }
        if(!this.isInstalled()){
            Logger.info('CMS not installed, preparing setup');
            await this.installer.configureAppServerRoutes(
                this.app,
                this.appServer,
                this.appServerFactory,
                this.renderEngine
            );
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

    buildAppServerConfiguration()
    {
        let useHelmet = this.isInstalled();
        let useHttps = this.config.host.startsWith('https://');
        let baseConfig = {
            port: this.config.port,
            useHttps,
            useHelmet,
            domainMapping: this.domainMapping || {},
            defaultDomain: this.defaultDomain,
            developmentPatterns: this.developmentPatterns,
            developmentEnvironments: this.developmentEnvironments,
            developmentPorts: this.developmentPorts,
            developmentMultiplier: this.developmentMultiplier,
            developmentExternalDomains: this.developmentExternalDomains
        };
        if(this.useDefaultErrorCallback && !this.appServerConfig.onError){
            baseConfig.onError = (event) => {
                if(!event.error){
                    return;
                }
                let errorKey = event.key || 'unknown';
                let errorMessage = 'string' === typeof event.error ? event.error : event.error.message;
                let errorCode = event.error.code || '';
                let errorStack = event.error.stack || '';
                let logParts = ['Server error - key: '+errorKey];
                if(event.hostname){
                    logParts.push('hostname: '+event.hostname);
                }
                if(event.path){
                    logParts.push('path: '+event.path);
                }
                if(errorCode){
                    logParts.push('code: '+errorCode);
                }
                if(errorMessage){
                    logParts.push('message: '+errorMessage);
                }
                if(errorStack){
                    logParts.push('stack: '+errorStack);
                }
                Logger.error(logParts.join(', '));
            };
        }
        let appServerConfig = Object.assign({}, baseConfig, this.appServerConfig);
        if(this.domainMapping && 'object' === typeof this.domainMapping){
            this.appServerFactory.setDomainMapping(this.domainMapping);
            this.validateCdnMappingsInDevelopment();
            if(!useHttps){
                let mappingKeys = Object.keys(this.domainMapping);
                for(let domain of mappingKeys){
                    this.appServerFactory.addDevelopmentDomain(domain);
                }
            }
        }
        if(sc.isArray(this.domains) && 0 < this.domains.length){
            for(let domain of this.domains){
                this.appServerFactory.addDomain(domain);
            }
        }
        return appServerConfig;
    }

    validateCdnMappingsInDevelopment()
    {
        if(!sc.isObject(this.domainCdnMapping) || sc.isArray(this.domainCdnMapping)){
            return;
        }
        if(0 === Object.keys(this.domainCdnMapping).length){
            return;
        }
        if(!sc.isObject(this.developmentExternalDomains) || sc.isArray(this.developmentExternalDomains)){
            Logger.info('CDN mappings configured but developmentExternalDomains not provided. '
                +'CDN assets may fail in development mode due to CORS. '
                +'Add CDN domains to developmentExternalDomains configuration.');
            return;
        }
        let domainKeys = Object.keys(this.domainCdnMapping);
        let domainsWithMissingCdn = [];
        for(let domain of domainKeys){
            let cdnUrl = this.domainCdnMapping[domain];
            let cdnHostname = cdnUrl.replace(/^https?:\/\//, '').split('/')[0];
            let cdnUrlWithProtocol = cdnUrl.split('/')[0];
            let foundInDirective = false;
            let directiveKeys = Object.keys(this.developmentExternalDomains);
            for(let directiveKey of directiveKeys){
                let domains = this.developmentExternalDomains[directiveKey];
                if(!sc.isArray(domains)){
                    continue;
                }
                if(domains.includes(cdnUrlWithProtocol) || domains.includes(cdnHostname)){
                    foundInDirective = true;
                    break;
                }
            }
            if(!foundInDirective){
                domainsWithMissingCdn.push(domain);
            }
        }
        if(0 < domainsWithMissingCdn.length){
            Logger.info('CDN mapping for domains: '+domainsWithMissingCdn.join(', ')
                +' not found in CSP directives (scriptSrc, styleSrc, fontSrc, imgSrc, connectSrc, manifestSrc) '
                +'within developmentExternalDomains. Add CDN URLs to avoid CORS issues in development mode.');
        }
    }

    async initializeCmsAfterInstall(props)
    {
        try {
            this.config = props.mappedVariablesForConfig;
            let appServerConfig = this.buildAppServerConfiguration();
            Object.assign(this.appServerFactory, appServerConfig);
            this.appServerFactory.addHttpDomainsAsDevelopment();
            this.appServerFactory.detectDevelopmentMode();
            this.appServerFactory.setupSecurity();
            //Logger.debug('Development mode installation: '+this.appServerFactory.isDevelopmentMode);
            this.rawRegisteredEntities = props.loadedEntities.rawRegisteredEntities;
            this.entitiesTranslations = props.loadedEntities.entitiesTranslations;
            this.entitiesConfig = props.loadedEntities.entitiesConfig;
            this.config = props.mappedVariablesForConfig;
            if(props.dataServer){
                this.dataServer = props.dataServer;
                this.useProvidedDataServer = true;
            }
            let servicesResult = await this.initializeServices();
            if(!servicesResult){
                Logger.critical('Failed to initialize services after installation.');
                return false;
            }
            Logger.info('CMS initialized after installation on '+this.config.host+':'+this.config.port);
            return true;
        } catch (error) {
            Logger.critical('Failed to initialize CMS after installation: '+error.message);
            return false;
        }
    }

    async initializeServices()
    {
        this.events.emit('reldens.cmsManagerInitializeServices', {manager: this});
        if(!this.useProvidedDataServer){
            if(!await this.initializeDataServer()){
                Logger.debug('Initialize Data Server failed.');
                return false;
            }
        }
        if(0 < Object.keys(this.entityAccess).length){
            await this.setupEntityAccess();
        }
        if(!this.loadProcessedEntities()){
            Logger.debug('Load Processed Entities for Entities failed.');
            return false;
        }
        if(!await this.generateAdminEntities()){
            Logger.debug('Generate Admin Entities for Entities failed.');
            return false;
        }
        if(!this.useProvidedAdminManager){
            if(!await this.initializeAdminManager()){
                Logger.debug('Initialize Admin Manager failed.');
                return false;
            }
        }
        if(!await this.initializeCmsPagesRouteManager()){
            Logger.debug('Initialize CMS Pages Route Manager failed.');
            return false;
        }
        if(!this.useProvidedFrontend){
            if(!await this.initializeFrontend()){
                Logger.debug('Initialize Frontend failed.');
                return false;
            }
        }
        if(!this.useProvidedServer){
            await this.appServer.listen(this.config.port);
        }
        Logger.debug('Initialize Services successfully.');
        return true;
    }

    async setupEntityAccess()
    {
        let accessEntity = this.dataServer.getEntity('entitiesAccess');
        if(!accessEntity){
            Logger.warning('Entities Access not found.');
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
            Logger.critical('Admin entities generation failed - no entities available.');
            Logger.critical('CMS cannot start without admin entities.');
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
            rawEntities: this.rawRegisteredEntities,
            entitiesConfig: this.entitiesConfig
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
        this.templateReloader.trackTemplateFiles(this.mappedAdminTemplates);
        let adminFilesContents = await AdminTemplatesLoader.fetchAdminFilesContents(this.mappedAdminTemplates);
        let translations = sc.deepMergeProperties(
            sc.deepMergeProperties({}, DefaultTranslations),
            sc.deepMergeProperties(this.entitiesTranslations, this.adminTranslations)
        );
        this.events.emit('reldens.manager.initializeAdminManager', {
            manager: this,
            authenticationCallback,
            adminFilesContents,
            translations
        });
        this.initializePasswordEncryptionHandler();
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
            translations,
            adminFilesContents,
            mimeTypes: this.mimeTypes,
            allowedExtensions: this.allowedExtensions,
            adminRoleId: this.adminRoleId,
            stylesFilePath: this.stylesFilePath,
            scriptsFilePath: this.scriptsFilePath,
            cacheManager: this.cacheManager,
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
        this.adminManager.router.checkAndReloadAdminTemplates = async () => {
            return await this.templateReloader.handleAdminTemplateReload(this.adminManager);
        };
        await this.adminManager.setupAdmin();
        return true;
    }

    initializePasswordEncryptionHandler()
    {
        if(!this.enablePasswordEncryption){
            Logger.debug('Password encryption handler is disabled.');
            return false;
        }
        this.passwordEncryptionHandler = new PasswordEncryptionHandler({
            events: this.events,
            enabled: this.enablePasswordEncryption
        });
        this.passwordEncryptionHandler.registerEventListeners();
        Logger.debug('Password encryption handler initialized and registered.');
        return true;
    }

    async initializeCmsPagesRouteManager()
    {
        if(!this.dataServer){
            Logger.warning('CmsPagesRouteManager initialization skipped - missing dataServer.');
            return false;
        }
        this.cmsPagesRouteManager.dataServer = this.dataServer;
        Logger.debug('CmsPagesRouteManager initialized successfully');
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
            events: this.events,
            renderEngine: this.renderEngine,
            projectRoot: this.projectRoot,
            appServerFactory: this.appServerFactory,
            defaultDomain: this.defaultDomain,
            domainMapping: this.domainMapping,
            siteKeyMapping: this.siteKeyMapping,
            domainPublicUrlMapping: this.domainPublicUrlMapping,
            domainCdnMapping: this.domainCdnMapping,
            defaultPublicUrl: this.config.publicUrl,
            templateExtensions: this.templateExtensions,
            entitiesConfig: this.entitiesConfig,
            cacheManager: this.cacheManager,
            handleFrontendTemplateReload: this.templateReloader.handleFrontendTemplateReload.bind(this.templateReloader)
        });
        return await this.frontend.initialize();
    }
}

module.exports.Manager = Manager;
