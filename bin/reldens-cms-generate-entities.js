#!/usr/bin/env node

/**
 *
 * Reldens - CMS - Generate Entities CLI
 *
 */

const { Manager } = require('../index');
const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const readline = require('readline');

class CmsEntitiesGenerator
{

    constructor()
    {
        this.args = process.argv.slice(2);
        this.projectRoot = process.cwd();
        this.isOverride = this.args.includes('--override');
        this.prismaClientPath = this.extractArgument('--prisma-client');
        this.driver = this.extractArgument('--driver') || process.env.RELDENS_STORAGE_DRIVER || 'prisma';
    }

    extractArgument(argumentName)
    {
        let argIndex = this.args.indexOf(argumentName);
        if(-1 === argIndex || argIndex + 1 >= this.args.length){
            return null;
        }
        return this.args[argIndex + 1];
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
        let managerConfig = {projectRoot: this.projectRoot};
        if('prisma' === this.driver){
            let prismaClient = await this.loadPrismaClient();
            if(prismaClient){
                managerConfig.prismaClient = prismaClient;
            }
        }
        let manager = new Manager(managerConfig);
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

    async loadPrismaClient()
    {
        let clientPath = this.prismaClientPath;
        if(!clientPath){
            clientPath = FileHandler.joinPaths(process.cwd(), 'generated-entities', 'prisma');
        }
        if(!FileHandler.exists(clientPath)){
            Logger.error('Prisma client not found at: '+clientPath);
            Logger.error('Please ensure the client exists or specify a custom path with --prisma-client');
            return false;
        }
        try {
            let PrismaClientModule = require(clientPath);
            let PrismaClient = PrismaClientModule.PrismaClient || PrismaClientModule.default?.PrismaClient;
            if(!PrismaClient){
                Logger.error('PrismaClient not found in module: '+clientPath);
                return false;
            }
            Logger.debug('Prisma client loaded from: '+clientPath);
            return new PrismaClient();
        } catch (error) {
            Logger.error('Failed to load Prisma client from '+clientPath+': '+error.message);
            return false;
        }
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
