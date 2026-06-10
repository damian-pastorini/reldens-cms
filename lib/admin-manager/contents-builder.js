/**
 *
 * Reldens - ContentsBuilder
 *
 */

const { sc } = require('@reldens/utils');

class ContentsBuilder
{

    constructor(props)
    {
        this.renderCallback = props.renderCallback;
        this.adminFilesContents = props.adminFilesContents;
        this.stylesFilePath = props.stylesFilePath;
        this.scriptsFilePath = props.scriptsFilePath;
        this.rootPath = props.rootPath;
        this.branding = props.branding;
        this.translations = props.translations;
        this.resources = props.resources;
        this.buildAdminCssOnActivation = props.buildAdminCssOnActivation;
        this.buildAdminScriptsOnActivation = props.buildAdminScriptsOnActivation;
        this.updateAdminAssetsDistOnActivation = props.updateAdminAssetsDistOnActivation;
        this.emitEvent = props.emitEvent;
        this.editPath = props.editPath;
        this.savePath = props.savePath;
        this.deletePath = props.deletePath;
        this.fetchUploadProperties = props.fetchUploadProperties;
        this.fetchTranslation = props.fetchTranslation;
        this.fetchEntityIdPropertyKey = props.fetchEntityIdPropertyKey;
        this.adminContents = {};
    }

    async buildAdminContents()
    {
        this.adminContents.layout = await this.buildLayout();
        this.adminContents.sideBar = await this.buildSideBar();
        this.adminContents.login = await this.renderRoute(this.adminFilesContents.login, '');
        this.adminContents.dashboard = await this.renderRoute(
            this.adminFilesContents.dashboard,
            this.adminContents.sideBar
        );
        this.adminContents.entities = await this.buildEntitiesContents();
        await this.emitEvent('reldens.buildAdminContentsAfter');
        return this.adminContents;
    }

    async buildLayout()
    {
        return await this.render(
            this.adminFilesContents.layout,
            {
                sideBar: '{{&sideBar}}',
                pageContent: '{{&pageContent}}',
                stylesFilePath: this.stylesFilePath,
                scriptsFilePath: this.scriptsFilePath,
                rootPath: this.rootPath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight
            }
        );
    }

    async buildSideBar()
    {
        let navigationContents = {};
        let eventBuildSideBarBefore = {navigationContents};
        await this.emitEvent('reldens.eventBuildSideBarBefore', eventBuildSideBarBefore);
        navigationContents = eventBuildSideBarBefore.navigationContents;
        for(let driverResource of this.resources()){
            let navigation = driverResource.options?.navigation;
            let name = this.translations.labels[driverResource.id()]
                || this.translations.labels[driverResource.entityKey];
            let path = this.rootPath+'/'+(driverResource.id().replace(/_/g, '-'));
            if(navigation?.name){
                if(!navigationContents[navigation.name]){
                    navigationContents[navigation.name] = {};
                }
                navigationContents[navigation.name][driverResource.id()] = await this.render(
                    this.adminFilesContents.sideBarItem,
                    {name, path}
                );
                continue;
            }
            navigationContents[driverResource.id()] = await this.render(
                this.adminFilesContents.sideBarItem,
                {name, path}
            );
        }
        let eventAdminSideBarBeforeSubItems = {navigationContents};
        await this.emitEvent('reldens.adminSideBarBeforeSubItems', eventAdminSideBarBeforeSubItems);
        let navigationView = '';
        for(let id of Object.keys(navigationContents)){
            if(sc.isObject(navigationContents[id])){
                let subItems = '';
                for(let subId of Object.keys(navigationContents[id])){
                    subItems += navigationContents[id][subId];
                }
                navigationView += await this.render(this.adminFilesContents.sideBarHeader, {name: id, subItems});
                continue;
            }
            navigationView += navigationContents[id];
        }
        let eventAdminSideBarBeforeRender = {navigationContents, navigationView};
        await this.emitEvent('reldens.adminSideBarBeforeRender', eventAdminSideBarBeforeRender);
        return await this.render(
            this.adminFilesContents.sideBar,
            {
                rootPath: this.rootPath,
                navigationView: eventAdminSideBarBeforeRender.navigationView
            }
        );
    }

    async buildEntitiesContents()
    {
        let entitiesContents = {};
        for(let driverResource of this.resources()){
            let templateTitle = this.translations.labels[driverResource.id()];
            let entityName = (driverResource.id().replace(/_/g, '-'));
            let entityListRoute = this.rootPath+'/'+entityName;
            let entityEditRoute = entityListRoute+this.editPath;
            let entitySaveRoute = entityListRoute+this.savePath;
            let entityDeleteRoute = entityListRoute+this.deletePath;
            let uploadProperties = this.fetchUploadProperties(driverResource);
            let multipartFormData = 0 < Object.keys(uploadProperties).length ? ' enctype="multipart/form-data"' : '';
            let idProperty = this.fetchEntityIdPropertyKey(driverResource);
            let editProperties = Object.keys(driverResource.options.properties);
            editProperties.splice(editProperties.indexOf(idProperty), 1);
            let entityId = driverResource.id();
            let filters = driverResource.options.filterProperties.map((property) => {
                return {
                    propertyKey: property,
                    name: this.fetchTranslation(property, entityId),
                    value: '{{&'+property+'}}'
                };
            });
            let fields = driverResource.options.showProperties.map((property) => {
                return {
                    propertyKey: property,
                    name: this.fetchTranslation(property, entityId),
                    value: '{{&'+property+'}}'
                };
            });
            let editFields = editProperties.map((property) => {
                return {
                    name: this.fetchTranslation(property, entityId),
                    value: '{{&'+property+'}}'
                };
            });
            let sectionsContents = this.adminFilesContents?.sections;
            let extraContentForList = sc.get(sectionsContents?.list, driverResource.entityPath, '');
            let extraContentForView = await this.render(
                sc.get(sectionsContents?.view, driverResource.entityPath, ''),
                {
                    id: '{{&id}}',
                    entitySerializedData: '{{&entitySerializedData}}'
                }
            );
            let extraFormContentForView = sc.get(sectionsContents?.viewForm, driverResource.entityPath, '');
            let extraContentForEdit = sc.get(sectionsContents?.edit, driverResource.entityPath, '');
            let extraFormContentForEdit = sc.get(sectionsContents?.editForm, driverResource.entityPath, '');
            entitiesContents[entityName] = {
                list: await this.render(
                    this.adminFilesContents.list,
                    {
                        entityName,
                        templateTitle,
                        entityListRoute,
                        entityEditRoute,
                        entityFilterTermValue: '{{&entityFilterTermValue}}',
                        filters,
                        list: '{{&list}}',
                        pagination: '{{&pagination}}',
                        extraContent: '{{&extraContentForList}}'+extraContentForList,
                    }
                ),
                view: await this.render(
                    this.adminFilesContents.view,
                    {
                        entityName,
                        templateTitle,
                        entityDeleteRoute,
                        entityListRoute,
                        fields,
                        id: '{{&id}}',
                        entityEditRoute: '{{&entityEditRoute}}',
                        entityNewRoute: '{{&entityNewRoute}}',
                        extraContentTop: '{{&extraContentForViewTop}}',
                        extraContentBottom: '{{&extraContentForViewBottom}}'+extraContentForView,
                        extraFormContent: '{{&extraFormContentForView}}'+extraFormContentForView
                    }
                ),
                edit: await this.render(
                    this.adminFilesContents.edit,
                    {
                        entityName,
                        entitySaveRoute,
                        multipartFormData,
                        editFields,
                        idValue: '{{&idValue}}',
                        idProperty: '{{&idProperty}}',
                        templateTitle: '{{&templateTitle}}',
                        entityViewRoute: '{{&entityViewRoute}}',
                        extraContent: '{{&extraContentForEdit}}'+extraContentForEdit,
                        extraFormContent: '{{&extraFormContentForEdit}}'+extraFormContentForEdit
                    }
                )
            };
        }
        return entitiesContents;
    }

    async render(content, params)
    {
        return await this.renderCallback(content, params);
    }

    async renderRoute(pageContent, sideBar)
    {
        return await this.render(
            this.adminContents.layout,
            {
                stylesFilePath: this.stylesFilePath,
                scriptsFilePath: this.scriptsFilePath,
                brandingCompanyName: this.branding.companyName,
                copyRight: this.branding.copyRight,
                pageContent,
                sideBar
            }
        );
    }

    async buildAdminScripts()
    {
        if(!sc.isFunction(this.buildAdminScriptsOnActivation)){
            return false;
        }
        return this.buildAdminScriptsOnActivation();
    }

    async updateAdminAssets()
    {
        if(!sc.isFunction(this.updateAdminAssetsDistOnActivation)){
            return false;
        }
        return this.updateAdminAssetsDistOnActivation();
    }

    async buildAdminCss()
    {
        if(!sc.isFunction(this.buildAdminCssOnActivation)){
            return false;
        }
        return this.buildAdminCssOnActivation();
    }

}

module.exports.ContentsBuilder = ContentsBuilder;
