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
        let regex = new RegExp(attributeName + '=([\'"])([^\'"]*)\\1');
        let match = tagContent.match(regex);
        return match ? match[2] : '';
    }

    convertJsObjectToJson(jsObjectString)
    {
        if(!jsObjectString || '' === jsObjectString.trim()){
            return '';
        }
        return jsObjectString.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
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
        let filters = false;
        if(filtersJson && '' !== filtersJson.trim()){
            let convertedFiltersJson = this.convertJsObjectToJson(filtersJson);
            filters = sc.parseJson(convertedFiltersJson, false);
            if(!filters){
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
        this.applyQueryOptions(entity, queryOptions);
        let relations = this.parseRelationsString(relationsString);
        let result = 0 < relations.length
            ? await entity.loadWithRelations(filters || {}, relations)
            : filters ? await entity.load(filters) : await entity.loadAll();
        this.restoreEntityState(entity, originalState);
        return this.jsonFieldsParser.parseJsonFields(
            result,
            this.jsonFieldsParser.getJsonFieldsForEntity(tableName)
        );
    }

    preserveEntityState(entity)
    {
        return {
            limit: entity.limit,
            offset: entity.offset,
            sortBy: entity.sortBy,
            sortDirection: entity.sortDirection
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
