/**
 *
 * Reldens - CMS - Installer
 *
 */

const { FileHandler, Encryptor } = require('@reldens/server-utils');
const { DriversMap, EntitiesGenerator, PrismaSchemaGenerator } = require('@reldens/storage');
const { EntitiesLoader } = require('./entities-loader');
const { AdminEntitiesGenerator } = require('./admin-entities-generator');
const { Logger, sc } = require('@reldens/utils');
const mustache = require('mustache');

class Installer
{

    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.appServer = sc.get(props, 'appServer', false);
        this.appServerFactory = sc.get(props, 'appServerFactory', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.projectTemplatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        this.projectPublicPath = FileHandler.joinPaths(this.projectRoot, 'public');
        this.projectPublicAssetsPath = FileHandler.joinPaths(this.projectPublicPath, 'assets');
        this.projectCssPath = FileHandler.joinPaths(this.projectPublicPath, 'css');
        this.projectJsPath = FileHandler.joinPaths(this.projectPublicPath, 'js');
        this.installLockPath = FileHandler.joinPaths(this.projectRoot, 'install.lock');
        this.envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        this.modulePath = FileHandler.joinPaths(__dirname, '..');
        this.installerPath = FileHandler.joinPaths(this.modulePath, 'install');
        this.migrationsPath = FileHandler.joinPaths(this.modulePath, 'migrations');
        this.defaultTemplatesPath = FileHandler.joinPaths(this.modulePath, 'templates');
        this.moduleAdminPath = FileHandler.joinPaths(this.modulePath, 'admin');
        this.moduleAdminAssetsPath = FileHandler.joinPaths(this.moduleAdminPath, 'assets');
        this.moduleAdminTemplatesPath = FileHandler.joinPaths(this.moduleAdminPath, 'templates')
        this.indexTemplatePath = FileHandler.joinPaths(this.defaultTemplatesPath, 'index.js.dist');
        this.postInstallCallback = sc.get(props, 'postInstallCallback', false);
        this.entitiesLoader = new EntitiesLoader({projectRoot: this.projectRoot});
    }

    isInstalled()
    {
        return FileHandler.exists(this.installLockPath);
    }

    async prepareSetup(app, appServer, appServerFactory)
    {
        if(!app){
            Logger.error('Missing app on prepareSetup for Installer.');
            return false;
        }
        if(!appServerFactory){
            Logger.error('Missing appServerFactory on prepareSetup for Installer.');
            return false;
        }
        this.app = app;
        this.appServerFactory = appServerFactory;
        this.appServer = appServer;
        app.use('/install-assets', appServerFactory.applicationFramework.static(this.installerPath, {index: false}));
        app.use(appServerFactory.session({
            secret: Encryptor.generateSecretKey(),
            resave: true,
            saveUninitialized: true
        }));
        app.use(async (req, res, next) => {
            return await this.executeForEveryRequest(req, res, next);
        });
        app.post('/install', async (req, res) => {
            return await this.executeInstallProcess(req, res);
        });
        return true;
    }

    async executeForEveryRequest(req, res, next)
    {
        if(this.isInstalled()){
            return next();
        }
        let urlPath = req._parsedUrl.pathname;
        if('' === urlPath || '/' === urlPath){
            let installerIndexPath = FileHandler.joinPaths(this.installerPath, 'index.html');
            if(!FileHandler.exists(installerIndexPath)){
                return res.status(500).send('Installer template not found.');
            }
            let content = FileHandler.readFile(installerIndexPath);
            let contentParams = req.session?.templateVariables || this.fetchDefaults();
            let errorParam = req.query?.error;
            if(errorParam){
                contentParams.errorMessage = this.getErrorMessage(errorParam);
            }
            return res.send(mustache.render(content, contentParams));
        }
        if('/install' !== urlPath){
            return res.redirect('/');
        }
        next();
    }

    getErrorMessage(errorCode)
    {
        let errorMessages = {
            'invalid-driver': 'Invalid storage driver selected.',
            'connection-failed': 'Database connection failed. Please check your credentials.',
            'raw-query-not-found': 'Query method not found in driver.',
            'sql-file-not-found': 'SQL installation file not found.',
            'sql-tables-creation-failed': 'Failed to create database tables.',
            'sql-default-user-error': 'Failed to create default user.',
            'installation-entities-generation-failed': 'Failed to generate entities.',
            'installation-process-failed': 'Installation process failed.',
            'installation-entities-callback-failed': 'Failed to process entities for callback.',
            'configuration-error': 'Configuration error while completing installation.',
            'already-installed': 'The application is already installed.'
        };
        return errorMessages[errorCode] || 'An unknown error occurred during installation.';
    }

    async executeInstallProcess(req, res)
    {
        if(this.isInstalled()){
            return res.redirect('/?redirect=already-installed');
        }
        let templateVariables = req.body;
        req.session.templateVariables = templateVariables;
        let selectedDriver = templateVariables['db-storage-driver'];
        let driverClass = DriversMap[selectedDriver];
        if(!driverClass){
            Logger.error('Invalid storage driver: ' + selectedDriver);
            return res.redirect('/?error=invalid-driver');
        }
        let dbConfig = {
            client: templateVariables['db-client'],
            config: {
                host: templateVariables['db-host'],
                port: Number(templateVariables['db-port']),
                database: templateVariables['db-name'],
                user: templateVariables['db-username'],
                password: templateVariables['db-password'],
                multipleStatements: true
            },
            debug: false
        };
        if('prisma' === selectedDriver){
            let generatedPrismaSchema = await this.generatePrismaSchema(dbConfig);
            if(!generatedPrismaSchema){
                Logger.error('Could not generated Prisma schema.');
                return res.redirect('/?error=prisma-schema-generation-error');
            }
            Logger.info('Generated Prisma schema.');
        }
        let dbDriver = new driverClass(dbConfig);
        if(!await dbDriver.connect()){
            Logger.error('Connection failed');
            return res.redirect('/?error=connection-failed');
        }
        if(!sc.isObjectFunction(dbDriver, 'rawQuery')){
            Logger.error('Method "rawQuery" not found.');
            return res.redirect('/?error=raw-query-not-found');
        }
        let installSqlPath = FileHandler.joinPaths(this.migrationsPath, 'install.sql');
        if(!FileHandler.exists(installSqlPath)){
            Logger.error('SQL installation file not found.');
            return res.redirect('/?error=sql-file-not-found');
        }
        let queryTablesResult = await this.executeQueryFile(dbDriver, installSqlPath);
        if(!queryTablesResult){
            Logger.error('Tables creation failed.');
            return res.redirect('/?error=sql-tables-creation-failed');
        }
        Logger.info('Installed tables.');
        let defaultUserSqlPath = FileHandler.joinPaths(this.migrationsPath, 'default-user.sql');
        try {
            if(FileHandler.exists(defaultUserSqlPath)){
                let queryUserResult = await this.executeQueryFile(dbDriver, defaultUserSqlPath);
                if(!queryUserResult){
                    Logger.error('Default user creation failed.', queryUserResult);
                    return res.redirect('/?error=sql-default-user-error');
                }
                Logger.info('Created default user.');
            }
            let entitiesGenerationResult = await this.generateEntities(dbDriver);
            if(!entitiesGenerationResult){
                Logger.error('Entities generation error.');
                return res.redirect('/?error=installation-entities-generation-failed');
            }
            Logger.info('Generated entities.');
        } catch (error) {
            Logger.error('Installation error: '+error.message);
            return res.redirect('/?error=installation-process-failed');
        }
        try {
            await this.createEnvFile(templateVariables);
            await this.prepareProjectDirectories();
            await this.copyAdminDirectory();
            await this.createIndexJsFile(templateVariables);
            if(sc.isFunction(this.postInstallCallback)){
                if(this.appServer && sc.isFunction(this.appServer.close)){
                    await this.appServer.close();
                }
                Logger.debug('Running postInstallCallback.');
                await this.postInstallCallback(this.entitiesLoader.loadEntities(selectedDriver));
            }
            await this.createLockFile();
            Logger.info('Installation successful!');
            let successContent = 'Installation successful! Run "node ." to start your CMS.';
            let successFileContent = FileHandler.readFile(FileHandler.joinPaths(this.installerPath, 'success.html'));
            if(successFileContent){
                successContent = mustache.render(successFileContent, {adminPath: templateVariables['app-admin-path']});
            }
            return res.send(successContent);
        } catch (error) {
            Logger.critical('Configuration error: '+error.message);
            return res.redirect('/?error=installation-error');
        }
    }

    async executeQueryFile(dbDriver, filePath)
    {
        let sqlContent = FileHandler.readFile(filePath);
        if(!sqlContent){
            throw new Error('Could not read SQL file: '+filePath);
        }
        return await dbDriver.rawQuery(sqlContent.toString());
    }

    async generateEntities(server)
    {
        let generator = new EntitiesGenerator({server, projectPath: this.projectRoot});
        let success = await generator.generate();
        if(!success){
            Logger.error('Entities generation failed.');
            return false;
        }
        Logger.info('Entities generation success.');
        return true;
    }

    async generatePrismaSchema(connectionData)
    {
        let generator = new PrismaSchemaGenerator({
            ...connectionData,
            prismaSchemaPath: this.projectRoot+'/prisma'
        });
        let success = await generator.generate();
        if(!success){
            Logger.error('Prisma schema generation failed.');
            return false;
        }
        return true;
    }

    async createEnvFile(templateVariables)
    {
        let envTemplatePath = FileHandler.joinPaths(this.defaultTemplatesPath, '.env.dist');
        if(!FileHandler.exists(envTemplatePath)){
            Logger.error('ENV template not found: '+envTemplatePath);
            return false;
        }
        let envTemplate = FileHandler.readFile(envTemplatePath);
        let envContent = mustache.render(envTemplate, {
            dbClient: templateVariables['db-client'],
            dbHost: templateVariables['db-host'],
            dbPort: templateVariables['db-port'],
            dbName: templateVariables['db-name'],
            dbUser: templateVariables['db-username'],
            dbPassword: templateVariables['db-password'],
            dbDriver: templateVariables['db-storage-driver'],
            adminPath: templateVariables['app-admin-path'],
            adminSecret: Encryptor.generateSecretKey(),
            host: templateVariables['app-host'],
            port: templateVariables['app-port']
        });
        return FileHandler.writeFile(this.envFilePath, envContent);
    }

    async createIndexJsFile(templateVariables)
    {
        if(!FileHandler.exists(this.indexTemplatePath)){
            Logger.error('Index.js template not found: '+this.indexTemplatePath);
            return false;
        }
        let indexTemplate = FileHandler.readFile(this.indexTemplatePath);
        let driverKey = templateVariables['db-storage-driver'];
        let indexContent = mustache.render(indexTemplate, {driverKey});
        let indexFilePath = FileHandler.joinPaths(this.projectRoot, 'index.js');
        if(FileHandler.exists(indexFilePath)){
            Logger.info('Index.js file already exists, the CMS installer will not override the existent one.');
            return true;
        }
        return FileHandler.writeFile(indexFilePath, indexContent);
    }

    async createLockFile()
    {
        return FileHandler.writeFile(this.installLockPath, 'Installation completed on '+new Date().toISOString());
    }

    async copyAdminDirectory()
    {
        let projectAdminPath = FileHandler.joinPaths(this.projectRoot, 'admin');
        if(FileHandler.exists(projectAdminPath)){
            Logger.info('Admin folder already exists in project root.');
            return true;
        }
        if(!FileHandler.exists(this.moduleAdminPath)){
            Logger.error('Admin folder not found in module path: '+this.moduleAdminPath);
            return false;
        }
        let projectAdminTemplates = FileHandler.joinPaths(projectAdminPath, 'templates');
        FileHandler.copyFolderSync(this.moduleAdminTemplatesPath, projectAdminTemplates);
        FileHandler.copyFolderSync(this.moduleAdminAssetsPath, this.projectPublicAssetsPath);
        FileHandler.copyFile(
            FileHandler.joinPaths(this.moduleAdminPath, 'reldens-admin-client.css'),
            FileHandler.joinPaths(this.projectCssPath, 'reldens-admin-client.css'),
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.moduleAdminPath, 'reldens-admin-client.js'),
            FileHandler.joinPaths(this.projectJsPath, 'reldens-admin-client.js'),
        );
        Logger.info('Admin folder copied to project root.');
        return true;
    }

    async prepareProjectDirectories()
    {
        FileHandler.createFolder(this.projectTemplatesPath);
        FileHandler.createFolder(this.projectPublicPath);
        FileHandler.createFolder(this.projectPublicAssetsPath);
        FileHandler.createFolder(this.projectCssPath);
        FileHandler.createFolder(this.projectJsPath);
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'page.html'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'page.html')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, '404.html'),
            FileHandler.joinPaths(this.projectTemplatesPath, '404.html')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'layout.html'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'layout.html')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'css', 'styles.css'),
            FileHandler.joinPaths(this.projectCssPath, 'styles.css')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'js', 'scripts.js'),
            FileHandler.joinPaths(this.projectJsPath, 'scripts.js')
        );
        return true;
    }

    fetchDefaults()
    {
        return {
            'app-host': process.env.RELDENS_CMS_HOST || 'http://localhost',
            'app-port': process.env.RELDENS_CMS_PORT || '8000',
            'app-admin-path': process.env.RELDENS_CMS_ADMIN_PATH || '/reldens-admin',
            'db-storage-driver': 'prisma',
            'db-client': process.env.RELDENS_CMS_DB_CLIENT || 'mysql',
            'db-host': process.env.RELDENS_CMS_DB_HOST || 'localhost',
            'db-port': process.env.RELDENS_CMS_DB_PORT || '3306',
            'db-name': process.env.RELDENS_CMS_DB_NAME || 'reldens_cms',
            'db-username': process.env.RELDENS_CMS_DB_USER || '',
            'db-password': process.env.RELDENS_CMS_DB_PASSWORD || ''
        };
    }
}

module.exports.Installer = Installer;
