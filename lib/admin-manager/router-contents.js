/**
 *
 * Reldens - RouterContents
 *
 */

const { PageRangeProvider, Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const { AdminFiltersManager } = require('./admin-filters-manager');

class RouterContents
{

    constructor(props)
    {
        this.dataServer = props.dataServer;
        this.translations = props.translations;
        this.rootPath = props.rootPath;
        this.relations = props.relations;
        this.resourcesByReference = props.resourcesByReference;
        this.adminFilesContents = props.adminFilesContents;
        this.autoSyncDistCallback = props.autoSyncDistCallback;
        this.viewPath = props.viewPath;
        this.editPath = props.editPath;
        this.deletePath = props.deletePath;
        this.emitEvent = props.emitEvent;
        this.adminContentsRender = props.adminContentsRender;
        this.adminContentsRenderRoute = props.adminContentsRenderRoute;
        this.adminContentsEntities = props.adminContentsEntities;
        this.adminContentsSideBar = props.adminContentsSideBar;
        this.fetchTranslation = props.fetchTranslation;
        this.fetchEntityIdPropertyKey = props.fetchEntityIdPropertyKey;
        this.fetchUploadProperties = props.fetchUploadProperties;
        this.uploaderFactory = props.uploaderFactory;
        this.filtersManager = new AdminFiltersManager();
        this.passwordFieldNames = props.passwordFieldNames || ['password'];
    }

    async generateListRouteContent(req, driverResource, entityPath)
    {
        let currentPage = Number(req?.query?.page || 1);
        let pageSize = Number(req?.query?.pageSize || 25);
        let shouldClearFilters = 'true' === req?.query?.clearFilters;
        let sessionFilters = this.filtersManager.getFiltersFromSession(req, entityPath);
        let sessionSorting = this.filtersManager.getSortingFromSession(req, entityPath);
        let filtersFromParams = shouldClearFilters ? {} : req?.body?.filters || req?.query?.filters || {};
        let entityFilterTerm = shouldClearFilters ? '' : sc.get(req?.body, 'entityFilterTerm', '');
        let sortByFromParams = shouldClearFilters ? '' : sc.get(req?.body, 'sortBy', sc.get(req?.query, 'sortBy', ''));
        let sortDirectionFromParams = shouldClearFilters ? '' : sc.get(req?.body, 'sortDirection', sc.get(req?.query, 'sortDirection', ''));
        if(shouldClearFilters){
            this.filtersManager.clearFiltersFromSession(req, entityPath);
            this.filtersManager.clearSortingFromSession(req, entityPath);
        }
        let hasNewEntityFilterTerm = entityFilterTerm && '' !== entityFilterTerm;
        let hasNewToggleFilters = Object.keys(filtersFromParams).length > 0;
        if(hasNewEntityFilterTerm && hasNewToggleFilters){
            filtersFromParams = {};
            hasNewToggleFilters = false;
        }
        if(hasNewEntityFilterTerm || hasNewToggleFilters){
            let filtersToSave = {
                regular: hasNewToggleFilters ? filtersFromParams : {},
                entityFilterTerm: hasNewEntityFilterTerm ? entityFilterTerm : ''
            };
            this.filtersManager.saveFiltersToSession(req, entityPath, filtersToSave);
            sessionFilters = filtersToSave;
        }
        if(sortByFromParams && sortDirectionFromParams){
            this.filtersManager.saveSortingToSession(req, entityPath, sortByFromParams, sortDirectionFromParams);
            sessionSorting = {sortBy: sortByFromParams, sortDirection: sortDirectionFromParams};
        }
        let mergedFilters = shouldClearFilters ? {} : Object.assign({}, sessionFilters.regular || {});
        let finalEntityFilterTerm = shouldClearFilters ? '' : sessionFilters.entityFilterTerm || '';
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let finalSortBy = sessionSorting.sortBy || idProperty;
        let finalSortDirection = sessionSorting.sortDirection || 'ASC';
        let filters = this.filtersManager.prepareFilters(mergedFilters, driverResource);
        let textFilters = this.filtersManager.prepareTextFilters(finalEntityFilterTerm, driverResource);
        let combinedFilters = this.filtersManager.combineFilters(filters, textFilters);
        let totalEntities = await this.countTotalEntities(driverResource, combinedFilters);
        let totalPages = totalEntities <= pageSize ? 1 : Math.ceil(totalEntities / pageSize);
        let renderedPagination = '';
        for(let paginationItem of PageRangeProvider.fetch(currentPage, totalPages)){
            let paginationUrl = this.rootPath+'/'+driverResource.entityPath+'?page='+ paginationItem.value;
            if(finalEntityFilterTerm){
                paginationUrl += '&entityFilterTerm='+encodeURIComponent(finalEntityFilterTerm);
            }
            if(finalSortBy){
                paginationUrl += '&sortBy='+encodeURIComponent(finalSortBy);
            }
            if(finalSortDirection){
                paginationUrl += '&sortDirection='+encodeURIComponent(finalSortDirection);
            }
            for(let filterKey of Object.keys(mergedFilters)){
                if(mergedFilters[filterKey]){
                    paginationUrl += '&filters['+filterKey+']='+encodeURIComponent(mergedFilters[filterKey]);
                }
            }
            renderedPagination += await this.adminContentsRender(
                this.adminFilesContents.fields.view['link'],
                {
                    fieldName: paginationItem.label,
                    fieldValue: paginationUrl,
                    fieldOriginalValue: paginationItem.value,
                }
            );
        }
        let listProperties = {
            entityNewRoute: this.rootPath+'/'+driverResource.entityPath+this.editPath,
            entityFilterTermValue: finalEntityFilterTerm || ''
        };
        await this.emitEvent('reldens.adminListPropertiesPopulation', {
            req,
            driverResource,
            listProperties
        });
        return await this.adminContentsRenderRoute(
            await this.adminContentsRender(
                this.adminContentsEntities()[entityPath].list,
                Object.assign({
                    list: await this.adminContentsRender(this.adminFilesContents.listContent, {
                        deletePath: this.rootPath + '/' + driverResource.entityPath + this.deletePath,
                        fieldsHeaders: driverResource.options.listProperties.map((property) => {
                            let propertyTitle = this.fetchTranslation(property, driverResource.id());
                            let alias = this.fetchTranslation(
                                driverResource.options.properties[property]?.alias || '',
                                driverResource.id()
                            );
                            let isSorted = finalSortBy === property;
                            let sortDirection = isSorted ? finalSortDirection.toLowerCase() : '';
                            return {
                                name: property,
                                value: '' !== alias ? alias + ' ('+propertyTitle+')' : propertyTitle,
                                isSorted,
                                sortDirection,
                                isSortedAsc: isSorted && 'asc' === sortDirection,
                                isSortedDesc: isSorted && 'desc' === sortDirection
                            };
                        }),
                        rows: await this.loadEntitiesForList(
                            driverResource,
                            pageSize,
                            currentPage,
                            req,
                            combinedFilters,
                            finalSortBy,
                            finalSortDirection
                        )
                    }),
                    pagination: renderedPagination,
                    extraContentForList: sc.get(listProperties, 'extraContentForList', ''),
                    entityFilterTermValue: listProperties.entityFilterTermValue
                }, ...driverResource.options.filterProperties.map((property) => {
                    let filterValue = (mergedFilters[property] || '');
                    return {[property]: '' === filterValue ? '' : 'value="'+filterValue+'"'};
                }))
            ),
            this.adminContentsSideBar()
        );
    }

    async generateViewRouteContent(req, driverResource, entityPath)
    {
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let id = (sc.get(req.query, idProperty, ''));
        if('' === id){
            Logger.error('Missing ID on view route.', entityPath, id, idProperty);
            return '';
        }
        let loadedEntity = await this.loadEntityById(driverResource, id);
        if(!loadedEntity){
            Logger.critical('Entity not found on view route.', entityPath, id, idProperty);
            return '';
        }
        let renderedViewProperties = {
            entityEditRoute: this.generateEntityRoute('editPath', driverResource, idProperty, loadedEntity),
            entityNewRoute: this.rootPath+'/'+driverResource.entityPath+this.editPath,
            id
        };
        let entitySerializedData = {};
        for(let propertyKey of driverResource.options.showProperties){
            let property = driverResource.options.properties[propertyKey];
            let {fieldValue, fieldName} = this.generatePropertyRenderedValueWithLabel(
                loadedEntity,
                propertyKey,
                property
            );
            entitySerializedData[fieldName] = fieldValue;
            renderedViewProperties[propertyKey] = await this.generatePropertyRenderedValue(
                fieldValue,
                fieldName,
                property,
                'view'
            );
        }
        let extraDataEvent = {entitySerializedData, entityId: driverResource.id(), entity: loadedEntity};
        await this.emitEvent('adminEntityExtraData', extraDataEvent);
        renderedViewProperties.entitySerializedData = JSON.stringify(extraDataEvent.entitySerializedData)
            .replace(/"/g, '&quot;');
        renderedViewProperties.extraContentForViewTop = '';
        renderedViewProperties.extraContentForViewBottom = '';
        await this.emitEvent('reldens.adminViewPropertiesPopulation', {
            idProperty,
            req,
            driverResource,
            loadedEntity,
            renderedViewProperties
        });
        return await this.adminContentsRenderRoute(
            await this.adminContentsRender(this.adminContentsEntities()[entityPath].view, renderedViewProperties),
            this.adminContentsSideBar()
        );
    }

    async generateEditRouteContent(req, driverResource, entityPath)
    {
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let idValue = String(sc.get(req?.query, idProperty, ''));
        let loadedEntity = !idValue ? null : await this.loadEntityById(driverResource, idValue);
        let renderedEditProperties = {
            idValue,
            idProperty,
            idPropertyLabel: this.fetchTranslation(idProperty, driverResource.id()),
            templateTitle: (!idValue ? 'Create' : 'Edit')+' '+this.translations.labels[driverResource.id()],
            entityViewRoute: !idValue
                ? this.rootPath+'/'+driverResource.entityPath
                : this.generateEntityRoute('viewPath', driverResource, idProperty, loadedEntity)
        };
        await this.emitEvent('reldens.adminEditPropertiesPopulation', {
            req,
            driverResource,
            renderedEditProperties,
            loadedEntity,
            entityId: driverResource.id(),
            entityData: loadedEntity
        });
        for(let propertyKey of Object.keys(driverResource.options.properties)){
            let property = driverResource.options.properties[propertyKey];
            let fieldDisabled = -1 === driverResource.options.editProperties.indexOf(propertyKey);
            let fieldValue = await this.generatePropertyEditRenderedValue(
                loadedEntity,
                propertyKey,
                property,
                fieldDisabled
            );
            let templateData = {
                fieldName: propertyKey,
                fieldValue,
                fieldDisabled: fieldDisabled ? ' disabled="disabled"' : '',
                required: (!property.isUpload || !loadedEntity) && property.isRequired ? ' required="required"' : '',
                multiple: property.isArray ? ' multiple="multiple"' : '',
                inputType: this.getInputType(property, propertyKey, fieldDisabled),
                isArray: property.isArray || '',
                arraySeparator: property.isArray || '',
                isRequired: property.isRequired || false
            };
            if(property.isUpload && fieldValue && '' !== fieldValue){
                let filesArray = property.isArray ? fieldValue.split(property.isArray) : [fieldValue];
                templateData.filesArray = filesArray.map((filename) => {
                    return {
                        filename,
                        isRemovable: !property.isRequired || filesArray.length > 1
                    };
                });
            }
            await this.emitEvent('reldens.adminBeforeFieldRender', {
                req,
                driverResource,
                propertyKey,
                property,
                templateData,
                loadedEntity,
                renderedEditProperties,
                adminContentsRender: this.adminContentsRender.bind(this),
                adminFilesContents: this.adminFilesContents
            });
            renderedEditProperties[propertyKey] = await this.adminContentsRender(
                this.adminFilesContents.fields.edit[this.propertyType(property, 'edit')],
                templateData
            );
        }
        return await this.adminContentsRenderRoute(
            await this.adminContentsRender(this.adminContentsEntities()[entityPath].edit, renderedEditProperties),
            this.adminContentsSideBar()
        );
    }

    async processDeleteEntities(req, res, driverResource, entityPath)
    {
        let ids = req?.body?.ids;
        if('string' === typeof ids){
            ids = ids.split(',');
        }
        let redirectPath = this.rootPath+'/'+entityPath+'?result=';
        if(!ids || 0 === ids.length){
            return redirectPath + 'errorMissingId';
        }
        try {
            let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
            let idProperty = this.fetchEntityIdPropertyKey(driverResource);
            let idsFilter = {[idProperty]: {operator: 'IN', value: ids}};
            let loadedEntities = await entityRepository.load(idsFilter);
            await this.deleteEntitiesRelatedFiles(driverResource, loadedEntities);
            let deleteResult = await entityRepository.delete(idsFilter);
            await this.emitEvent('reldens.adminAfterEntityDelete', {driverResource, idProperty, ids});
            return redirectPath + (deleteResult ? 'success' : 'errorStorageFailure');
        } catch (error) {
            return redirectPath + 'errorDeleteFailure';
        }
    }

    async processSaveEntity(req, res, driverResource, entityPath)
    {
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        let id = (req?.body[idProperty] || '');
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        let loadedEntity = id ? await this.loadEntityById(driverResource, id) : null;
        let uploadProperties = this.fetchUploadProperties(driverResource);
        if(0 < Object.keys(uploadProperties).length){
            if(this.uploaderFactory?.error?.message){
                Logger.error('Upload factory error detected', this.uploaderFactory.error);
                return this.rootPath+'/'+entityPath+'?result=uploadError&error='
                    +encodeURIComponent(this.uploaderFactory.error.message);
            }
            let uploadValidationResult = this.validateUploadedFiles(req, uploadProperties, loadedEntity);
            if(!uploadValidationResult.success){
                Logger.error('Upload validation failed', uploadValidationResult.error);
                return this.rootPath+'/'+entityPath+'?result=uploadValidationError&error='
                    +encodeURIComponent(uploadValidationResult.error.message);
            }
        }
        let entityDataPatch = this.preparePatchData(
            driverResource,
            idProperty,
            req,
            driverResource.options.properties,
            id,
            loadedEntity
        );
        if(!entityDataPatch){
            Logger.error('Bad patch data.', entityDataPatch);
            return this.rootPath+'/'+entityPath+'?result=saveBadPatchData';
        }
        try {
            let saveResult = await this.saveEntity(id, entityRepository, entityDataPatch);
            if(!saveResult){
                Logger.error('Save result error.', saveResult, entityDataPatch);
                return this.generateEntityRoute('editPath', driverResource, idProperty, null, id)
                    +'?result=saveEntityStorageError';
            }
            await this.emitEvent('reldens.adminAfterEntitySave', {
                req,
                res,
                driverResource,
                entityPath,
                entityData: saveResult
            });
            if(sc.isFunction(this.autoSyncDistCallback)){
                let uploadProperties = this.fetchUploadProperties(driverResource);
                if(0 < Object.keys(uploadProperties).length){
                    for(let uploadPropertyKey of Object.keys(uploadProperties)){
                        let property = uploadProperties[uploadPropertyKey];
                        await this.autoSyncDistCallback(
                            property.bucket,
                            saveResult[uploadPropertyKey],
                            property.distFolder
                        );
                    }
                }
            }
            let saveAction = sc.get(req.body, 'saveAction', 'save');
            if('saveAndContinue' === saveAction){
                return this.generateEntityRoute('editPath', driverResource, idProperty, saveResult) +'&result=success';
            }
            if('saveAndGoBack' === saveAction){
                return this.rootPath+'/'+entityPath+'?result=success';
            }
            return this.generateEntityRoute('viewPath', driverResource, idProperty, saveResult) +'&result=success';
        } catch (error) {
            Logger.error('Save entity error.', error);
            return this.rootPath+'/'+entityPath+'?result=saveEntityError';
        }
    }

    validateUploadedFiles(req, uploadProperties, loadedEntity)
    {
        for(let uploadPropertyKey of Object.keys(uploadProperties)){
            let property = uploadProperties[uploadPropertyKey];
            let uploadedFiles = req.files?.[uploadPropertyKey];
            if(!uploadedFiles || 0 === uploadedFiles.length){
                if(property.isRequired){
                    let isExplicitClear = '1' === sc.get(req.body, 'clear_'+uploadPropertyKey, false);
                    if(isExplicitClear){
                        return {success: false, error: {message: 'Required file upload missing: '+uploadPropertyKey}};
                    }
                    let existingValue = loadedEntity ? sc.get(loadedEntity, uploadPropertyKey, '') : '';
                    if(!existingValue || '' === existingValue){
                        return {success: false, error: {message: 'Required file upload missing: '+uploadPropertyKey}};
                    }
                }
                continue;
            }
            for(let file of uploadedFiles){
                let filePath = file.path;
                if(!FileHandler.exists(filePath)){
                    return {
                        success: false,
                        error: {
                            message: 'Uploaded file not found in bucket: '+file.filename,
                            filePath,
                            bucket: property.bucket
                        }
                    };
                }
                if(!FileHandler.isFile(filePath)){
                    return {
                        success: false,
                        error: {message: 'Uploaded file is not a valid file: '+file.filename, filePath}
                    };
                }
            }
        }
        return {success: true};
    }

    async countTotalEntities(driverResource, filters)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        if(!entityRepository){
            return false;
        }
        return await entityRepository.count(filters);
    }

    async loadEntitiesForList(driverResource, pageSize, currentPage, req, filters, sortBy, sortDirection)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        entityRepository.limit = pageSize;
        if(1 < currentPage){
            entityRepository.offset = (currentPage - 1) * pageSize;
        }
        entityRepository.sortBy = sortBy || false;
        entityRepository.sortDirection = sortDirection || false;
        let loadedEntities = await entityRepository.loadWithRelations(filters, []);
        entityRepository.limit = 0;
        entityRepository.offset = 0;
        entityRepository.sortBy = false;
        entityRepository.sortDirection = false;
        let entityRows = [];
        let resourceProperties = driverResource.options?.properties;
        let idProperty = this.fetchEntityIdPropertyKey(driverResource);
        for(let entity of loadedEntities){
            let fields = [];
            for(let property of driverResource.options.listProperties){
                let {fieldValue, fieldName} = this.generatePropertyRenderedValueWithLabel(
                    entity,
                    property,
                    resourceProperties[property]
                );
                fields.push({
                    name: property,
                    value: await this.generatePropertyRenderedValue(
                        fieldValue,
                        fieldName,
                        resourceProperties[property]
                    ),
                    viewLink: '' !== idProperty
                        ? this.generateEntityRoute('viewPath', driverResource, idProperty, entity)
                        : ''
                });
            }
            entityRows.push({
                fields,
                editLink: '' !== idProperty
                    ? this.generateEntityRoute('editPath', driverResource, idProperty, entity)
                    : '',
                deleteLink: this.rootPath + '/' + driverResource.entityPath + this.deletePath,
                id: entity[idProperty]
            });
        }
        return entityRows;
    }

    async loadEntityById(driverResource, id)
    {
        let entityRepository = this.dataServer.getEntity(driverResource.entityKey);
        if(!entityRepository){
            return false;
        }
        await this.emitEvent('reldens.adminBeforeEntityLoad', {
            driverResource,
            entityId: id
        });
        return await entityRepository.loadByIdWithRelations(id);
    }

    async saveEntity(id, entityRepository, entityDataPatch)
    {
        if('' === id){
            return entityRepository.create(entityDataPatch);
        }
        return entityRepository.updateById(id, entityDataPatch);
    }

    async deleteEntitiesRelatedFiles(driverResource, entities)
    {
        for(let propertyKey of Object.keys(driverResource.options.properties)){
            let property = driverResource.options.properties[propertyKey];
            if(!property.isUpload){
                continue;
            }
            for(let entity of entities){
                let bucket = sc.get(property, 'bucket', '');
                if(!property.isArray){
                    FileHandler.remove([bucket, entity[propertyKey]]);
                    continue;
                }
                for(let entityFile of entity[propertyKey].split(property.isArray)){
                    FileHandler.remove([bucket, entityFile]);
                }
            }
        }
    }

    preparePatchData(driverResource, idProperty, req, resourceProperties, id, loadedEntity)
    {
        let entityDataPatch = {};
        for(let i of Object.keys(resourceProperties)){
            if(i === idProperty){
                continue;
            }
            let property = resourceProperties[i];
            let shouldProcess = driverResource.options.editProperties.includes(i);
            if(!id && !shouldProcess && property.isRequired && 'reference' === property.type){
                shouldProcess = true;
            }
            if(!shouldProcess){
                continue;
            }
            let clearFieldParam = sc.get(req.body, 'clear_'+i, false);
            let isExplicitClear = '1' === clearFieldParam;
            let propertyUpdateValue = sc.get(req.body, i, null);
            if('null' === propertyUpdateValue){
                propertyUpdateValue = null;
            }
            let propertyType = sc.get(property, 'type', 'string');
            if(property.isUpload){
                propertyType = 'upload';
                if(isExplicitClear){
                    propertyUpdateValue = null;
                }
                if(!isExplicitClear){
                    let currentValue = loadedEntity ? sc.get(loadedEntity, i, '') : '';
                    propertyUpdateValue = this.prepareUploadPatchData(req, i, currentValue, property);
                }
            }
            if('boolean' === propertyType){
                propertyUpdateValue = '1' === propertyUpdateValue || 'on' === propertyUpdateValue;
            }
            let isEmpty = '' === propertyUpdateValue;
            let isNull = null === propertyUpdateValue;
            if('number' === propertyType && !isNull && !isEmpty){
                let numValue = Number(propertyUpdateValue);
                if(isNaN(numValue)){
                    Logger.critical(
                        'Invalid number value for property.',
                        {propertyKey: i, value: propertyUpdateValue, entity: driverResource.entityKey}
                    );
                    return false;
                }
                propertyUpdateValue = numValue;
            }
            if('string' === propertyType && !isNull && !isEmpty){
                propertyUpdateValue = String(propertyUpdateValue);
            }
            if(isEmpty && !property.isRequired){
                propertyUpdateValue = null;
            }
            let isUploadCreate = property.isUpload && !id;
            if(property.isRequired && (isNull || isEmpty) && (!property.isUpload || isUploadCreate)){
                Logger.critical(
                    'Missing property on prepare patch data.',
                    {propertyKey: i, config: property, propertyUpdateValue, entity: driverResource.entityKey}
                );
                return false;
            }
            if(-1 !== this.passwordFieldNames.indexOf(i)){
                if(!propertyUpdateValue || '' === propertyUpdateValue){
                    continue;
                }
            }
            if(!property.isUpload || (property.isUpload && (!isNull || isExplicitClear))){
                entityDataPatch[i] = propertyUpdateValue;
            }
        }
        return entityDataPatch;
    }


    prepareUploadPatchData(req, i, propertyUpdateValue, property)
    {
        let filesData = sc.get(req.files, i, null);
        let removedFiles = sc.get(req.body, 'removed_'+i, '');
        let existingFiles = propertyUpdateValue || '';
        if(property.isArray && removedFiles && '' !== removedFiles){
            let removedFilesArray = removedFiles.split(',');
            let existingFilesArray = existingFiles ? existingFiles.split(property.isArray) : [];
            existingFilesArray = existingFilesArray.filter(file => {
                return -1 === removedFilesArray.indexOf(file);
            });
            existingFiles = existingFilesArray.join(property.isArray);
        }
        if(!filesData || 0 === filesData.length){
            if(removedFiles && '' !== removedFiles){
                return existingFiles;
            }
            return null;
        }
        let newFileNames = [];
        for(let file of filesData){
            newFileNames.push(file.filename);
        }
        if(property.isArray && existingFiles && '' !== existingFiles){
            let existingFilesArray = existingFiles.split(property.isArray);
            let allFiles = existingFilesArray.concat(newFileNames);
            return allFiles.join(property.isArray);
        }
        return newFileNames.join(property.isArray);
    }

    async generatePropertyRenderedValue(fieldValue, fieldName, resourceProperty, templateType)
    {
        let fieldOriginalValue = fieldValue;
        if('view' === templateType){
            if(resourceProperty.isArray){
                fieldValue = fieldValue.split(resourceProperty.isArray).map((value) => {
                    let target = resourceProperty.isUpload ? ' target="_blank"' : '';
                    let fieldValuePart = resourceProperty.isUpload && resourceProperty.bucketPath && value
                        ? resourceProperty.bucketPath+value
                        : value;
                    return {fieldValuePart, fieldOriginalValuePart: value, target};
                });
            }
            if(!resourceProperty.isArray && resourceProperty.isUpload && fieldValue){
                fieldValue = resourceProperty.bucketPath+fieldValue;
            }
        }
        return await this.adminContentsRender(
            this.adminFilesContents.fields.view[this.propertyType(resourceProperty, templateType, fieldValue)],
            {fieldName, fieldValue, fieldOriginalValue, target: ' target="_blank"'}
        );
    }

    generatePropertyRenderedValueWithLabel(entity, propertyKey, resourceProperty)
    {
        let fieldValue = (0 === entity[propertyKey] ? '0' : entity[propertyKey] || '');
        if((sc.isObject(fieldValue) || sc.isArray(fieldValue)) && 'json' === resourceProperty.dbType){
            fieldValue = sc.toJsonString(fieldValue);
        }
        let fieldName = propertyKey;
        if('boolean' === resourceProperty.type){
            fieldValue = 1 === entity[propertyKey]
            || '1' === entity[propertyKey]
            || true === entity[propertyKey] ? 'Yes' : 'No';
        }
        if('datetime' === resourceProperty.type){
            fieldValue = '' !== fieldValue ? sc.formatDate(new Date(fieldValue)) : '';
        }
        if('reference' === resourceProperty.type){
            let relationEntity = entity[resourceProperty.alias || 'related_'+resourceProperty.reference];
            if(relationEntity){
                let relation = this.relations()[resourceProperty.reference];
                if(relation){
                    let relationTitleProperty = relation[resourceProperty.alias || resourceProperty.reference];
                    if(relationTitleProperty && '' !== String(relationEntity[relationTitleProperty] || '')){
                        fieldName = relationTitleProperty;
                        fieldValue = relationEntity[relationTitleProperty]+(' ('+fieldValue+')');
                    }
                }
            }
        }
        if(resourceProperty.availableValues){
            let optionData = resourceProperty.availableValues.filter((availableValue) => {
                return String(availableValue.value) === String(fieldValue);
            }).shift();
            if(optionData){
                fieldValue = optionData.label + ' (' + fieldValue + ')';
            }
        }
        return {fieldValue, fieldName};
    }

    async generatePropertyEditRenderedValue(entity, propertyKey, resourceProperty)
    {
        if(-1 !== this.passwordFieldNames.indexOf(propertyKey)){
            return '';
        }
        let entityPropertyValue = sc.get(entity, propertyKey, null);
        let fieldValue = (0 === entityPropertyValue ? '0' : entityPropertyValue || '');
        if('null' === fieldValue){
            fieldValue = '';
        }
        if((sc.isObject(fieldValue) || sc.isArray(fieldValue)) && 'json' === resourceProperty.dbType){
            fieldValue = sc.toJsonString(fieldValue);
        }
        if('boolean' === resourceProperty.type){
            fieldValue = 1 === entityPropertyValue
                || '1' === entityPropertyValue
                || true === entityPropertyValue ? ' checked="checked"' : '';
        }
        if('datetime' === resourceProperty.type){
            fieldValue = !entityPropertyValue || '' === entityPropertyValue
                ? ''
                : sc.formatDate(new Date(entityPropertyValue), 'Y-m-d H:i:s');
        }
        if('reference' === resourceProperty.type){
            let relationDriverResource = this.resourcesByReference()[resourceProperty.reference];
            if(!relationDriverResource){
                Logger.critical('Driver resource not found by reference.', resourceProperty);
                return fieldValue;
            }
            let relation = this.relations()[resourceProperty.reference];
            let relationKey = resourceProperty.alias || resourceProperty.reference;
            let relationTitleProperty = relation
                ? relation[relationKey]
                : this.fetchEntityIdPropertyKey(relationDriverResource);
            let options = (await this.fetchRelationOptions(relationDriverResource)).map((option) => {
                let value = option[this.fetchEntityIdPropertyKey(relationDriverResource)];
                return {
                    label: option[relationTitleProperty]+' (ID: '+value+')',
                    value,
                    selected: entity && entity[propertyKey] === value ? ' selected="selected"' : ''
                };
            });
            if(!resourceProperty.isRequired){
                let isSelected = !entity || null === entity[propertyKey] || '' === entity[propertyKey];
                options.unshift({
                    label: '-- Select --',
                    value: '',
                    selected: isSelected ? ' selected="selected"' : ''
                });
            }
            return options;
        }
        return fieldValue;
    }

    async fetchRelationOptions(relationDriverResource)
    {
        let relationEntityRepository = this.dataServer.getEntity(relationDriverResource.entityKey);
        if(!relationEntityRepository){
            return [];
        }
        return await relationEntityRepository.loadAll();
    }

    propertyType(resourceProperty, templateType, fieldValue)
    {
        let propertyType = sc.get(resourceProperty, 'type', 'text');
        if('reference' === propertyType && 'edit' === templateType){
            return 'select';
        }
        if(resourceProperty.isUpload){
            if('edit' === templateType){
                return 'file';
            }
            if('view' === templateType){
                if(!fieldValue || '' === fieldValue){
                    return 'text';
                }
                let multiple = resourceProperty.isArray ? 's' : '';
                let allowedTypes = sc.get(resourceProperty, 'allowedTypes', '');
                if('' !== allowedTypes){
                    let templateName = allowedTypes + multiple;
                    if(sc.hasOwn(this.adminFilesContents.fields.view, templateName)){
                        return templateName;
                    }
                }
                if('text' === allowedTypes){
                    return 'link'+multiple
                }
                return 'text';
            }
        }
        if('textarea' === resourceProperty.type){
            return 'textarea';
        }
        if(-1 !== ['reference', 'number', 'datetime'].indexOf(propertyType)){
            propertyType = 'text';
        }
        return propertyType;
    }

    getInputType(resourceProperty, propertyKey, fieldDisabled)
    {
        if(-1 !== this.passwordFieldNames.indexOf(propertyKey) && !fieldDisabled){
            return 'password';
        }
        if('datetime' === resourceProperty.type && !fieldDisabled){
            return 'datetime-local';
        }
        if('number' === resourceProperty.type){
            return 'number';
        }
        return 'text';
    }

    generateEntityRoute(routeType, driverResource, idProperty, entity, entityId)
    {
        if(!idProperty || (!entity && !entityId)){
            return this.rootPath + '/' + driverResource.entityPath;
        }
        let idParam = '?' + idProperty + '=';
        if(entity){
            idParam = idParam + entity[idProperty];
        }
        if(entityId){
            idParam = idParam + entityId;
        }
        return this.rootPath + '/' + driverResource.entityPath + this[routeType] + idParam;
    }

}

module.exports.RouterContents = RouterContents;
