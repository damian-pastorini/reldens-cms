/**
 *
 * Reldens - CMS - CollectionsTransformer
 *
 */

const { CollectionsTransformerBase } = require('./collections-transformer-base');
const { PaginationHandler } = require('../pagination-handler');
const { Logger, sc } = require('@reldens/utils');

class CollectionsTransformer extends CollectionsTransformerBase
{

    constructor(props)
    {
        super(props);
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.findAllPartialTags = sc.get(props, 'findAllPartialTags', false);
        this.loadPartialTemplate = sc.get(props, 'loadPartialTemplate', false);
        this.processAllTemplateFunctions = sc.get(props, 'processAllTemplateFunctions', false);
        this.paginationHandler = new PaginationHandler();
    }

    getLoopCollectionStartRegex()
    {
        return /<collection\s+([^>]+)>/g;
    }

    getLoopCollectionEndRegex()
    {
        return new RegExp('<\\/collection>');
    }

    async transform(template, domain, req, systemVariables, enhancedData = {})
    {
        let processedTemplate = template;
        let matches = [...template.matchAll(this.getLoopCollectionStartRegex())];
        for(let i = matches.length - 1; i >= 0; i--){
            let startMatch = matches[i];
            let tagContent = startMatch[1];
            if(tagContent.includes('field=')){
                continue;
            }
            let tableName = this.extractAttributeValue(tagContent, 'name');
            let filtersJson = this.extractAttributeValue(tagContent, 'filters');
            let queryOptionsJson = this.extractAttributeValue(tagContent, 'data');
            let relationsString = this.extractAttributeValue(tagContent, 'relations');
            let paginationId = this.extractAttributeValue(tagContent, 'pagination');
            if(paginationId && '' !== paginationId){
                let containerName = this.extractAttributeValue(tagContent, 'container');
                let prevPages = this.extractAttributeValue(tagContent, 'prevPages');
                let nextPages = this.extractAttributeValue(tagContent, 'nextPages');
                let loopResult = await this.processPaginatedCollection(
                    processedTemplate,
                    startMatch,
                    tableName,
                    filtersJson,
                    relationsString,
                    queryOptionsJson,
                    paginationId,
                    containerName,
                    prevPages,
                    nextPages,
                    domain,
                    req,
                    systemVariables,
                    enhancedData
                );
                if(loopResult){
                    processedTemplate = loopResult;
                }
                continue;
            }
            let loopResult = await this.processLoopCollection(
                processedTemplate,
                startMatch,
                tableName,
                filtersJson,
                relationsString,
                queryOptionsJson,
                domain,
                req,
                systemVariables,
                enhancedData
            );
            if(loopResult){
                processedTemplate = loopResult;
            }
        }
        return processedTemplate;
    }

    async processLoopCollection(
        template,
        startMatch,
        tableName,
        filtersJson,
        relationsString,
        queryOptionsJson,
        domain,
        req,
        systemVariables,
        enhancedData
    ){
        return await this.processCollectionBase(
            template,
            startMatch,
            tableName,
            filtersJson,
            relationsString,
            queryOptionsJson,
            domain,
            false,
            req,
            systemVariables,
            enhancedData
        );
    }

    async processPaginatedCollection(
        template,
        startMatch,
        tableName,
        filtersJson,
        relationsString,
        queryOptionsJson,
        paginationId,
        containerName,
        prevPages,
        nextPages,
        domain,
        req,
        systemVariables,
        enhancedData
    ){
        if(!req){
            Logger.warning('No request provided for pagination, falling back to regular collection');
            return await this.processLoopCollection(
                template,
                startMatch,
                tableName,
                filtersJson,
                relationsString,
                queryOptionsJson,
                domain,
                req,
                systemVariables,
                enhancedData
            );
        }
        return await this.processCollectionBase(
            template,
            startMatch,
            tableName,
            filtersJson,
            relationsString,
            queryOptionsJson,
            domain,
            {
                paginationId,
                containerName,
                prevPages,
                nextPages,
                req
            },
            req,
            systemVariables,
            enhancedData
        );
    }

    async processCollectionBase(
        template,
        startMatch,
        tableName,
        filtersJson,
        relationsString,
        queryOptionsJson,
        domain,
        paginationOptions,
        req,
        systemVariables,
        enhancedData
    ){
        let startPos = startMatch.index;
        let startEnd = startPos + startMatch[0].length;
        let endMatch = this.getLoopCollectionEndRegex().exec(template.substring(startEnd));
        if(!endMatch){
            Logger.warning('No matching end tag found for collection: '+tableName);
            return false;
        }
        let endPos = startEnd + endMatch.index;
        let loopContent = template.substring(startEnd, endPos);
        let collectionData;
        let finalContent;
        if(paginationOptions){
            let templateParams = this.parseCollectionTemplateParams(filtersJson, queryOptionsJson);
            let requestParams = this.paginationHandler.extractCollectionKeyFromRequest(
                paginationOptions.req,
                paginationOptions.paginationId
            );
            let mergedParams = this.paginationHandler.mergeCollectionParameters(
                templateParams,
                requestParams
            );
            mergedParams.prevPages = paginationOptions.prevPages;
            mergedParams.nextPages = paginationOptions.nextPages;
            let entity = this.dataServer.getEntity(tableName);
            if(!entity){
                Logger.warning('Entity not found in dataServer: '+tableName);
                return template.substring(0, startPos) + '' + template.substring(endPos + endMatch[0].length);
            }
            let paginationData = this.paginationHandler.calculatePaginationData(
                await this.paginationHandler.getCollectionTotal(entity, mergedParams.filters),
                mergedParams.page,
                mergedParams.limit,
                this.getCurrentUrl(paginationOptions.req),
                paginationOptions.paginationId,
                mergedParams,
                templateParams
            );
            let originalState = entity.preserveEntityState();
            collectionData = await entity.loadEntityData(mergedParams.filters, {
                limit: mergedParams.limit,
                offset: paginationData.offset,
                sortBy: mergedParams.sortBy,
                sortDirection: mergedParams.sortDirection
            }, relationsString);
            entity.restoreEntityState(originalState);
            if(this.jsonFieldsParser){
                collectionData = this.jsonFieldsParser.parseJsonFields(
                    collectionData,
                    this.jsonFieldsParser.getJsonFieldsForEntity(tableName)
                );
            }
            let collectionContent = await this.renderCollectionLoop(loopContent, collectionData, domain, req, systemVariables, enhancedData);
            finalContent = this.renderEngine.render(
                1 < paginationData.totalPages
                    ? this.loadPaginationTemplate(paginationOptions.containerName, domain)
                    : '{{&collectionContentForCurrentPage}}',
                Object.assign(
                    {},
                    enhancedData,
                    paginationData,
                    {
                        collectionContentForCurrentPage: collectionContent,
                        hasResults: collectionData && 0 < collectionData.length,
                        noResultsMessage: 'No items found.'
                    }
                ),
                this.getPartials(domain)
            );
        }
        if(!paginationOptions){
            collectionData = await this.fetchCollectionForTemplate(
                tableName,
                filtersJson,
                queryOptionsJson,
                relationsString
            );
            finalContent = await this.renderCollectionLoop(loopContent, collectionData, domain, req, systemVariables, enhancedData);
        }
        return template.substring(0, startPos) + finalContent + template.substring(endPos + endMatch[0].length);
    }

    parseCollectionTemplateParams(filtersJson, queryOptionsJson)
    {
        let filters = {};
        let queryOptions = {};
        if(filtersJson && '' !== filtersJson.trim()){
            let convertedFiltersJson = this.convertJsObjectToJson(filtersJson);
            filters = sc.parseJson(convertedFiltersJson, {});
            if(!filters){
                Logger.warning('Invalid filters JSON: '+filtersJson);
                filters = {};
            }
        }
        if(queryOptionsJson && '' !== queryOptionsJson.trim()){
            let convertedOptionsJson = this.convertJsObjectToJson(queryOptionsJson);
            queryOptions = sc.parseJson(convertedOptionsJson, {});
            if(!queryOptions){
                Logger.warning('Invalid query options JSON: '+queryOptionsJson);
                queryOptions = {};
            }
        }
        return {
            filters,
            limit: sc.get(queryOptions, 'limit', 10),
            sortBy: sc.get(queryOptions, 'sortBy', 'id'),
            sortDirection: sc.get(queryOptions, 'sortDirection', 'asc')
        };
    }

    loadPaginationTemplate(containerName, domain)
    {
        if(!containerName || '' === containerName){
            containerName = 'pagedCollection';
        }
        let partialContent = this.loadPartialTemplate(containerName, domain);
        if(partialContent){
            return partialContent;
        }
        Logger.critical('Pagination template not found: ' + containerName + '. Please create the template file.');
        return '{{&collectionContentForCurrentPage}}';
    }

    async renderCollectionLoop(loopContent, collectionData, domain, req, systemVariables, enhancedData)
    {
        if(!collectionData || 0 === collectionData.length){
            return this.renderNoResultsMessage(domain, enhancedData);
        }
        let renderedContent = '';
        for(let row of collectionData){
            renderedContent += await this.processPartialsInLoop(loopContent, row, domain, req, systemVariables, enhancedData);
        }
        return renderedContent;
    }

    renderNoResultsMessage(domain, enhancedData)
    {
        let noResultsTemplate = this.loadPartialTemplate('noResults', domain);
        if(noResultsTemplate){
            return this.renderEngine.render(
                noResultsTemplate,
                Object.assign(
                    {},
                    enhancedData,
                    {
                        message: 'No results found.',
                        cssClass: 'no-results',
                        alertClass: 'alert-info'
                    }
                ),
                this.getPartials(domain)
            );
        }
        return '';
    }

    async processPartialsInLoop(content, rowData, domain, req, systemVariables, enhancedData)
    {
        let processedContent = content;
        let partialTags = this.findAllPartialTags(content);
        for(let i = partialTags.length - 1; i >= 0; i--){
            let tag = partialTags[i];
            let partialContent = this.loadPartialTemplate(tag.name, domain);
            if(!partialContent){
                Logger.warning('Partial template not found: ' + tag.name);
                processedContent = processedContent.substring(0, tag.start)+''+processedContent.substring(tag.end);
                continue;
            }
            if(this.processAllTemplateFunctions){
                partialContent = await this.processAllTemplateFunctions(partialContent, domain, req, systemVariables, enhancedData);
            }
            let renderData = Object.assign({}, enhancedData);
            if(sc.hasOwn(tag.attributes, 'row')){
                renderData.row = rowData;
            }
            for(let key of Object.keys(tag.attributes)){
                if('row' !== key){
                    renderData[key] = tag.attributes[key];
                }
            }
            processedContent = processedContent.substring(0, tag.start)
                +this.renderEngine.render(partialContent, renderData, this.getPartials(domain))
                +processedContent.substring(tag.end);
        }
        if(this.processAllTemplateFunctions){
            processedContent = await this.processAllTemplateFunctions(processedContent, domain, req, systemVariables, enhancedData);
        }
        return this.renderEngine.render(processedContent, Object.assign({}, enhancedData, {row: rowData}), this.getPartials(domain));
    }

    getCurrentUrl(req)
    {
        if(!req){
            return '';
        }
        return sc.get(req, 'protocol', 'http') + '://'
            + (req.get('host') || 'localhost')
            + sc.get(req, 'originalUrl', sc.get(req, 'path', '/')).split('?')[0];
    }

}

module.exports.CollectionsTransformer = CollectionsTransformer;
