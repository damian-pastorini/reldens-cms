/**
 *
 * Reldens - CMS - Manager
 *
 */

const { TemplatesList } = require('./templates-list');
const { AdminTemplatesLoader } = require('./admin-templates-loader');
const { MimeTypes } = require('./mime-types');
const { AllowedExtensions } = require('./allowed-extensions');
const { TemplatesToPathMapper } = require('./templates-to-path-mapper');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { CmsPagesRouteManager } = require('./cms-pages-route-manager');
const { Installer } = require('./installer');
const { CacheManager } = require('./cache/cache-manager');
const { TemplateReloader } = require('./template-reloader');
const { ManagerComponentValidator } = require('./manager-component-validator');
const { ManagerConfigLoader } = require('./manager-config-loader');
const { ManagerServicesInitializer } = require('./manager-services-initializer');
const { EventsManagerSingleton, Logger, sc } = require('@reldens/utils');
const { AppServerFactory, FileHandler } = require('@reldens/server-utils');
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
        this.config = ManagerConfigLoader.loadFromEnv();
        this.adminTranslations = sc.get(props, 'adminTranslations', {});
        this.adminEntities = sc.get(props, 'adminEntities', {});
        this.rawRegisteredEntities = sc.get(props, 'rawRegisteredEntities', {});
        this.entitiesTranslations = sc.get(props, 'entitiesTranslations', {});
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.entitiesConfigOverride = sc.get(props, 'entitiesConfigOverride', {});
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
        this.templateExtensions = sc.get(
            props,
            'templateExtensions',
            ['.html', '.mustache', '.template', '.txt', '.xml', '.json']
        );
        this.cache = sc.get(props, 'cache', false);
        this.reloadTime = sc.get(props, 'reloadTime', 0);
        this.app = sc.get(props, 'app', false);
        this.appServer = sc.get(props, 'appServer', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.adminManager = sc.get(props, 'adminManager', false);
        this.frontend = sc.get(props, 'frontend', false);
        this.renderEngine = sc.get(props, 'renderEngine', mustache);
        this.prismaModules = sc.get(props, 'prismaModules', false);
        this.prismaAdapter = sc.get(props, 'prismaAdapter', this.config.database.prismaAdapter);
        this.prismaAdapterClass = sc.get(props, 'prismaAdapterClass', this.config.database.prismaAdapterClass);
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
        this.cacheManager = new CacheManager({
            projectRoot: this.projectRoot,
            enabled: this.cache,
            domainMapping: this.domainMapping
        });
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
            prismaModules: this.prismaModules,
            prismaAdapter: this.prismaAdapter,
            prismaAdapterClass: this.prismaAdapterClass,
            postInstallCallback: this.initializeCmsAfterInstall.bind(this)
        });
        this.servicesInitializer = new ManagerServicesInitializer(this);
        this.useProvidedServer = ManagerComponentValidator.validateProvidedServer(this.app, this.appServer);
        this.useProvidedDataServer = ManagerComponentValidator.validateProvidedDataServer(this.dataServer);
        this.useProvidedAdminManager = ManagerComponentValidator.validateProvidedAdminManager(this.adminManager);
        this.useProvidedFrontend = ManagerComponentValidator.validateProvidedFrontend(this.frontend);
        this.cmsPagesRouteManager = new CmsPagesRouteManager({
            dataServer: this.dataServer,
            events: this.events
        });
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
            await this.servicesInitializer.initializeServices();
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

    isCdnUrlInDirectives(cdnUrlWithProtocol, cdnHostname)
    {
        let directiveKeys = Object.keys(this.developmentExternalDomains);
        for(let directiveKey of directiveKeys){
            let domains = this.developmentExternalDomains[directiveKey];
            if(!sc.isArray(domains)){
                continue;
            }
            if(domains.includes(cdnUrlWithProtocol) || domains.includes(cdnHostname)){
                return true;
            }
        }
        return false;
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
            if(!this.isCdnUrlInDirectives(cdnUrlWithProtocol, cdnHostname)){
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
            this.rawRegisteredEntities = props.loadedEntities.rawRegisteredEntities;
            this.entitiesTranslations = props.loadedEntities.entitiesTranslations;
            this.entitiesConfig = props.loadedEntities.entitiesConfig;
            this.config = props.mappedVariablesForConfig;
            if(props.dataServer){
                this.dataServer = props.dataServer;
                this.useProvidedDataServer = true;
            }
            let servicesResult = await this.servicesInitializer.initializeServices();
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
}

module.exports.Manager = Manager;
