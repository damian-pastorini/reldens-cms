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
        this.entityAccess = sc.get(props, 'entityAccess', {});
        this.entityAccessCache = new Map();
        this.accessRulesCache = new Map();
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
            this.accessRulesCache.set(rule.entity_name, this.parseAccessRules(rule.access_rules));
        }
    }

    parseAccessRules(accessRules)
    {
        if(sc.isString(accessRules)){
            return sc.toJson(accessRules, {});
        }
        if(sc.isObject(accessRules)){
            return accessRules;
        }
        return {};
    }

    getAccessRules(entityName)
    {
        let configuredRules = sc.get(sc.get(this.entityAccess, entityName, {}), 'accessRules', {});
        if(!this.accessRulesCache.has(entityName)){
            return Object.assign({}, configuredRules);
        }
        return Object.assign({}, configuredRules, this.accessRulesCache.get(entityName));
    }

    resolvePublicAccess(entityName, defaultValue)
    {
        if(!this.entityAccessCache.has(entityName)){
            return defaultValue;
        }
        return Boolean(this.entityAccessCache.get(entityName));
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
        let entity = this.dataServer.getEntity(entityName);
        if(!entity){
            return false;
        }
        let loadedEntity = await this.loadPublicEntity(entity, entityName, pathSegments[1]);
        if(!loadedEntity){
            return false;
        }
        return {entity: loadedEntity, entityName};
    }

    async loadPublicEntity(entity, entityName, entityId)
    {
        let accessRules = this.getAccessRules(entityName);
        let publicConditions = sc.get(accessRules, 'publicConditions', {});
        let filters = Object.assign({}, sc.isObject(publicConditions) ? publicConditions : {}, {id: entityId});
        let publicRelations = sc.get(accessRules, 'publicRelations', []);
        if(!sc.isArray(publicRelations)){
            publicRelations = [];
        }
        if(0 === publicRelations.length){
            return await entity.loadOne(filters);
        }
        return await entity.loadOneWithRelations(filters, publicRelations);
    }

}

module.exports.EntityAccessManager = EntityAccessManager;
