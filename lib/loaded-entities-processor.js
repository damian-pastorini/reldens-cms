/**
 *
 * Reldens - LoadedEntitiesProcessor
 *
 */

const { sc } = require('@reldens/utils');

class LoadedEntitiesProcessor
{

    process(rawRegisteredEntities, entitiesTranslations, entitiesConfig)
    {
        let exportedEntitiesList = Object.keys(rawRegisteredEntities);
        if(0 === exportedEntitiesList.length){
            return {};
        }
        let entities = {};
        for (let i of exportedEntitiesList) {
            entities[i] = {
                rawEntity: rawRegisteredEntities[i],
                config: sc.isFunction(entitiesConfig) ? entitiesConfig(props)[i] : entitiesConfig[i]
            };
        }
        return {entities, entitiesRaw: rawRegisteredEntities, translations: entitiesTranslations};
    }

}

module.exports.LoadedEntitiesProcessor = new LoadedEntitiesProcessor();
