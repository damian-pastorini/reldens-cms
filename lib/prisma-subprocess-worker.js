/**
 *
 * Reldens - CMS - PrismaSubprocessWorker
 *
 */

const { DriversMap } = require('@reldens/storage');
const { MySQLInstaller } = require('./mysql-installer');
const { Logger } = require('@reldens/utils');
const { sc } = require('@reldens/utils');

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
                setTimeout(() => process.exit(1), 100);
            }
        });
        process.on('uncaughtException', (error) => {
            Logger.error('PrismaSubprocessWorker uncaught exception: '+error.message);
            this.sendErrorResponse(error.message);
            setTimeout(() => process.exit(1), 100);
        });
        process.on('unhandledRejection', (error) => {
            Logger.error('PrismaSubprocessWorker unhandled rejection: '+error.message);
            this.sendErrorResponse(error.message);
            setTimeout(() => process.exit(1), 100);
        });
    }

    async processIncomingMessage(message)
    {
        let dbConfig = sc.get(message, 'dbConfig', {});
        let templateVariables = sc.get(message, 'templateVariables', {});
        let migrationsPath = sc.get(message, 'migrationsPath', './migrations');
        let projectRoot = sc.get(message, 'projectRoot', './');
        let generatedClient = await MySQLInstaller.generateMinimalPrismaClient(dbConfig, projectRoot);
        if(!generatedClient){
            this.sendErrorResponse('Failed to generate Prisma client.');
            return;
        }
        dbConfig.prismaClient = generatedClient;
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
        await generatedClient.$disconnect();
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
