/**
 *
 * Reldens - CMS - PrismaSubprocessWorker
 *
 */

const { PrismaSchemaGenerator } = require('@reldens/storage/lib/prisma/prisma-schema-generator');
const { Logger, sc } = require('@reldens/utils');

class PrismaSubprocessWorker
{

    constructor()
    {
        this.setupProcessHandlers();
    }

    setupProcessHandlers()
    {
        process.on('message', async (message) => {
            try {
                await this.processIncomingMessage(message);
            } catch(error) {
                Logger.error('PrismaSubprocessWorker error: '+error.message);
                this.sendErrorResponse(error.message);
                process.exit(1);
            }
        });
        process.on('uncaughtException', (error) => {
            Logger.error('PrismaSubprocessWorker uncaught exception: '+error.message);
            this.sendErrorResponse(error.message);
            process.exit(1);
        });
        process.on('unhandledRejection', (error) => {
            Logger.error('PrismaSubprocessWorker unhandled rejection: '+error.message);
            this.sendErrorResponse(error.message);
            process.exit(1);
        });
    }

    async processIncomingMessage(message)
    {
        let dbConfig = sc.get(message, 'dbConfig', {});
        let templateVariables = sc.get(message, 'templateVariables', {});
        let migrationsPath = sc.get(message, 'migrationsPath', './migrations');
        let projectRoot = sc.get(message, 'projectRoot', './');
        PrismaSchemaGenerator.ensureStubFiles(projectRoot);
        let { MySQLInstaller } = require('./mysql-installer');
        let generatedModules = await MySQLInstaller.generateMinimalPrismaClient(
            dbConfig,
            projectRoot,
            sc.get(message, 'prismaAdapter', '@prisma/adapter-mariadb'),
            sc.get(message, 'prismaAdapterClass', 'PrismaMariaDb')
        );
        if(!generatedModules){
            this.sendErrorResponse('Failed to generate Prisma client.');
            return;
        }
        dbConfig.prismaModules = generatedModules;
        let { DriversMap } = require('@reldens/storage');
        let driverClass = DriversMap['prisma'];
        if(!driverClass){
            this.sendErrorResponse('Prisma driver class not found.');
            return;
        }
        let dbDriver = new driverClass(dbConfig);
        if(!await dbDriver.connect()){
            this.sendErrorResponse('Database connection failed.');
            return;
        }
        let migrationFiles = MySQLInstaller.migrationFiles();
        for(let checkboxName of Object.keys(migrationFiles)){
            let fileName = migrationFiles[checkboxName];
            let redirectError = await MySQLInstaller.executeQueryFile(
                sc.get(templateVariables, checkboxName, 'off'),
                fileName,
                dbDriver,
                migrationsPath
            );
            if('' !== redirectError){
                this.sendErrorResponse('Migration failed: '+fileName);
                return;
            }
        }
        await generatedModules.client.$disconnect();
        this.sendSuccessResponse('Subprocess installation completed.');
    }

    sendSuccessResponse(message)
    {
        process.send({success: true, message: message});
    }

    sendErrorResponse(errorMessage)
    {
        process.send({success: false, error: errorMessage});
    }

}

module.exports.PrismaSubprocessWorker = PrismaSubprocessWorker;

new PrismaSubprocessWorker();
