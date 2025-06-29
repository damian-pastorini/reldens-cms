/**
 *
 * Reldens - CMS - EntityLoader
 *
 */

const { sc } = require('@reldens/utils');

class EntityLoader
{

    constructor(props)
    {
        this.jsonFieldsParser = sc.get(props, 'jsonFieldsParser', false);
    }

    parseRelationsString(relationsString)
    {
        if(!relationsString || '' === relationsString.trim()){
            return [];
        }
        return relationsString.split(',').map(relation => relation.trim()).filter(relation => '' !== relation);
    }

    async loadEntityData(entity, filters, queryOptions, relationsString, tableName)
    {
        this.applyQueryOptions(entity, queryOptions);
        let relations = this.parseRelationsString(relationsString);
        let result = 0 < relations.length
            ? await entity.loadWithRelations(filters, relations)
            : 0 < Object.keys(filters).length ? await entity.load(filters) : await entity.loadAll();
        if(this.jsonFieldsParser){
            return this.jsonFieldsParser.parseJsonFields(
                result,
                this.jsonFieldsParser.getJsonFieldsForEntity(tableName)
            );
        }
        return result;
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

module.exports.EntityLoader = EntityLoader;
