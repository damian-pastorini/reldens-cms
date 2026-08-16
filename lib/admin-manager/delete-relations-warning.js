/**
 *
 * Reldens - DeleteRelationsWarning
 *
 * Builds the delete confirmation warning for an entity by grouping every entity that references it, using the
 * relation onDelete rule: "cascade" means the related records are deleted with it, "setNull" and "setDefault"
 * mean they are kept and only unlinked, and anything else (restrict, no action, or an unknown rule) is reported
 * as possibly blocking the delete instead of claiming an outcome that will not happen.
 *
 */

const { sc } = require('@reldens/utils');

class DeleteRelationsWarning
{

    constructor(props)
    {
        this.translations = props.translations;
        this.resources = props.resources;
    }

    buildReverseRelationsMap()
    {
        let reverseRelations = {};
        for(let resource of this.resources()){
            let childLabel = sc.get(this.translations.labels, resource.id(), resource.id());
            this.addResourceReverseRelations(reverseRelations, resource.options.properties, childLabel);
        }
        return reverseRelations;
    }

    addResourceReverseRelations(reverseRelations, properties, childLabel)
    {
        for(let propertyKey of Object.keys(properties)){
            let property = properties[propertyKey];
            if('reference' !== property.type){
                continue;
            }
            if(!reverseRelations[property.reference]){
                reverseRelations[property.reference] = {deleted: [], unlinked: [], blocking: []};
            }
            let relationGroup = this.fetchRelationGroup(property.onDelete);
            if(-1 === reverseRelations[property.reference][relationGroup].indexOf(childLabel)){
                reverseRelations[property.reference][relationGroup].push(childLabel);
            }
        }
    }

    fetchRelationGroup(onDelete)
    {
        if('cascade' === onDelete){
            return 'deleted';
        }
        if('setNull' === onDelete || 'setDefault' === onDelete){
            return 'unlinked';
        }
        return 'blocking';
    }

    fetchWarning(entityId, reverseRelations)
    {
        return this.buildRelationsSentence(entityId, reverseRelations, 'deleted', 'confirmDeleteRelations')
            +this.buildRelationsSentence(entityId, reverseRelations, 'unlinked', 'confirmUnlinkRelations')
            +this.buildRelationsSentence(entityId, reverseRelations, 'blocking', 'confirmBlockingRelations');
    }

    buildRelationsSentence(entityId, reverseRelations, relationGroup, messageKey)
    {
        let childLabels = sc.get(sc.get(reverseRelations, entityId, {}), relationGroup, []);
        if(0 === childLabels.length){
            return '';
        }
        return ' '+this.translations.messages[messageKey]+' '+[...childLabels].sort().join(', ')+'.';
    }

}

module.exports.DeleteRelationsWarning = DeleteRelationsWarning;
