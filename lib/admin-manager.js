/**
 *
 * Reldens - AdminManager
 *
 */

const { UploaderFactory } = require('@reldens/server-utils');
const { ValidatorInterface, Logger, sc } = require('@reldens/utils');
const { ContentsBuilder } = require('./admin-manager/contents-builder');
const { Router } = require('./admin-manager/router');
const { RouterContents } = require('./admin-manager/router-contents');
const { CacheRoutesHandler } = require('./cache/cache-routes-handler');
const { AddCacheButtonSubscriber } = require('./cache/add-cache-button-subscriber');

class AdminManager
{

    constructor(configData)
    {
        this.events = configData?.events;
        this.renderCallback = configData?.renderCallback;
        this.dataServer = configData?.dataServer;
        this.authenticationCallback = configData?.authenticationCallback;
        this.app = configData?.app;
        this.applicationFramework = configData?.appServerFactory?.applicationFramework;
        this.bodyParser = configData?.appServerFactory?.bodyParser;
        this.session = configData?.appServerFactory?.session;
        this.validator = configData?.validator;
        this.buckets = sc.get(configData, 'buckets', {});
        this.translations = sc.get(configData, 'translations', {});
        this.adminFilesContents = sc.get(configData, 'adminFilesContents', false);
        this.secret = sc.get(configData, 'secret', '');
        this.rootPath = sc.get(configData, 'rootPath', '');
        this.adminRoleId = sc.get(configData, 'adminRoleId', 0);
        this.buildAdminCssOnActivation = sc.get(configData, 'buildAdminCssOnActivation', false);
        this.buildAdminScriptsOnActivation = sc.get(configData, 'buildAdminScriptsOnActivation', false);
        this.updateAdminAssetsDistOnActivation = sc.get(configData, 'updateAdminAssetsDistOnActivation', false);
        this.stylesFilePath = sc.get(configData, 'stylesFilePath', '');
        this.scriptsFilePath = sc.get(configData, 'scriptsFilePath', '');
        this.autoSyncDistCallback = sc.get(configData, 'autoSyncDistCallback', false);
        this.branding = sc.get(configData, 'branding', {});
        this.entities = sc.get(configData, 'entities', {});
        this.cacheManager = sc.get(configData, 'cacheManager', false);
        this.logoutPath = '/logout';
        this.loginPath = '/login';
        this.viewPath = '/view';
        this.editPath = '/edit';
        this.savePath = '/save';
        this.deletePath = '/delete';
        this.mimeTypes = sc.get(configData, 'mimeTypes', false);
        this.allowedExtensions = sc.get(configData, 'allowedExtensions', false);
        this.uploaderFactory = sc.get(configData, 'uploaderFactory', new UploaderFactory({
            mimeTypes: this.mimeTypes,
            allowedExtensions: this.allowedExtensions,
            applySecureFileNames: sc.get(configData, 'applySecureFileNames', false)
        }));
        this.blackList = {};
        this.emitEvent = (eventName, eventData = {}) => this.events.emit(eventName, {adminManager: this, ...eventData});
        this.contentsBuilder = new ContentsBuilder({
            renderCallback: this.renderCallback,
            adminFilesContents: this.adminFilesContents,
            stylesFilePath: this.stylesFilePath,
            scriptsFilePath: this.scriptsFilePath,
            rootPath: this.rootPath,
            branding: this.branding,
            translations: this.translations,
            resources: () => this.resources,
            buildAdminCssOnActivation: this.buildAdminCssOnActivation,
            buildAdminScriptsOnActivation: this.buildAdminScriptsOnActivation,
            updateAdminAssetsDistOnActivation: this.updateAdminAssetsDistOnActivation,
            emitEvent: this.emitEvent,
            editPath: this.editPath,
            savePath: this.savePath,
            deletePath: this.deletePath,
            fetchUploadProperties: this.fetchUploadProperties.bind(this),
            fetchTranslation: this.fetchTranslation.bind(this),
            fetchEntityIdPropertyKey: this.fetchEntityIdPropertyKey.bind(this)
        });
        this.router = new Router({
            app: this.app,
            applicationFramework: this.applicationFramework,
            bodyParser: this.bodyParser,
            session: this.session,
            secret: this.secret,
            rootPath: this.rootPath,
            adminRoleId: this.adminRoleId,
            authenticationCallback: this.authenticationCallback,
            uploaderFactory: this.uploaderFactory,
            buckets: this.buckets,
            blackList: this.blackList,
            loginPath: this.loginPath,
            logoutPath: this.logoutPath,
            viewPath: this.viewPath,
            editPath: this.editPath,
            savePath: this.savePath,
            deletePath: this.deletePath,
            resources: () => this.resources,
            emitEvent: this.emitEvent,
            fetchUploadProperties: this.fetchUploadProperties.bind(this),
            adminContents: () => this.contentsBuilder.adminContents,
            generateListRouteContent: (...args) => this.routerContents.generateListRouteContent(...args),
            generateViewRouteContent: (...args) => this.routerContents.generateViewRouteContent(...args),
            generateEditRouteContent: (...args) => this.routerContents.generateEditRouteContent(...args),
            processDeleteEntities: (...args) => this.routerContents.processDeleteEntities(...args),
            processSaveEntity: (...args) => this.routerContents.processSaveEntity(...args)
        });
        this.routerContents = new RouterContents({
            dataServer: this.dataServer,
            translations: this.translations,
            rootPath: this.rootPath,
            relations: () => this.relations,
            resourcesByReference: () => this.resourcesByReference,
            adminFilesContents: this.adminFilesContents,
            autoSyncDistCallback: this.autoSyncDistCallback,
            viewPath: this.viewPath,
            editPath: this.editPath,
            deletePath: this.deletePath,
            emitEvent: (eventName, eventData = {}) => this.events.emit(eventName, {adminManager: this, ...eventData}),
            adminContentsRender: (...args) => this.contentsBuilder.render(...args),
            adminContentsRenderRoute: (...args) => this.contentsBuilder.renderRoute(...args),
            adminContentsEntities: () => this.contentsBuilder.adminContents.entities,
            adminContentsSideBar: () => this.contentsBuilder.adminContents.sideBar,
            fetchTranslation: this.fetchTranslation.bind(this),
            fetchEntityIdPropertyKey: this.fetchEntityIdPropertyKey.bind(this),
            fetchUploadProperties: this.fetchUploadProperties.bind(this)
        });
        this.cacheRoutesHandler = new CacheRoutesHandler({
            router: this.router,
            rootPath: this.rootPath,
            dataServer: this.dataServer,
            cacheManager: this.cacheManager
        });
        this.addCacheButtonSubscriber = new AddCacheButtonSubscriber({
            events: this.events,
            cacheManager: this.cacheManager,
            renderCallback: this.renderCallback,
            cacheCleanButton: this.adminFilesContents.cacheCleanButton,
            translations: this.translations,
            cacheCleanRoute: this.cacheRoutesHandler.cacheCleanRoute
        });
    }

    async setupAdmin()
    {
        if(this.validator instanceof ValidatorInterface && !this.validator.validate(this)){
            return false;
        }
        this.resourcesByReference = {};
        this.resources = this.prepareResources(this.entities);
        this.relations = this.prepareRelations(this.entities);
        await this.contentsBuilder.buildAdminContents();
        await this.contentsBuilder.buildAdminScripts();
        await this.contentsBuilder.buildAdminCss();
        await this.contentsBuilder.updateAdminAssets();
        await this.events.emit('reldens.setupAdminRouter', {adminManager: this});
        this.router.setupAdminRoutes();
        await this.events.emit('reldens.setupAdminRoutes', {adminManager: this});
        await this.router.setupEntitiesRoutes();
        await this.events.emit('reldens.setupAdminManagers', {adminManager: this});
    }

    prepareResources(rawResources)
    {
        let rawResourcesKeys = Object.keys(rawResources);
        if(!rawResources || 0 === rawResourcesKeys.length){
            return [];
        }
        let registeredResources = [];
        for(let i of rawResourcesKeys){
            let rawResource = rawResources[i];
            let tableName = rawResource.rawEntity.tableName();
            let driverResource = {
                id: () => {
                    return tableName;
                },
                entityKey: i,
                entityPath: (tableName.replace(/_/g, '-')),
                options: {
                    navigation: sc.hasOwn(rawResource.config, 'parentItemLabel') ? {
                        name: rawResource.config.parentItemLabel,
                        icon: rawResource.config.icon || 'List'
                    } : null,
                    listProperties: rawResource.config.listProperties || [],
                    showProperties: rawResource.config.showProperties || [],
                    filterProperties: rawResource.config.filterProperties || [],
                    editProperties: rawResource.config.editProperties || [],
                    properties: rawResource.config.properties || {},
                    titleProperty: sc.get(rawResource.config, 'titleProperty', null),
                    sort: sc.get(rawResource.config, 'sort', null),
                    navigationPosition: sc.get(rawResource.config, 'navigationPosition', 2000)
                },
            };
            this.resourcesByReference[tableName] = driverResource;
            registeredResources.push(driverResource);
        }
        registeredResources.sort((a, b) => a.options.navigationPosition - b.options.navigationPosition);
        return registeredResources;
    }

    prepareRelations()
    {
        let registeredRelations = {};
        for(let resource of this.resources){
            for(let propertyKey of Object.keys(resource.options.properties)){
                let property = resource.options.properties[propertyKey];
                if('reference' !== property.type){
                    continue;
                }
                let relationResource = this.resources.filter((resource) => {
                    return resource.id() === property.reference;
                }).shift();
                let relationKey = property.alias || property.reference;
                let titleProperty = relationResource?.options?.titleProperty;
                if(!titleProperty){
                    continue;
                }
                if(!registeredRelations[property.reference]){
                    registeredRelations[property.reference] = {};
                }
                registeredRelations[property.reference][relationKey] = titleProperty;
            }
        }
        return registeredRelations;
    }

    fetchUploadProperties(driverResource)
    {
        if(!driverResource.options.uploadProperties){
            driverResource.options.uploadProperties = {};
            for(let propertyKey of Object.keys(driverResource.options.properties)){
                let property = driverResource.options.properties[propertyKey];
                if(property.isUpload){
                    driverResource.options.uploadProperties[propertyKey] = property;
                }
            }
        }
        return driverResource.options.uploadProperties;
    }

    fetchEntityIdPropertyKey(driverResource)
    {
        let resourceProperties = driverResource.options?.properties;
        if(!resourceProperties){
            Logger.error('Property "ID" not found.', resourceProperties);
            return  '';
        }
        if(resourceProperties['id']){
            return 'id';
        }
        let idProperty = '';
        let idProperties = Object.keys(resourceProperties).filter((propertyKey) => {
            return resourceProperties[propertyKey].isId;
        });
        if(0 < idProperties.length){
            idProperty = idProperties.shift();
        }
        return idProperty;
    }

    fetchTranslation(snippet, group)
    {
        if('' === snippet){
            return snippet;
        }
        let translationGroup = sc.get(this.translations, group);
        if(translationGroup){
            let translationByGroup = sc.get(translationGroup, snippet, '');
            if('' !== translationByGroup){
                return translationByGroup;
            }
        }
        return sc.get(this.translations, snippet, snippet);
    }

}

module.exports.AdminManager = AdminManager;
