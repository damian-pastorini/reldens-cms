/**
 *
 * Reldens - EntitiesLoader
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class EntitiesLoader
{

    constructor(props)
    {
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.generatedEntitiesModelsFolder = FileHandler.joinPaths(this.projectRoot, 'generated-entities', 'models');
    }

    loadEntities(driverKey)
    {
        let entitiesPath = FileHandler.joinPaths(
            this.generatedEntitiesModelsFolder,
            driverKey,
            'registered-models-'+driverKey+'.js'
        );
        if(!FileHandler.exists(entitiesPath)){
            Logger.warning('Entities file not found: ' + entitiesPath);
            return {};
        }
        try {
            let loadedEntities = require(entitiesPath);
            return {
                entities: loadedEntities.entitiesConfig,
                entitiesRaw: loadedEntities.rawRegisteredEntities,
                translations: loadedEntities.entitiesTranslations,
            }
        } catch(error){
            Logger.error('Failed to load generated entities: ' + error.message);
        }
        return {};
    }

}

module.exports.EntitiesLoader = EntitiesLoader;
