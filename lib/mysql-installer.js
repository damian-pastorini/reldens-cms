/**
 *
 * Reldens - CMS - MySQLInstaller
 *
 */

const { execSync } = require('child_process');
const { ManagerServicesInitializer } = require('./manager-services-initializer');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { PrismaSchemaGenerator } = require('@reldens/storage');

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

    static buildMinimalSchemaContent(provider)
    {
        return 'generator client {\n  provider = "prisma-client-js"\n  output = "./client"\n}\n\n'
            +'datasource db {\n  provider = "'+provider+'"\n}';
    }

    static async generateMinimalPrismaClient(dbConfig, projectRoot, prismaAdapter, prismaAdapterClass)
    {
        PrismaSchemaGenerator.ensureStubFiles(projectRoot);
        let generator = new PrismaSchemaGenerator({
            ...dbConfig,
            config: sc.get(dbConfig, 'config', dbConfig),
            clientOutputPath: FileHandler.joinPaths(projectRoot, 'prisma', 'client'),
            prismaSchemaPath: FileHandler.joinPaths(projectRoot, 'prisma')
        });
        FileHandler.createFolder(FileHandler.joinPaths(projectRoot, 'prisma'));
        FileHandler.writeFile(
            FileHandler.joinPaths(projectRoot, 'prisma', 'schema.prisma'),
            MySQLInstaller.buildMinimalSchemaContent(
                MySQLInstaller.normalizePrismaProvider(sc.get(dbConfig, 'client', 'mysql'))
            )
        );
        generator.setDatabaseEnvironmentVariables();
        generator.generateConfigFile();
        Logger.info('Running prisma generate...');
        try {
            execSync('npx prisma generate', { stdio: 'inherit', cwd: projectRoot });
        } catch(error) {
            Logger.error('Prisma generate failed: '+error.message);
            return false;
        }
        return MySQLInstaller.createPrismaClient(projectRoot, prismaAdapter, prismaAdapterClass);
    }

    static createPrismaClient(projectRoot, prismaAdapter, prismaAdapterClass)
    {
        return ManagerServicesInitializer.loadPrismaModules(projectRoot, null, null, prismaAdapter, prismaAdapterClass);
    }

}

module.exports.MySQLInstaller = MySQLInstaller;
