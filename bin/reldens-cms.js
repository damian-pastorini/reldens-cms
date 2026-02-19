#!/usr/bin/env node

/**
 *
 * Reldens - CMS - CLI
 *
 */

const { Manager } = require('../index');
const { Logger } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');
const readline = require('readline');
const dotenv = require('dotenv');

let args = process.argv.slice(2);
let projectRoot = args[0] || process.cwd();
let indexPath = FileHandler.joinPaths(projectRoot, 'index.js');

if(FileHandler.exists(indexPath)){
    require(indexPath);
    return;
}

async function checkRequiredPackages(projectRoot)
{
    let requiredPackages = ['@reldens/cms'];
    let missingPackages = [];
    for(let packageName of requiredPackages){
        let packagePath = FileHandler.joinPaths(projectRoot, 'node_modules', packageName);
        if(!FileHandler.exists(packagePath)){
            missingPackages.push(packageName);
        }
    }
    let packagePath = FileHandler.joinPaths(projectRoot, 'node_modules', '@prisma/client');
    if(!FileHandler.exists(packagePath)){
        missingPackages.push('@prisma/client');
    }
    return missingPackages;
}

async function promptUserConfirmation(packages)
{
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        Logger.info('Missing required packages: '+packages.join(', '));
        Logger.info('These packages are required for the CMS to function properly.');
        rl.question('Would you like to install them automatically? (y/N): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

async function installPackages(packages, projectRoot)
{
    try {
        Logger.info('Installing packages: npm install '+packages.join(' '));
        let {execSync} = require('child_process');
        let installCommand = 'npm install '+packages.join(' ');
        execSync(installCommand, {stdio: 'inherit', cwd: projectRoot});
        Logger.info('Dependencies installed successfully.');
        return true;
    } catch(error) {
        Logger.error('Failed to install dependencies: '+error.message);
        Logger.error('Please run manually: npm install '+packages.join(' '));
        return false;
    }
}

async function handlePackageInstallation(projectRoot)
{
    let missingPackages = await checkRequiredPackages(projectRoot);
    if(0 === missingPackages.length){
        return true;
    }
    let userConfirmed = await promptUserConfirmation(missingPackages);
    if(!userConfirmed){
        Logger.info('Installation cancelled. Please install required packages manually and try again.');
        return false;
    }
    return await installPackages(missingPackages, projectRoot);
}

async function createPrismaClientIfNeeded(projectRoot)
{
    let envFilePath = FileHandler.joinPaths(projectRoot, '.env');
    dotenv.config({path: envFilePath});
    let storageDriver = process.env.RELDENS_STORAGE_DRIVER || 'prisma';
    if('prisma' !== storageDriver){
        return false;
    }
    let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
    if(!FileHandler.exists(clientPath)){
        Logger.critical('Prisma client not found at: '+clientPath);
        Logger.critical('Please run "npx prisma generate" to generate the Prisma client.');
        return false;
    }
    try {
        let { PrismaClient } = require(clientPath);
        return new PrismaClient();
    } catch(error) {
        Logger.critical('Failed to initialize Prisma client: '+error.message);
        return false;
    }
}

async function startManagerProcess()
{
    let packageInstallResult = await handlePackageInstallation(projectRoot);
    if(!packageInstallResult){
        process.exit(1);
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

    let prismaClient = await createPrismaClientIfNeeded(projectRoot);
    if(prismaClient){
        managerConfig.prismaClient = prismaClient;
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
}

startManagerProcess().catch((error) => {
    Logger.critical('Failed to handle package installation:', error);
    process.exit(1);
});
