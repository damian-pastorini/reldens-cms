/**
 *
 * Reldens - CMS - Search
 *
 */

const { PaginationHandler } = require('./pagination-handler');
const { Logger, sc } = require('@reldens/utils');

class Search
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.jsonFieldsParser = sc.get(props, 'jsonFieldsParser', false);
        this.paginationHandler = new PaginationHandler();
        this.defaultSetKey = 'cmsPagesSearch';
        this.searchSets = sc.get(props, 'searchSets', {
            cmsPagesSearch: {
                entities: [{
                    name: 'cmsPages',
                    fields: [
                        'title',
                        'content',
                        'json_data',
                        'meta_title',
                        'meta_description',
                        'meta_og_title',
                        'meta_og_description'
                    ],
                    relations: 'routes'
                }],
                pagination: {active: true, limit: 20, sortBy: 'publish_date', sortDirection: 'desc'}
            }
        });
        this.defaultRenderConfig = {
            page: 'page',
            layout: 'search',
            paginationContainer: 'pagedCollection',
            partial: 'entriesListView',
            templateData: {}
        };
    }

    parseSearchParameters(query)
    {
        let setKey = sc.get(query, 'set-key', this.defaultSetKey);
        let config = sc.get(this.searchSets, setKey, false);
        if(!config){
            Logger.error('Search set not found: ' + setKey);
            return false;
        }
        config = sc.deepJsonClone(config);
        if(!sc.hasOwn(config, 'entities')){
            config.entities = [];
        }
        if(!sc.hasOwn(config, 'pagination')){
            config.pagination = {active: false};
        }
        config = this.parseEntityParameters(query, config);
        config = this.parseSearchTerms(query, config);
        config = this.parseRelationsParameters(query, config);
        config = this.parsePaginationParameters(query, config);
        config = this.parseRenderParameters(query, config);
        return config;
    }

    parseRelationsParameters(query, config)
    {
        for(let i = 0; i < config.entities.length; i++){
            let entityConfig = config.entities[i];
            let relationKey = 'relations[' + entityConfig.name + ']';
            let relationsValue = sc.get(query, relationKey, '');
            if(relationsValue){
                entityConfig.relations = relationsValue;
            }
        }
        return config;
    }

    parseEntityParameters(query, config)
    {
        for(let key of Object.keys(query)){
            if(!key.startsWith('entity[')){
                continue;
            }
            let entityMatch = key.match(/entity\[([^\]]+)\]/);
            if(!entityMatch){
                continue;
            }
            let entityName = entityMatch[1];
            let fields = query[key];
            if(sc.isString(fields)){
                fields = fields.split(',').map(f => f.trim()).filter(f => '' !== f);
            }
            if(!sc.isArray(fields)){
                continue;
            }
            let existingEntity = sc.fetchByProperty(config.entities, 'name', entityName);
            if(existingEntity){
                existingEntity.fields = fields;
                continue;
            }
            config.entities.push({name: entityName, fields});
        }
        return config;
    }

    parseSearchTerms(query, config)
    {
        config.searchTerms = {};
        let globalSearch = sc.get(query, 'search', '');
        if(globalSearch && sc.isString(globalSearch)){
            config.searchTerms.global = globalSearch;
            return config;
        }
        for(let key of Object.keys(query)){
            if(!key.startsWith('search[')){
                continue;
            }
            let searchMatch = key.match(/search\[([^\]]+)\](?:\[([^\]]+)\])?/);
            if(!searchMatch){
                continue;
            }
            let entityName = searchMatch[1];
            let fieldName = searchMatch[2];
            let searchValue = query[key];
            if(!sc.hasOwn(config.searchTerms, entityName)){
                config.searchTerms[entityName] = {};
            }
            if(fieldName){
                config.searchTerms[entityName][fieldName] = searchValue;
                continue;
            }
            config.searchTerms[entityName].global = searchValue;
        }
        return config;
    }

    parsePaginationParameters(query, config)
    {
        let limit = sc.get(query, 'limit', '');
        if(limit && sc.isValidInteger(Number(limit), 1)){
            config.pagination.limit = Number(limit);
            config.pagination.active = true;
        }
        let offset = sc.get(query, 'offset', '');
        if(offset && sc.isValidInteger(Number(offset), 0)){
            config.pagination.offset = Number(offset);
            config.pagination.active = true;
        }
        let page = sc.get(query, 'pageNumber', '');
        if(page && sc.isValidInteger(Number(page), 1)){
            config.pagination.page = Number(page);
            config.pagination.active = true;
        }
        let sortBy = sc.get(query, 'sortBy', '');
        if(sortBy){
            config.pagination.sortBy = sortBy;
        }
        let sortDirection = sc.get(query, 'sortDirection', '');
        if(sortDirection && ('asc' === sortDirection || 'desc' === sortDirection)){
            config.pagination.sortDirection = sortDirection;
        }
        return config;
    }

    parseRenderParameters(query, config)
    {
        config.render = Object.assign({}, this.defaultRenderConfig);
        let page = sc.get(query, 'renderPage', '');
        if(page){
            config.render.page = page;
        }
        let layout = sc.get(query, 'renderLayout', '');
        if(layout){
            config.render.layout = layout;
        }
        let paginationContainer = sc.get(query, 'renderPaginationContainer', '');
        if(paginationContainer){
            config.render.paginationContainer = paginationContainer;
        }
        let partial = sc.get(query, 'renderPartial', '');
        if(partial){
            config.render.partial = partial;
        }
        for(let key of Object.keys(query)){
            if(!key.startsWith('templateData[')){
                continue;
            }
            let templateMatch = key.match(/templateData\[([^\]]+)\]/);
            if(!templateMatch){
                continue;
            }
            let templateKey = templateMatch[1];
            config.render.templateData[templateKey] = query[key];
        }
        return config;
    }

    async executeSearch(config)
    {
        if(!config || !sc.isArray(config.entities) || 0 === config.entities.length){
            Logger.error('Invalid search configuration');
            return false;
        }
        let searchTerms = sc.get(config, 'searchTerms', {});
        let hasSearchTerms = false;
        if(sc.hasOwn(searchTerms, 'global') && '' !== searchTerms.global){
            hasSearchTerms = true;
        }
        if(!hasSearchTerms){
            for(let entityName of Object.keys(searchTerms)){
                let entityTerms = searchTerms[entityName];
                if(sc.isObject(entityTerms)){
                    for(let termKey of Object.keys(entityTerms)){
                        if('' !== entityTerms[termKey]){
                            hasSearchTerms = true;
                            break;
                        }
                    }
                }
                if(hasSearchTerms){
                    break;
                }
            }
        }
        if(!hasSearchTerms){
            let results = [];
            for(let entityConfig of config.entities){
                results.push({
                    entity: entityConfig.name,
                    results: [],
                    hasResults: false,
                    noResultsMessage: 'No search term provided.'
                });
            }
            return results;
        }
        try {
            let results = [];
            for(let entityConfig of config.entities){
                let entityResult = await this.searchEntity(entityConfig, config);
                if(false === entityResult){
                    continue;
                }
                results.push(entityResult);
            }
            return results;
        } catch(error) {
            Logger.error('Search execution failed: ' + error.message);
            return false;
        }
    }

    async searchEntity(entityConfig, config)
    {
        let entity = this.dataServer.getEntity(entityConfig.name);
        if(!entity){
            Logger.error('Entity not found: ' + entityConfig.name);
            return false;
        }
        let searchFilters = this.buildSearchFilters(entityConfig, config);
        if(!searchFilters){
            Logger.error('No search filters built for entity: ' + entityConfig.name);
            return false;
        }
        try {
            let results;
            let paginationData = null;
            let relationsString = sc.get(entityConfig, 'relations', '');
            let originalState = entity.preserveEntityState();
            if(config.pagination && config.pagination.active){
                let totalRecords = await this.paginationHandler.getCollectionTotal(entity, searchFilters);
                let currentPage = sc.get(config.pagination, 'page', 1);
                let limit = sc.get(config.pagination, 'limit', 20);
                let offset = (currentPage - 1) * limit;
                let sortBy = sc.get(config.pagination, 'sortBy', 'id');
                let sortDirection = sc.get(config.pagination, 'sortDirection', 'asc');
                let queryOptions = {
                    limit,
                    offset,
                    sortBy,
                    sortDirection
                };
                results = await entity.loadEntityData(searchFilters, queryOptions, relationsString);
                paginationData = this.paginationHandler.calculatePaginationData(
                    totalRecords,
                    currentPage,
                    limit,
                    '',
                    entityConfig.name,
                    config.pagination,
                    {}
                );
            }
            if(!results){
                results = await entity.loadEntityData(searchFilters, {}, relationsString);
            }
            entity.restoreEntityState(originalState);
            if(this.jsonFieldsParser){
                results = this.jsonFieldsParser.parseJsonFields(
                    results,
                    this.jsonFieldsParser.getJsonFieldsForEntity(entityConfig.name)
                );
            }
            let entityResult = {
                entity: entityConfig.name,
                results: results || [],
                hasResults: results && 0 < results.length,
                noResultsMessage: 'No results found for your search.'
            };
            if(paginationData){
                entityResult.pagination = paginationData;
            }
            return entityResult;
        } catch(error) {
            Logger.error('Search entity failed for ' + entityConfig.name + ': ' + error.message);
            return {
                entity: entityConfig.name,
                results: [],
                hasResults: false,
                noResultsMessage: 'Search failed. Please try again.',
                error: true
            };
        }
    }

    buildSearchFilters(entityConfig, config)
    {
        let searchTerms = sc.get(config, 'searchTerms', {});
        let globalTerm = sc.get(searchTerms, 'global', '');
        let entityTerms = sc.get(searchTerms, entityConfig.name, {});
        let entityGlobalTerm = sc.get(entityTerms, 'global', '');
        let searchTerm = entityGlobalTerm || globalTerm;
        if(!searchTerm){
            return false;
        }
        let entity = this.dataServer.getEntity(entityConfig.name);
        if(!entity){
            return false;
        }
        let searchableFields = entityConfig.fields;
        let orConditions = [];
        for(let field of searchableFields){
            orConditions.push({
                [field]: {operator: 'LIKE', value: '%' + searchTerm + '%'}
            });
        }
        return {OR: orConditions};
    }

}

module.exports.Search = Search;
