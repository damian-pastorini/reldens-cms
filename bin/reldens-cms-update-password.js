#!/usr/bin/env node

/**
 *
 * Reldens - CMS - Update Password CLI
 *
 */

const { Manager } = require('../index');
const { EntitiesLoader } = require('../lib/entities-loader');
const { Logger, sc } = require('@reldens/utils');
const { FileHandler, Encryptor } = require('@reldens/server-utils');
const dotenv = require('dotenv');
const readline = require('readline');

class CmsPasswordUpdater
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
        Logger.info('Reldens CMS Password Updater');
        Logger.info('============================');
        Logger.info('');
        Logger.info('Usage: npx reldens-cms-update-password [options]');
        Logger.info('');
        Logger.info('Options:');
        Logger.info('  --email=[email]                  User email address');
        Logger.info('  --username=[username]            User username');
        Logger.info('  --password=[password]            New password (prompted if not provided)');
        Logger.info('  --help, -h                       Show this help message');
        Logger.info('');
        Logger.info('Examples:');
        Logger.info('  npx reldens-cms-update-password --email=admin@example.com');
        Logger.info('  npx reldens-cms-update-password --username=admin');
        Logger.info('  npx reldens-cms-update-password --email=admin@example.com --password=newpass123');
        Logger.info('');
        Logger.info('Note: You must provide either --email or --username to identify the user.');
        Logger.info('Note: The tool uses the storage driver configured in your .env file (RELDENS_STORAGE_DRIVER).');
        Logger.info('');
    }

    get email()
    {
        return sc.get(this.config, 'email', null);
    }

    get username()
    {
        return sc.get(this.config, 'username', null);
    }

    get password()
    {
        return sc.get(this.config, 'password', null);
    }

    async run()
    {
        if(this.shouldShowHelp()){
            this.showHelp();
            return true;
        }
        if(!this.email && !this.username){
            Logger.error('Error: You must provide either --email or --username to identify the user.');
            Logger.info('Run with --help for usage information.');
            return false;
        }
        let newPassword = this.password;
        if(!newPassword){
            newPassword = await this.promptPassword();
            if(!newPassword){
                Logger.error('Error: Password cannot be empty.');
                return false;
            }
        }
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
            let prismaClient = this.loadPrismaClient();
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
        Logger.debug('Reldens CMS Manager instance created for password update.');
        let initResult = await manager.initializeDataServer();
        if(!initResult){
            Logger.error('Failed to initialize data server.');
            return false;
        }
        Logger.debug('Data server initialized successfully.');
        let success = await this.updateUserPassword(manager.dataServer, newPassword);
        if(!success){
            Logger.error('Password update failed.');
            return false;
        }
        Logger.info('Password updated successfully!');
        return true;
    }

    loadPrismaClient()
    {
        let clientPath = FileHandler.joinPaths(this.projectRoot, 'prisma', 'client');
        if(!FileHandler.exists(clientPath)){
            Logger.debug('Prisma client path not found: '+clientPath);
            return false;
        }
        try {
            let { PrismaClient } = require(clientPath);
            return new PrismaClient();
        } catch(error) {
            Logger.error('Failed to load Prisma client: '+error.message);
            return false;
        }
    }

    async promptPassword()
    {
        let rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve) => {
            rl.question('Enter new password: ', (password) => {
                rl.question('Confirm new password: ', (confirmPassword) => {
                    rl.close();
                    if(password !== confirmPassword){
                        Logger.error('Passwords do not match.');
                        resolve(null);
                        return;
                    }
                    resolve(password);
                });
            });
        });
    }

    async updateUserPassword(dataServer, newPassword)
    {
        let usersEntity = dataServer.getEntity('users');
        if(!usersEntity){
            Logger.error('Users entity not found.');
            return false;
        }
        let user = null;
        if(this.email){
            Logger.info('Looking up user by email: '+this.email);
            user = await usersEntity.loadOneBy('email', this.email);
        }
        if(!user && this.username){
            Logger.info('Looking up user by username: '+this.username);
            user = await usersEntity.loadOneBy('username', this.username);
        }
        if(!user){
            Logger.error('User not found with provided credentials.');
            return false;
        }
        Logger.info('User found: '+user.email+' ('+user.username+')');
        let encryptedPassword = Encryptor.encryptPassword(newPassword);
        if(!encryptedPassword){
            Logger.error('Failed to encrypt password.');
            return false;
        }
        Logger.debug('Password encrypted successfully.');
        try {
            let updateResult = await usersEntity.updateById(user.id, {password: encryptedPassword});
            if(!updateResult){
                Logger.error('Failed to update password in database.');
                return false;
            }
            Logger.info('Password updated in database for user: '+user.email);
            return true;
        } catch(error) {
            Logger.error('Error updating password: '+error.message);
            return false;
        }
    }

}

let updater = new CmsPasswordUpdater();
updater.run().then((success) => {
    if(!success){
        process.exit(1);
    }
    process.exit(0);
}).catch((error) => {
    Logger.critical('Error during password update: '+error.message);
    process.exit(1);
});
