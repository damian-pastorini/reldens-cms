/**
 *
 * Reldens - CMS - CollectionsTransformerBase
 *
 */

const { Logger, sc } = require('@reldens/utils');

class CollectionsTransformerBase
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.jsonFieldsParser = sc.get(props, 'jsonFieldsParser', false);
    }

    extractAttributeValue(tagContent, attributeName)
    {
        let doubleQuoteRegex = new RegExp(attributeName + '="([^"]*)"');
        let singleQuoteRegex = new RegExp(attributeName + "='([^']*)'");
        let doubleMatch = tagContent.match(doubleQuoteRegex);
        if(doubleMatch){
            return doubleMatch[1];
        }
        let singleMatch = tagContent.match(singleQuoteRegex);
        if(singleMatch){
            return singleMatch[1];
        }
        return '';
    }

    convertJsObjectToJson(jsObjectString)
    {
        if(!jsObjectString || '' === jsObjectString.trim()){
            return '';
        }
        return jsObjectString
            .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
            .replace(/:\s*'([^']*)'/g, ': "$1"');
    }

    parseRelationsString(relationsString)
    {
        if(!relationsString || '' === relationsString.trim()){
            return [];
        }
        return relationsString.split(',').map(relation => relation.trim()).filter(relation => '' !== relation);
    }

    async fetchCollectionForTemplate(tableName, filtersJson, queryOptionsJson, relationsString)
    {
        let entity = this.dataServer.getEntity(tableName);
        if(!entity){
            Logger.warning('Entity not found in dataServer: '+tableName);
            return [];
        }
        let filters = {};
        if(filtersJson && '' !== filtersJson.trim()){
            let convertedFiltersJson = this.convertJsObjectToJson(filtersJson);
            let parsedFilters = sc.parseJson(convertedFiltersJson, false);
            if(parsedFilters){
                filters = parsedFilters;
            }
            if(!parsedFilters){
                Logger.warning('Invalid filters JSON: '+filtersJson);
            }
        }
        let originalState = this.preserveEntityState(entity);
        let queryOptions = {};
        if(queryOptionsJson && '' !== queryOptionsJson.trim()){
            let convertedOptionsJson = this.convertJsObjectToJson(queryOptionsJson);
            queryOptions = sc.parseJson(convertedOptionsJson, {});
            if(!queryOptions){
                Logger.warning('Invalid query options JSON: '+queryOptionsJson);
                queryOptions = {};
            }
        }
        let result = await this.loadEntityData(entity, filters, queryOptions, relationsString, tableName);
        this.restoreEntityState(entity, originalState);
        return result;
    }

    async loadEntityData(entity, filters, queryOptions, relationsString, tableName)
    {
        this.applyQueryOptions(entity, queryOptions);
        let relations = this.parseRelationsString(relationsString);
        let result = 0 < relations.length
            ? await entity.loadWithRelations(filters, relations)
            : 0 < Object.keys(filters).length ? await entity.load(filters) : await entity.loadAll();
        return this.jsonFieldsParser.parseJsonFields(
            result,
            this.jsonFieldsParser.getJsonFieldsForEntity(tableName)
        );
    }

    preserveEntityState(entity)
    {
        return {
            limit: sc.get(entity, 'limit', 0),
            offset: sc.get(entity, 'offset', 0),
            sortBy: sc.get(entity, 'sortBy', false),
            sortDirection: sc.get(entity, 'sortDirection', false)
        };
    }

    restoreEntityState(entity, originalState)
    {
        entity.limit = originalState.limit;
        entity.offset = originalState.offset;
        entity.sortBy = originalState.sortBy;
        entity.sortDirection = originalState.sortDirection;
    }

    applyQueryOptions(entity, queryOptions)
    {
        if(sc.hasOwn(queryOptions, 'limit')){
            entity.limit = queryOptions.limit;
        }
        if(sc.hasOwn(queryOptions, 'offset')){
            entity.offset = queryOptions.offset;
        }
        if(sc.hasOwn(queryOptions, 'sortBy')){
            entity.sortBy = queryOptions.sortBy;
        }
        if(sc.hasOwn(queryOptions, 'sortDirection')){
            entity.sortDirection = queryOptions.sortDirection;
        }
    }

}

module.exports.CollectionsTransformerBase = CollectionsTransformerBase;
