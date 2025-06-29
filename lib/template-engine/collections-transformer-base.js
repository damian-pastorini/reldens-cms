/**
 *
 * Reldens - CMS - CollectionsTransformerBase
 *
 */

const { EntityLoader } = require('../entity-loader');
const { Logger, sc } = require('@reldens/utils');

class CollectionsTransformerBase
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.jsonFieldsParser = sc.get(props, 'jsonFieldsParser', false);
        this.entityLoader = new EntityLoader({
            jsonFieldsParser: this.jsonFieldsParser
        });
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
        let originalState = this.entityLoader.preserveEntityState(entity);
        let queryOptions = {};
        if(queryOptionsJson && '' !== queryOptionsJson.trim()){
            let convertedOptionsJson = this.convertJsObjectToJson(queryOptionsJson);
            queryOptions = sc.parseJson(convertedOptionsJson, {});
            if(!queryOptions){
                Logger.warning('Invalid query options JSON: '+queryOptionsJson);
                queryOptions = {};
            }
        }
        let result = await this.entityLoader.loadEntityData(entity, filters, queryOptions, relationsString, tableName);
        this.entityLoader.restoreEntityState(entity, originalState);
        return result;
    }

}

module.exports.CollectionsTransformerBase = CollectionsTransformerBase;
