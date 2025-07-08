/**
 *
 * Reldens - CMS - Frontend - EntityAccessManager
 *
 */

const { Logger, sc } = require('@reldens/utils');

class EntityAccessManager
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.entityAccessCache = new Map();
    }

    async loadEntityAccessRules()
    {
        let accessEntity = this.dataServer.getEntity('entitiesAccess');
        if(!accessEntity){
            Logger.warning('Entities Access not found.');
            return;
        }
        let accessRules = await accessEntity.loadAll();
        for(let rule of accessRules){
            this.entityAccessCache.set(rule.entity_name, rule.is_public);
        }
    }

    async isEntityAccessible(entityName)
    {
        if(this.entityAccessCache.has(entityName)){
            return this.entityAccessCache.get(entityName);
        }
        return false;
    }

    async findEntityByPath(path)
    {
        let pathSegments = path.split('/').filter(segment => '' !== segment);
        if(2 > pathSegments.length){
            return false;
        }
        let entityName = pathSegments[0];
        if(!await this.isEntityAccessible(entityName)){
            return false;
        }
        let entityId = pathSegments[1];
        let entity = this.dataServer.getEntity(entityName);
        if(!entity){
            return false;
        }
        let loadedEntity = await entity.loadByIdWithRelations(entityId);
        if(!loadedEntity){
            return false;
        }
        return {entity: loadedEntity, entityName};
    }

}

module.exports.EntityAccessManager = EntityAccessManager;
