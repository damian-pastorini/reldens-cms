#!/usr/bin/env node

/**
 *
 * Reldens - CMS - Generate Entities CLI
 *
 */

const { Manager } = require('../index');
const { Logger } = require('@reldens/utils');
const readline = require('readline');

class CmsEntitiesGenerator
{

    constructor()
    {
        this.args = process.argv.slice(2);
        this.projectRoot = process.cwd();
        this.isOverride = this.args.includes('--override');
    }

    async run()
    {
        if(this.isOverride){
            let confirmed = await this.confirmOverride();
            if(!confirmed){
                Logger.info('Operation cancelled by user.');
                return false;
            }
        }
        let manager = new Manager({projectRoot: this.projectRoot});
        if(!manager.isInstalled()){
            Logger.error('CMS is not installed. Please run installation first.');
            return false;
        }
        Logger.debug('Reldens CMS Manager instance created for entities generation.');
        await manager.initializeDataServer();
        let success = await manager.installer.generateEntities(manager.dataServer, this.isOverride, false);
        if(!success){
            Logger.error('Entities generation failed.');
            return false;
        }
        Logger.info('Entities generation completed successfully!');
        return true;
    }

    async confirmOverride()
    {
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            Logger.warning('WARNING: Using --override will regenerate ALL entities and overwrite existing files.');
            rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
                rl.close();
                resolve('yes' === answer.toLowerCase() || 'y' === answer.toLowerCase());
            });
        });
    }
}

let generator = new CmsEntitiesGenerator();
generator.run().then((success) => {
    if(!success){
        process.exit(1);
    }
    process.exit(0);
}).catch((error) => {
    Logger.critical('Error during entities generation: '+error.message);
    process.exit(1);
});
