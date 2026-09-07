/**
 *
 * Reldens - CMS - Manager Services Initializer
 *
 */

const { DefaultTranslations } = require('./admin-manager/default-translations');
const { AdminTemplatesLoader } = require('./admin-templates-loader');
const { AdminManagerValidator } = require('./admin-manager-validator');
const { LoadedEntitiesProcessor } = require('./loaded-entities-processor');
const { EntitiesConfigProcessor } = require('./entities-config-processor');
const { AdminManager } = require('./admin-manager');
const { Frontend } = require('./frontend');
const { SitemapLoader } = require('./sitemap-loader');
const { PasswordEncryptionHandler } = require('./password-encryption-handler');
const { Logger, sc } = require('@reldens/utils');
const { DriversMap, PrismaClientLoader } = require('@reldens/storage');
const { FileHandler, Encryptor } = require('@reldens/server-utils');

class ManagerServicesInitializer
{

    constructor(manager)
    {
        this.manager = manager;
    }

    async initializeServices()
    {
        this.manager.events.emit('reldens.cmsManagerInitializeServices', {manager: this.manager});
        if(!this.manager.useProvidedDataServer){
            if(!await this.initializeDataServer()){
                Logger.debug('Initialize Data Server failed.');
                return false;
            }
        }
        if(0 < Object.keys(this.manager.entityAccess).length){
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
        if(!this.manager.useProvidedAdminManager){
            if(!await this.initializeAdminManager()){
                Logger.debug('Initialize Admin Manager failed.');
                return false;
            }
        }
        if(!await this.initializeCmsPagesRouteManager()){
            Logger.debug('Initialize CMS Pages Route Manager failed.');
            return false;
        }
        if(!this.manager.useProvidedFrontend){
            if(!await this.initializeFrontend()){
                Logger.debug('Initialize Frontend failed.');
                return false;
            }
        }
        this.manager.sitemapLoader = new SitemapLoader({
            dataServer: this.manager.dataServer,
            events: this.manager.events,
            domainMapping: this.manager.domainMapping
        });
        if(!this.manager.useProvidedServer){
            await this.manager.appServer.listen(this.manager.config.port);
        }
        Logger.debug('Initialize Services successfully.');
        return true;
    }

    async setupEntityAccess()
    {
        let accessEntity = this.manager.dataServer.getEntity('entitiesAccess');
        if(!accessEntity){
            Logger.warning('Entities Access not found.');
            return;
        }
        for(let entityName of Object.keys(this.manager.entityAccess)){
            let accessConfig = this.manager.entityAccess[entityName];
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
        if(0 === Object.keys(this.manager.processedEntities).length){
            let mergedConfig = EntitiesConfigProcessor.applyOverrides(
                this.manager.entitiesConfig,
                this.manager.entitiesConfigOverride,
                {projectRoot: this.manager.projectRoot}
            );
            this.manager.processedEntities = LoadedEntitiesProcessor.process(
                this.manager.rawRegisteredEntities,
                this.manager.entitiesTranslations,
                mergedConfig
            );
        }
        if(!this.manager.processedEntities?.entities){
            Logger.critical('Processed entities undefined.');
            return false;
        }
        return true;
    }

    async generateAdminEntities()
    {
        if(0 < Object.keys(this.manager.adminEntities).length){
            return true;
        }
        if(!this.manager.dataServer.rawEntities && this.manager.rawRegisteredEntities){
            this.manager.dataServer.rawEntities = this.manager.rawRegisteredEntities;
        }
        Logger.debug('Generate entities count: '+Object.keys(this.manager.rawRegisteredEntities).length);
        await this.manager.dataServer.generateEntities();
        this.manager.adminEntities = this.manager.adminEntitiesGenerator.generate(
            this.manager.processedEntities.entities,
            this.manager.dataServer.entityManager.entities
        );
        if(0 === Object.keys(this.manager.adminEntities).length){
            Logger.critical('Admin entities generation failed - no entities available.');
            Logger.critical('CMS cannot start without admin entities.');
            return false;
        }
        return true;
    }

    static loadPrismaModules(projectRoot, clientPath, connectionData, adapterPackage, adapterClass)
    {
        let adapterPath = FileHandler.joinPaths(projectRoot, 'node_modules', adapterPackage);
        if(!FileHandler.exists(adapterPath)){
            Logger.critical('Prisma adapter not found: '+adapterPath+'. Run: npm install prisma @prisma/client '+adapterPackage);
            return false;
        }
        let adapterModule = require(adapterPath);
        if(!sc.isFunction(adapterModule[adapterClass])){
            Logger.critical('Prisma adapter class "'+adapterClass+'" not exported by: '+adapterPath);
            return false;
        }
        return PrismaClientLoader.load(projectRoot, clientPath, connectionData, {
            PrismaAdapter: adapterModule[adapterClass]
        }) || false;
    }

    async initializeDataServer()
    {
        let dbConfig = {
            client: this.manager.config.database.client,
            config: {
                host: this.manager.config.database.host,
                port: this.manager.config.database.port,
                database: this.manager.config.database.name,
                user: this.manager.config.database.user,
                password: this.manager.config.database.password
            },
            rawEntities: this.manager.rawRegisteredEntities,
            entitiesConfig: this.manager.entitiesConfig
        };
        let driverClass = DriversMap[this.manager.config.database.driver];
        if(!driverClass){
            Logger.critical('Invalid database driver: '+this.manager.config.database.driver);
            return false;
        }
        if('prisma' === this.manager.config.database.driver){
            if(!this.manager.prismaModules){
                this.manager.prismaModules = ManagerServicesInitializer.loadPrismaModules(
                    this.manager.projectRoot,
                    null,
                    {
                        client: this.manager.config.database.client,
                        user: this.manager.config.database.user,
                        password: this.manager.config.database.password,
                        host: this.manager.config.database.host,
                        port: this.manager.config.database.port,
                        database: this.manager.config.database.name
                    },
                    this.manager.prismaAdapter,
                    this.manager.prismaAdapterClass
                );
                if(!this.manager.prismaModules){
                    Logger.critical('Failed to load Prisma modules via PrismaClientLoader.');
                    return false;
                }
            }
            dbConfig.prismaModules = this.manager.prismaModules;
        }
        this.manager.dataServer = new driverClass(dbConfig);
        if(!await this.manager.dataServer.connect()){
            Logger.critical('Failed to connect to database.');
            return false;
        }
        Logger.debug('Entities count: '+Object.keys(this.manager.rawRegisteredEntities).length);
        await this.manager.dataServer.generateEntities();
        return true;
    }

    async initializeAdminManager()
    {
        let authenticationCallback = this.manager.authenticationCallback;
        if('db-users' === this.manager.authenticationMethod && !authenticationCallback){
            authenticationCallback = async (email, password, roleId) => {
                Logger.debug('Running default "db-users" authentication.');
                let usersEntity = this.manager.dataServer.getEntity('users');
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
        this.manager.templateReloader.trackTemplateFiles(this.manager.mappedAdminTemplates);
        let adminFilesContents = await AdminTemplatesLoader.fetchAdminFilesContents(this.manager.mappedAdminTemplates);
        let translations = sc.deepMergeProperties(
            sc.deepMergeProperties({}, DefaultTranslations),
            sc.deepMergeProperties(this.manager.entitiesTranslations, this.manager.adminTranslations)
        );
        this.manager.events.emit('reldens.manager.initializeAdminManager', {
            manager: this.manager,
            authenticationCallback,
            adminFilesContents,
            translations
        });
        this.initializePasswordEncryptionHandler();
        let adminConfig = {
            events: this.manager.events,
            dataServer: this.manager.dataServer,
            authenticationCallback,
            app: this.manager.app,
            appServerFactory: this.manager.appServerFactory,
            entities: this.manager.adminEntities,
            validator: new AdminManagerValidator(),
            renderCallback: this.renderCallback.bind(this),
            secret: this.manager.config.adminSecret,
            rootPath: this.manager.config.adminPath,
            translations,
            adminFilesContents,
            mimeTypes: this.manager.mimeTypes,
            allowedExtensions: this.manager.allowedExtensions,
            adminRoleId: this.manager.adminRoleId,
            stylesFilePath: this.manager.stylesFilePath,
            scriptsFilePath: this.manager.scriptsFilePath,
            cacheManager: this.manager.cacheManager,
            branding: {
                companyName: this.manager.companyName,
                logo: this.manager.logo,
                favicon: this.manager.favicon,
                copyRight: await FileHandler.fetchFileContents(
                    FileHandler.joinPaths(
                        this.manager.projectAdminTemplatesPath,
                        this.manager.adminTemplatesList.defaultCopyRight
                    )
                )
            }
        };
        this.manager.adminManager = new AdminManager(adminConfig);
        this.manager.adminManager.router.checkAndReloadAdminTemplates = async () => {
            return await this.manager.templateReloader.handleAdminTemplateReload(this.manager.adminManager);
        };
        await this.manager.adminManager.setupAdmin();
        return true;
    }

    initializePasswordEncryptionHandler()
    {
        if(!this.manager.enablePasswordEncryption){
            Logger.debug('Password encryption handler is disabled.');
            return false;
        }
        this.manager.passwordEncryptionHandler = new PasswordEncryptionHandler({
            events: this.manager.events,
            enabled: this.manager.enablePasswordEncryption
        });
        this.manager.passwordEncryptionHandler.registerEventListeners();
        Logger.debug('Password encryption handler initialized and registered.');
        return true;
    }

    async initializeCmsPagesRouteManager()
    {
        if(!this.manager.dataServer){
            Logger.warning('CmsPagesRouteManager initialization skipped - missing dataServer.');
            return false;
        }
        this.manager.cmsPagesRouteManager.dataServer = this.manager.dataServer;
        Logger.debug('CmsPagesRouteManager initialized successfully');
        return true;
    }

    async renderCallback(template, params = {})
    {
        if(!template){
            return '';
        }
        return this.manager.renderEngine.render(template, params);
    }

    async initializeFrontend()
    {
        this.manager.frontend = new Frontend({
            app: this.manager.app,
            dataServer: this.manager.dataServer,
            events: this.manager.events,
            renderEngine: this.manager.renderEngine,
            projectRoot: this.manager.projectRoot,
            appServerFactory: this.manager.appServerFactory,
            defaultDomain: this.manager.defaultDomain,
            domainMapping: this.manager.domainMapping,
            siteKeyMapping: this.manager.siteKeyMapping,
            domainPublicUrlMapping: this.manager.domainPublicUrlMapping,
            domainCdnMapping: this.manager.domainCdnMapping,
            defaultPublicUrl: this.manager.config.publicUrl,
            templateExtensions: this.manager.templateExtensions,
            entitiesConfig: this.manager.entitiesConfig,
            cacheManager: this.manager.cacheManager,
            handleFrontendTemplateReload: this.manager.templateReloader.handleFrontendTemplateReload.bind(
                this.manager.templateReloader
            )
        });
        return await this.manager.frontend.initialize();
    }
}

module.exports.ManagerServicesInitializer = ManagerServicesInitializer;
