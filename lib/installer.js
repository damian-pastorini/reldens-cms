/**
 *
 * Reldens - CMS - Installer
 *
 */

const { FileHandler, Encryptor } = require('@reldens/server-utils');
const { DriversMap, DriversClassMap, EntitiesGenerator, PrismaSchemaGenerator } = require('@reldens/storage');
const { EntitiesLoader } = require('./entities-loader');
const { Logger, sc } = require('@reldens/utils');

class Installer
{

    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.appServer = sc.get(props, 'appServer', false);
        this.appServerFactory = sc.get(props, 'appServerFactory', false);
        this.renderEngine = sc.get(props, 'renderEngine', false);
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

    async prepareSetup(app, appServer, appServerFactory, renderEngine)
    {
        if(!app){
            Logger.error('Missing app on prepareSetup for Installer.');
            return false;
        }
        if(!appServerFactory){
            Logger.error('Missing appServerFactory on prepareSetup for Installer.');
            return false;
        }
        if(!renderEngine){
            Logger.error('Missing renderEngine for Installer.');
            return false;
        }
        this.app = app;
        this.appServerFactory = appServerFactory;
        this.appServer = appServer;
        this.renderEngine = renderEngine;
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
            return res.send(this.renderEngine.render(content, contentParams));
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
            'sql-cms-tables-creation-failed': 'Failed to create CMS tables.',
            'sql-user-auth-creation-failed': 'Failed to create user authentication tables.',
            'sql-default-user-error': 'Failed to create default user.',
            'sql-default-homepage-error': 'Failed to create default homepage.',
            'installation-entities-generation-failed': 'Failed to generate entities.',
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
        let executeFiles = {
            'install-cms-tables': 'install.sql',
            'install-user-auth': 'users-authentication.sql',
            'install-default-user': 'default-user.sql',
            'install-default-homepage': 'default-homepage.sql',
            'install-default-blocks': 'default-blocks.sql',
            'install-entity-access': 'default-entity-access.sql'
        };
        for(let checkboxName of Object.keys(executeFiles)){
            let fileName = executeFiles[checkboxName];
            let redirectError = await this.executeQueryFile(
                sc.get(templateVariables, checkboxName, 'off'),
                fileName,
                dbDriver
            );
            if('' !== redirectError){
                return res.redirect(redirectError);
            }
        }
        let entitiesGenerationResult = await this.generateEntities(dbDriver);
        if(!entitiesGenerationResult){
            Logger.error('Entities generation error.');
            return res.redirect('/?error=installation-entities-generation-failed');
        }
        Logger.info('Generated entities.');
        try {
            let mappedVariablesForConfig = this.mapVariablesForConfig(templateVariables);
            await this.createEnvFile(this.mapVariablesForTemplate(mappedVariablesForConfig));
            await this.prepareProjectDirectories();
            await this.copyAdminDirectory();
            await this.createIndexJsFile(templateVariables);
            if(sc.isFunction(this.postInstallCallback)){
                if(this.appServer && sc.isFunction(this.appServer.close)){
                    await this.appServer.close();
                }
                Logger.debug('Running postInstallCallback.');
                let callbackResult = await this.postInstallCallback({
                    loadedEntities: this.entitiesLoader.loadEntities(selectedDriver),
                    mappedVariablesForConfig
                });
                if(false === callbackResult){
                    Logger.error('Post-install callback failed.');
                    return res.redirect('/?error=installation-entities-callback-failed');
                }
            }
            await this.createLockFile();
            Logger.info('Installation successful!');
            let successContent = 'Installation successful! Run "node ." to start your CMS.';
            let successFileContent = FileHandler.readFile(FileHandler.joinPaths(this.installerPath, 'success.html'));
            if(successFileContent){
                successContent = this.renderEngine.render(
                    successFileContent,
                    {adminPath: templateVariables['app-admin-path']},
                );
            }
            return res.send(successContent);
        } catch (error) {
            Logger.critical('Configuration error: '+error.message);
            return res.redirect('/?error=installation-error');
        }
    }

    async executeQueryFile(isMarked, fileName, dbDriver)
    {
        if('on' !== isMarked){
            return '';
        }
        let sqlFileContent = FileHandler.readFile(FileHandler.joinPaths(this.migrationsPath, fileName));
        if(!sqlFileContent){
            Logger.error('SQL file "'+fileName+'" not found.');
            return '/?error=sql-file-not-found&file-name='+fileName;
        }
        if(!await dbDriver.rawQuery(sqlFileContent)){
            Logger.error('SQL file "'+fileName+'" raw execution failed.');
            return '/?error=sql-file-execution-error&file-name='+fileName;
        }
        Logger.info('SQL file "'+fileName+'" raw execution successfully.');
        return '';
    }

    async generateEntities(server, isOverride = false)
    {
        let driverType = sc.get(DriversClassMap, server.constructor.name, '');
        Logger.debug('Driver type detected: '+driverType+', Server constructor: '+server.constructor.name);
        if('prisma' === driverType){
            let dbConfig = this.extractDbConfigFromServer(server);
            Logger.debug('Extracted DB config:', dbConfig);
            if(dbConfig){
                let generatedPrismaSchema = await this.generatePrismaSchema(dbConfig);
                if(!generatedPrismaSchema){
                    Logger.error('Could not generate Prisma schema for entities generation.');
                    return false;
                }
                Logger.info('Generated Prisma schema for entities generation.');
            }
        }
        let generator = new EntitiesGenerator({server, projectPath: this.projectRoot, isOverride});
        let success = await generator.generate();
        if(!success){
            Logger.error('Entities generation failed.');
            return false;
        }
        return true;
    }

    extractDbConfigFromServer(server)
    {
        let config = sc.get(server, 'config');
        if(!config){
            Logger.warning('Could not extract database config from server.');
            return false;
        }
        let dbConfig = {
            client: sc.get(server, 'client', 'mysql'),
            config: {
                host: sc.get(config, 'host', 'localhost'),
                port: sc.get(config, 'port', 3306),
                database: sc.get(config, 'database', ''),
                user: sc.get(config, 'user', ''),
                password: sc.get(config, 'password', ''),
                multipleStatements: true
            },
            debug: false
        };
        Logger.debug('Extracted DB config structure:', {
            client: dbConfig.client,
            host: dbConfig.config.host,
            database: dbConfig.config.database
        });
        return dbConfig;
    }

    async generatePrismaSchema(connectionData, useDataProxy = false)
    {
        if(!connectionData){
            Logger.error('Missing "connectionData" to generate Prisma Schema.');
            return false;
        }
        let generator = new PrismaSchemaGenerator({
            ...connectionData,
            dataProxy: useDataProxy,
            clientOutputPath: FileHandler.joinPaths(this.projectRoot, 'prisma', 'client'),
            prismaSchemaPath: FileHandler.joinPaths(this.projectRoot, 'prisma')
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
        let envTemplateContent = FileHandler.readFile(envTemplatePath);
        if(!envTemplateContent){
            Logger.error('Template ".env.dist" not found: '+envTemplatePath);
            return false;
        }
        return FileHandler.writeFile(this.envFilePath, this.renderEngine.render(envTemplateContent, templateVariables));
    }

    mapVariablesForTemplate(configVariables)
    {
        return {
            host: configVariables.host,
            port: configVariables.port,
            adminPath: configVariables.adminPath,
            adminSecret: configVariables.adminSecret,
            dbClient: configVariables.database.client,
            dbHost: configVariables.database.host,
            dbPort: configVariables.database.port,
            dbName: configVariables.database.name,
            dbUser: configVariables.database.user,
            dbPassword: configVariables.database.password,
            dbDriver: configVariables.database.driver
        };
    }

    mapVariablesForConfig(templateVariables)
    {
        return {
            host: sc.get(templateVariables, 'app-host', 'http://localhost'),
            port: Number(sc.get(templateVariables, 'app-port', 8080)),
            adminPath: sc.get(templateVariables, 'app-admin-path', '/reldens-admin'),
            adminSecret: sc.get(templateVariables, 'app-admin-secret', Encryptor.generateSecretKey()),
            database: {
                client: sc.get(templateVariables, 'db-client', 'mysql'),
                host: sc.get(templateVariables, 'db-host', 'localhost'),
                port: Number(sc.get(templateVariables, 'db-port', 3306)),
                name: sc.get(templateVariables, 'db-name', 'reldens_cms'),
                user: sc.get(templateVariables, 'db-username', ''),
                password: sc.get(templateVariables, 'db-password', ''),
                driver: sc.get(templateVariables, 'db-storage-driver', 'prisma')
            }
        };
    }

    async createIndexJsFile(templateVariables)
    {
        if(!FileHandler.exists(this.indexTemplatePath)){
            Logger.error('Index.js template not found: '+this.indexTemplatePath);
            return false;
        }
        let indexTemplate = FileHandler.readFile(this.indexTemplatePath);
        let driverKey = templateVariables['db-storage-driver'];
        let indexContent = this.renderEngine.render(indexTemplate, {driverKey});
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
        FileHandler.createFolder(FileHandler.joinPaths(this.projectTemplatesPath, 'layouts'));
        FileHandler.createFolder(this.projectPublicPath);
        FileHandler.createFolder(this.projectPublicAssetsPath);
        FileHandler.createFolder(this.projectCssPath);
        FileHandler.createFolder(this.projectJsPath);
        let baseFiles = [
            'page.html',
            '404.html',
            'browserconfig.xml',
            'favicon.ico',
            'site.webmanifest'
        ];
        for(let fileName of baseFiles){
            FileHandler.copyFile(
                FileHandler.joinPaths(this.defaultTemplatesPath, fileName),
                FileHandler.joinPaths(this.projectTemplatesPath, fileName)
            );
        }
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'layouts', 'default.html'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'layouts', 'default.html')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'css', 'styles.css'),
            FileHandler.joinPaths(this.projectCssPath, 'styles.css')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'js', 'scripts.js'),
            FileHandler.joinPaths(this.projectJsPath, 'scripts.js')
        );
        FileHandler.copyFolderSync(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'partials'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'partials')
        );
        FileHandler.copyFolderSync(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'domains'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'domains')
        );
        return true;
    }

    fetchDefaults()
    {
        return {
            'app-host': process.env.RELDENS_APP_HOST || 'http://localhost',
            'app-port': process.env.RELDENS_APP_PORT || '8080',
            'app-admin-path': process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin',
            'db-storage-driver': process.env.RELDENS_STORAGE_DRIVER || 'prisma',
            'db-client': process.env.RELDENS_DB_CLIENT || 'mysql',
            'db-host': process.env.RELDENS_DB_HOST || 'localhost',
            'db-port': process.env.RELDENS_DB_PORT || '3306',
            'db-name': process.env.RELDENS_DB_NAME || 'reldens_cms',
            'db-username': process.env.RELDENS_DB_USER || '',
            'db-password': process.env.RELDENS_DB_PASSWORD || ''
        };
    }
}

module.exports.Installer = Installer;
