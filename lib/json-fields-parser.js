/**
 *
 * Reldens - CMS - JsonFieldsParser
 *
 */

const { Logger, sc } = require('@reldens/utils');

class JsonFieldsParser
{

    constructor(props)
    {
        this.entitiesConfig = sc.get(props, 'entitiesConfig', {});
        this.jsonFieldsCache = new Map();
    }

    getJsonFieldsForEntity(entityName)
    {
        if(this.jsonFieldsCache.has(entityName)){
            return this.jsonFieldsCache.get(entityName);
        }
        let jsonFields = [];
        let entityConfig = sc.get(this.entitiesConfig, entityName);
        if(!entityConfig){
            Logger.error('Entity not found in configuration: '+entityName);
            return jsonFields;
        }
        if(!sc.hasOwn(entityConfig, 'properties')){
            Logger.error('Missing properties on entity configuration: '+entityName);
            return jsonFields;
        }
        for(let fieldName of Object.keys(entityConfig.properties)){
            if('json' === sc.get(entityConfig.properties[fieldName], 'dbType', '')){
                jsonFields.push(fieldName);
            }
        }
        this.jsonFieldsCache.set(entityName, jsonFields);
        return jsonFields;
    }

    parseJsonFields(data, jsonFields)
    {
        if(!sc.isArray(jsonFields) || 0 === jsonFields.length){
            return data;
        }
        if(sc.isArray(data)){
            for(let item of data){
                this.parseEntityJsonFields(item, jsonFields);
            }
            return data;
        }
        if(sc.isObject(data)){
            this.parseEntityJsonFields(data, jsonFields);
        }
        return data;
    }

    parseEntityJsonFields(entity, jsonFields)
    {
        for(let fieldName of jsonFields){
            if(!sc.hasOwn(entity, fieldName) || !sc.isString(entity[fieldName])){
                continue;
            }
            let parsed = sc.parseJson(entity[fieldName], false);
            if(false !== parsed){
                entity[fieldName] = parsed;
            }
        }
    }

}

module.exports.JsonFieldsParser = JsonFieldsParser;
