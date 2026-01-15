#!/usr/bin/env node

/**
 *
 * Reldens - CMS - Generate Sitemap CLI
 *
 */

const { Manager } = require('../index');
const { SitemapGenerator } = require('../lib/sitemap-generator');
const { EntitiesLoader } = require('../lib/entities-loader');
const { PrismaClientLoader } = require('@reldens/storage');
const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const dotenv = require('dotenv');

class CmsSitemapGenerator
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
                if('help' === flag || 'h' === flag){
                    this.config[flag] = true;
                }
                continue;
            }
            this.config[arg.substring(2, equalIndex)] = arg.substring(equalIndex+1);
        }
    }

    shouldShowHelp()
    {
        return sc.get(this.config, 'help', false) || sc.get(this.config, 'h', false);
    }

    showHelp()
    {
        Logger.info('');
        Logger.info('Reldens CMS Sitemap Generator');
        Logger.info('=============================');
        Logger.info('');
        Logger.info('Usage: npx reldens-cms-generate-sitemap [options]');
        Logger.info('');
        Logger.info('Options:');
        Logger.info('  --domain=[domain]                Generate sitemap for specific domain');
        Logger.info('  --help, -h                       Show this help message');
        Logger.info('');
        Logger.info('Examples:');
        Logger.info('  npx reldens-cms-generate-sitemap');
        Logger.info('  npx reldens-cms-generate-sitemap --domain=example.com');
        Logger.info('  npx reldens-cms-generate-sitemap --help');
        Logger.info('');
        Logger.info('Note: Generates sitemap.xml files from enabled CMS routes.');
        Logger.info('Note: Files are saved to public/sitemap/[domain]/sitemap.xml');
        Logger.info('Note: A sitemap index is created at public/sitemap.xml');
        Logger.info('');
    }

    async run()
    {
        if(this.shouldShowHelp()){
            this.showHelp();
            return true;
        }
        let domain = sc.get(this.config, 'domain', null);
        let envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        dotenv.config({path: envFilePath});
        let storageDriver = process.env.RELDENS_STORAGE_DRIVER || 'prisma';
        Logger.debug('Using storage driver: '+storageDriver);
        let entitiesLoader = new EntitiesLoader({projectRoot: this.projectRoot});
        let loadedEntities = entitiesLoader.loadEntities(storageDriver);
        if(!loadedEntities || !loadedEntities.rawRegisteredEntities){
            Logger.error('Failed to load entities for driver: '+storageDriver);
            Logger.error('Make sure you have run "npx reldens-cms-generate-entities" first.');
            return false;
        }
        Logger.debug('Loaded entities for driver: '+storageDriver);
        let managerConfig = {
            projectRoot: this.projectRoot,
            rawRegisteredEntities: loadedEntities.rawRegisteredEntities,
            entitiesConfig: loadedEntities.entitiesConfig,
            entitiesTranslations: loadedEntities.entitiesTranslations
        };
        if('prisma' === storageDriver){
            let prismaClient = PrismaClientLoader.load(this.projectRoot, null, null);
            if(prismaClient){
                managerConfig.prismaClient = prismaClient;
                Logger.debug('Prisma client loaded and configured.');
            }
        }
        let manager = new Manager(managerConfig);
        if(!manager.isInstalled()){
            Logger.error('CMS is not installed. Please run installation first.');
            return false;
        }
        Logger.debug('Reldens CMS Manager instance created for sitemap generation.');
        if(!await manager.initializeDataServer()){
            Logger.error('Failed to initialize data server.');
            return false;
        }
        Logger.debug('Data server initialized successfully.');
        let sitemapGenerator = new SitemapGenerator({
            dataServer: manager.dataServer,
            projectRoot: this.projectRoot,
            defaultDomain: manager.defaultDomain,
            domainMapping: manager.domainMapping,
            domainPublicUrlMapping: manager.domainPublicUrlMapping
        });
        if(!await sitemapGenerator.generate(domain)){
            Logger.error('Sitemap generation failed.');
            return false;
        }
        if(domain){
            Logger.info('Sitemap generated successfully for domain: '+domain);
        }
        if(!domain){
            Logger.info('Sitemaps generated successfully for all domains.');
        }
        return true;
    }

}

let generator = new CmsSitemapGenerator();
generator.run().then((success) => {
    if(!success){
        process.exit(1);
    }
    process.exit(0);
}).catch((error) => {
    Logger.critical('Error during sitemap generation: '+error.message);
    process.exit(1);
});
