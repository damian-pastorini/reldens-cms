/**
 *
 * Reldens - EntitiesLoader
 *
 */

const { LoadedEntitiesProcessor } = require('./loaded-entities-processor');
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
            let {rawRegisteredEntities, entitiesConfig, entitiesTranslations} = require(entitiesPath);
            return LoadedEntitiesProcessor.process(rawRegisteredEntities, entitiesTranslations, entitiesConfig);
        } catch(error){
            Logger.error('Failed to load generated entities: ' + error.message);
        }
        return {};
    }

}

module.exports.EntitiesLoader = EntitiesLoader;
