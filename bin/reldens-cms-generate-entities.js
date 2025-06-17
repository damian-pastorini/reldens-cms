#!/usr/bin/env node

/**
 *
 * Reldens - CMS - Generate Entities CLI
 *
 */

const { Manager } = require('../index');
const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const readline = require('readline');

class CmsEntitiesGenerator
{

    constructor()
    {
        this.args = process.argv.slice(2);
        this.projectRoot = process.cwd();
        this.config = {};
        this.parseArguments();
    }

    parseArguments()
    {
        for(let i = 0; i < this.args.length; i++){
            let arg = this.args[i];
            if(!arg.startsWith('--')){
                continue;
            }
            let equalIndex = arg.indexOf('=');
            if(-1 === equalIndex){
                let flag = arg.substring(2);
                if('override' === flag || 'dry-prisma' === flag || 'help' === flag || 'h' === flag){
                    this.config[flag] = true;
                }
                continue;
            }
            let key = arg.substring(2, equalIndex);
            let value = arg.substring(equalIndex + 1);
            this.config[key] = value;
        }
    }

    shouldShowHelp()
    {
        return 0 === this.args.length || sc.get(this.config, 'help', false) || sc.get(this.config, 'h', false);
    }

    showHelp()
    {
        Logger.info('');
        Logger.info('Reldens CMS Entities Generator');
        Logger.info('==============================');
        Logger.info('');
        Logger.info('Usage: npx reldens-cms-generate-entities [options]');
        Logger.info('');
        Logger.info('Options:');
        Logger.info('  --prisma-client=[path]           Path to Prisma client (e.g., ./prisma/client)');
        Logger.info('  --driver=[driver]                Storage driver (default: prisma)');
        Logger.info('  --override                       Force regeneration and overwrite existing files');
        Logger.info('  --dry-prisma                     Skip Prisma schema generation');
        Logger.info('  --help, -h                       Show this help message');
        Logger.info('');
        Logger.info('Examples:');
        Logger.info('  npx reldens-cms-generate-entities --prisma-client=./prisma/client --driver=prisma');
        Logger.info('  npx reldens-cms-generate-entities --override --dry-prisma');
        Logger.info('  npx reldens-cms-generate-entities --help');
        Logger.info('');
    }

    get isOverride()
    {
        return sc.get(this.config, 'override', false);
    }

    get isDryPrisma()
    {
        return sc.get(this.config, 'dry-prisma', false);
    }

    get prismaClientPath()
    {
        return sc.get(this.config, 'prisma-client', null);
    }

    get driver()
    {
        return sc.get(this.config, 'driver', process.env.RELDENS_STORAGE_DRIVER || 'prisma');
    }

    async run()
    {
        if(this.shouldShowHelp()){
            this.showHelp();
            return true;
        }
        if(this.isOverride){
            let confirmed = await this.confirmOverride();
            if(!confirmed){
                Logger.info('Operation cancelled by user.');
                return false;
            }
        }
        if(this.isDryPrisma){
            Logger.info('Running in dry-prisma mode - skipping Prisma schema generation.');
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
        let success = await manager.installer.generateEntities(manager.dataServer, this.isOverride, false, this.isDryPrisma);
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
            return false;
        }
        let resolvedPath = clientPath.startsWith('./') 
            ? FileHandler.joinPaths(process.cwd(), clientPath.substring(2))
            : clientPath;
        if(!FileHandler.exists(resolvedPath)){
            Logger.error('Prisma client not found at: '+resolvedPath);
            return false;
        }
        try {
            let PrismaClientModule = require(resolvedPath);
            let PrismaClient = PrismaClientModule.PrismaClient || PrismaClientModule.default?.PrismaClient;
            if(!PrismaClient){
                Logger.error('PrismaClient not found in module: '+resolvedPath);
                return false;
            }
            Logger.debug('Prisma client loaded from: '+resolvedPath);
            return new PrismaClient();
        } catch (error) {
            Logger.error('Failed to load Prisma client from '+resolvedPath+': '+error.message);
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
