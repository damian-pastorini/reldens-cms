/**
 *
 * Reldens - CMS - MySQLInstaller
 *
 */

const { execSync } = require('child_process');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class MySQLInstaller
{

    static migrationFiles()
    {
        return {
            'install-cms-tables': 'install.sql',
            'install-user-auth': 'users-authentication.sql',
            'install-default-user': 'default-user.sql',
            'install-default-homepage': 'default-homepage.sql',
            'install-default-blocks': 'default-blocks.sql',
            'install-entity-access': 'default-entity-access.sql',
            'install-dynamic-forms': 'default-forms.sql',
            'install-seo-files': 'default-sitemaps-and-robots.sql'
        };
    }

    static async executeQueryFile(isMarked, fileName, dbDriver, migrationsPath)
    {
        if('on' !== isMarked){
            return '';
        }
        let sqlFileContent = FileHandler.readFile(FileHandler.joinPaths(migrationsPath, fileName));
        if(!sqlFileContent){
            Logger.error('SQL file "'+fileName+'" not found.');
            return '/?error=sql-file-not-found&file-name='+fileName;
        }
        let queryExecutionResult = await dbDriver.rawQuery(sqlFileContent);
        if(!queryExecutionResult){
            Logger.error('SQL file "'+fileName+'" raw execution failed.');
            return '/?error=sql-file-execution-error&file-name='+fileName;
        }
        Logger.info('SQL file "'+fileName+'" raw execution successfully.');
        return '';
    }

    static normalizePrismaProvider(client)
    {
        if(-1 !== client.indexOf('mysql')){
            return 'mysql';
        }
        if('postgresql' === client || 'postgres' === client){
            return 'postgresql';
        }
        if('mongodb' === client){
            return 'mongodb';
        }
        return client;
    }

    static async generateMinimalPrismaClient(dbConfig, projectRoot)
    {
        let prismaPath = FileHandler.joinPaths(projectRoot, 'prisma');
        let schemaPath = FileHandler.joinPaths(prismaPath, 'schema.prisma');
        FileHandler.createFolder(prismaPath);
        let provider = MySQLInstaller.normalizePrismaProvider(sc.get(dbConfig, 'client', 'mysql'));
        let schemaContent = 'generator client {\n'
            + '  provider = "prisma-client-js"\n'
            + '  output = "./client"\n'
            + '}\n'
            + '\n'
            + 'datasource db {\n'
            + '  provider = "'+provider+'"\n'
            + '  url = env("RELDENS_DB_URL")\n'
            + '}';
        FileHandler.writeFile(schemaPath, schemaContent);
        Logger.info('Running prisma generate...');
        try {
            execSync('npx prisma generate', { stdio: 'inherit', cwd: projectRoot });
            let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
            let { PrismaClient } = require(clientPath);
            return new PrismaClient();
        } catch(error) {
            Logger.error('Prisma generate failed: '+error.message);
            return false;
        }
    }

    static async createPrismaClient(projectRoot)
    {
        try {
            let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
            if(!FileHandler.exists(clientPath)){
                return false;
            }
            const { PrismaClient } = require(clientPath);
            let client = new PrismaClient();
            await client.$connect();
            return client;
        } catch(error){
            Logger.error('Prisma client creation failed: '+error.message);
            return false;
        }
    }

}

module.exports.MySQLInstaller = MySQLInstaller;
