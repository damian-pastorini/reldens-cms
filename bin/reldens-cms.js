#!/usr/bin/env node

/**
 *
 * Reldens - CMS - CLI Installer
 *
 */

const { Manager } = require('../index');
const { Logger } = require('@reldens/utils');

let args = process.argv.slice(2);
let projectRoot = args[0] || process.cwd();

let manager = new Manager({projectRoot});
Logger.debug('Reldens CMS Manager instance created.', {configuration: manager.config});

let started =  manager.start().then((result) => {
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

if(!started){
    Logger.error('Reldens CMS start process failed.');
    process.exit();
}
