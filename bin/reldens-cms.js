#!/usr/bin/env node

/**
 *
 * Reldens - CMS - CLI Installer
 *
 */

const { Manager } = require('../index');
const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

let args = process.argv.slice(2);
let projectRoot = args[0] || process.cwd();
let indexPath = FileHandler.joinPaths(projectRoot, 'index.js');

if(FileHandler.exists(indexPath)){
    require(indexPath);
    return;
}

let managerConfig = {projectRoot};
let entitiesPath = FileHandler.joinPaths(
    projectRoot, 
    'generated-entities', 
    'models', 
    'prisma', 
    'registered-models-prisma.js'
);

if(FileHandler.exists(entitiesPath)){
    let entitiesModule = require(entitiesPath);
    managerConfig.rawRegisteredEntities = entitiesModule.rawRegisteredEntities;
    managerConfig.entitiesConfig = entitiesModule.entitiesConfig;
    managerConfig.entitiesTranslations = entitiesModule.entitiesTranslations;
}

let manager = new Manager(managerConfig);
Logger.debug('Reldens CMS Manager instance created.', {configuration: manager.config});

manager.start().then((result) => {
    if(!result){
        Logger.info('Reldens CMS started by command failed.');
        return false;
    }
    Logger.info('Reldens CMS started by command.');
    return true;
}).catch((error) => {
    Logger.critical('Failed to start CMS:', error);
    process.exit();
});