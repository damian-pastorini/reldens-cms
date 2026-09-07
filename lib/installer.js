/**
 *
 * Reldens - CMS - Installer
 *
 */

const { fork, execSync } = require('child_process');
const { EntitiesLoader } = require('./entities-loader');
const { MySQLInstaller } = require('./mysql-installer');
const { FileHandler, Encryptor } = require('@reldens/server-utils');
const { DriversMap, DriversClassMap, EntitiesGenerator, PrismaSchemaGenerator } = require('@reldens/storage');
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
        this.moduleAdminTemplatesPath = FileHandler.joinPaths(this.moduleAdminPath, 'templates');
        this.indexTemplatePath = FileHandler.joinPaths(this.defaultTemplatesPath, 'index.js.dist');
        this.postInstallCallback = sc.get(props, 'postInstallCallback', false);
        this.prismaModules = sc.get(props, 'prismaModules', false);
        this.prismaAdapter = sc.get(props, 'prismaAdapter', '@prisma/adapter-mariadb');
        this.prismaAdapterClass = sc.get(props, 'prismaAdapterClass', 'PrismaMariaDb');
        this.entitiesLoader = new EntitiesLoader({projectRoot: this.projectRoot});
        this.subprocessMaxAttempts = sc.get(props, 'subprocessMaxAttempts', 1800);
    }

    isInstalled()
    {
        return FileHandler.exists(this.installLockPath);
    }

    async configureAppServerRoutes(app, appServer, appServerFactory, renderEngine)
    {
        if(!app){
            Logger.error('Missing app on configureAppServerRoutes for Installer.');
            return false;
        }
        if(!appServer){
            Logger.error('Missing appServer on configureAppServerRoutes for Installer.');
            return false;
        }
        if(!appServerFactory){
            Logger.error('Missing appServerFactory on configureAppServerRoutes for Installer.');
            return false;
        }
        if(!renderEngine){
            Logger.error('Missing renderEngine on configureAppServerRoutes for Installer.');
            return false;
        }
        this.app = app;
        this.appServer = appServer;
        this.appServerFactory = appServerFactory;
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
            'installation-dependencies-failed': 'Required dependencies failed to install.',
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
            'prisma-generation-subprocess-failed': 'Prisma generation subprocess failed.',
            'temporal-mysql-only-supported': 'Only MySQL is supported at installation time.',
            'already-installed': 'The application is already installed.'
        };
        return sc.get(errorMessages, errorCode, 'An unknown error occurred during installation.');
    }

    async executeInstallProcess(req, res)
    {
        if(this.isInstalled()){
            return res.redirect('/?redirect=already-installed');
        }
        // map database configuration variables:
        let templateVariables = req.body;
        req.session.templateVariables = templateVariables;
        let selectedDriver = templateVariables['db-storage-driver'];
        let driverClass = DriversMap[selectedDriver];
        if(!driverClass){
            Logger.error('Invalid storage driver: ' + selectedDriver);
            return res.redirect('/?error=invalid-driver');
        }
        let dbConfig = {
            client: sc.get(templateVariables, 'db-client', 'mysql'),
            config: {
                host: templateVariables['db-host'],
                port: Number(templateVariables['db-port']),
                database: templateVariables['db-name'],
                user: templateVariables['db-username'],
                password: templateVariables['db-password'],
                multipleStatements: true
            },
            multipleStatements: true,
            debug: false
        };
        if(!await this.checkAndInstallPackages(['@reldens/cms'])){
            Logger.error('Required @reldens/cms dependency installation failed.');
            return res.redirect('/?error=installation-dependencies-failed');
        }
        if('prisma' === selectedDriver){
            if(!await this.checkAndInstallPackages(['prisma', '@prisma/client', this.prismaAdapter])){
                Logger.error('Required Prisma dependencies installation failed.');
                return res.redirect('/?error=installation-dependencies-failed');
            }
        }
        let dbDriver = new driverClass(dbConfig);
        if(!sc.isObjectFunction(dbDriver, 'rawQuery')){
            Logger.error('Method "rawQuery" not found in driver.', driverClass);
            return res.redirect('/?error=raw-query-not-found');
        }
        let queryFilesResult = await this.executeQueryFiles(selectedDriver, dbDriver, dbConfig, templateVariables);
        if('' !== queryFilesResult){
            Logger.critical('Invalid query result: ' + queryFilesResult);
            if('prisma' === selectedDriver){
                res.redirect('/?'+queryFilesResult);
                res.on('finish', () => { process.exit(); });
                return;
            }
            return res.redirect('/?'+queryFilesResult);
        }
        // @IMPORTANT: if the selectedDriver is 'prisma', then at this point the executeQueryFiles already created the
        // client through the sub-process worker.
        // Search: FileHandler.joinPaths(this.projectRoot, 'prisma', 'client')
        let entitiesGenerationResult = await this.generateEntities(dbDriver, false, true, false, dbConfig);
        if(!entitiesGenerationResult){
            Logger.error('Entities generation error.');
            if('prisma' === selectedDriver){
                res.redirect('/?error=installation-entities-generation-failed');
                res.on('finish', () => { process.exit(); });
                return;
            }
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
                    // @TODO - CHECK IF THIS SHOULD BE REMOVED.
                    await this.appServer.close();
                }
                Logger.debug('Running postInstallCallback.');
                let callbackResult = await this.postInstallCallback({
                    loadedEntities: this.entitiesLoader.loadEntities(selectedDriver),
                    mappedVariablesForConfig,
                    dataServer: dbDriver
                });
                if(false === callbackResult){
                    Logger.error('Post-install callback failed.');
                    if('prisma' === selectedDriver){
                        res.redirect('/?error=installation-entities-callback-failed');
                        res.on('finish', () => { process.exit(); });
                        return;
                    }
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
                    {adminPath: templateVariables['app-admin-path']}
                );
            }
            return res.send(successContent);
        } catch (error) {
            Logger.critical('Configuration error: '+error.message);
            if('prisma' === selectedDriver){
                res.redirect('/?error=configuration-error');
                res.on('finish', () => { process.exit(); });
                return;
            }
            return res.redirect('/?error=configuration-error');
        }
    }

    async executeQueryFiles(selectedDriver, dbDriver, dbConfig, templateVariables)
    {
        if('prisma' === selectedDriver){
            let subProcessResult = await this.runSubprocessInstallation(dbConfig, templateVariables);
            if(!subProcessResult){
                return 'error=prisma-generation-subprocess-failed';
            }
            return '';
        }
        if(!await dbDriver.connect()){
            Logger.error('Connection failed');
            return 'error=connection-failed';
        }
        if(-1 === dbConfig.client.indexOf('mysql')){
            return 'error=temporal-mysql-only-supported';
        }
        let migrationFiles = MySQLInstaller.migrationFiles();
        for(let checkboxName of Object.keys(migrationFiles)){
            let fileName = migrationFiles[checkboxName];
            let redirectError = await MySQLInstaller.executeQueryFile(
                sc.get(templateVariables, checkboxName, 'off'),
                fileName,
                dbDriver,
                this.migrationsPath
            );
            if('' !== redirectError){
                return redirectError;
            }
        }
        return '';
    }

    async generateEntities(
        server,
        isOverride = false,
        isInstallationMode = false,
        isDryPrisma = false,
        dbConfig = null
    ){
        let driverType = sc.get(DriversClassMap, server.constructor.name, '');
        Logger.debug('Driver type detected: '+driverType+', Server constructor: '+server.constructor.name);
        if('prisma' === driverType && !isDryPrisma){
            Logger.info('Running prisma introspect "npx prisma db pull"...');
            if(!dbConfig){
                dbConfig = this.extractDbConfigFromServer(server);
                Logger.debug('Extracted DB config.');
            }
            Logger.debug('DB config:', dbConfig);
            if(dbConfig){
                let generatedPrismaSchema = await this.generatePrismaSchema(dbConfig);
                if(!generatedPrismaSchema){
                    Logger.error('Prisma schema generation failed.');
                    return false;
                }
                Logger.info('Generated Prisma schema for entities generation.');
                if(isInstallationMode){
                    Logger.info('Creating local Prisma client for entities generation...');
                    let localPrismaModules = await MySQLInstaller.createPrismaClient(
                        this.projectRoot,
                        this.prismaAdapter,
                        this.prismaAdapterClass
                    );
                    if(localPrismaModules){
                        this.prismaModules = localPrismaModules;
                        server.prismaModules = localPrismaModules;
                        server.prisma = localPrismaModules.client;
                    }
                }
            }
        }
        if('prisma' === driverType && isDryPrisma){
            Logger.info('Skipping Prisma schema generation due to --dry-prisma flag.');
        }
        let generatorConfig = {server, projectPath: this.projectRoot, isOverride};
        if('prisma' === driverType && this.prismaModules){
            generatorConfig.prismaModules = this.prismaModules;
        }
        let generator = new EntitiesGenerator(generatorConfig);
        let success = await generator.generate();
        if(!success){
            Logger.error('Entities generation failed.');
            return false;
        }
        if('mikro-orm' === driverType && isInstallationMode){
            return await this.reconnectWithGeneratedEntities(server, driverType);
        }
        return true;
    }

    async reconnectWithGeneratedEntities(server, driverType)
    {
        let rawRegisteredEntities = sc.get(this.entitiesLoader.loadEntities(driverType), 'rawRegisteredEntities', false);
        if(!rawRegisteredEntities){
            Logger.error('Generated entities not found for driver: '+driverType);
            return false;
        }
        Logger.info('Reconnecting data server with generated entities...');
        server.rawEntities = rawRegisteredEntities;
        try {
            await server.disconnect();
            await server.connect();
        } catch (error) {
            Logger.error('Data server reconnection failed: '+error.message);
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
            multipleStatements: true,
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
            publicUrl: configVariables.publicUrl,
            adminPath: configVariables.adminPath,
            adminSecret: configVariables.adminSecret,
            dbClient: configVariables.database.client,
            dbHost: configVariables.database.host,
            dbPort: configVariables.database.port,
            dbName: configVariables.database.name,
            dbUser: configVariables.database.user,
            dbPassword: configVariables.database.password,
            dbDriver: configVariables.database.driver,
            prismaAdapter: this.prismaAdapter,
            prismaAdapterClass: this.prismaAdapterClass
        };
    }

    mapVariablesForConfig(templateVariables)
    {
        return {
            host: sc.get(templateVariables, 'app-host', 'http://localhost'),
            port: Number(sc.get(templateVariables, 'app-port', 8080)),
            publicUrl: sc.get(templateVariables, 'app-public-url', ''),
            adminPath: sc.get(templateVariables, 'app-admin-path', '/reldens-admin'),
            adminSecret: sc.get(templateVariables, 'app-admin-secret', Encryptor.generateSecretKey()),
            database: {
                client: sc.get(templateVariables, 'db-client', 'mysql'),
                host: sc.get(templateVariables, 'db-host', 'localhost'),
                port: Number(sc.get(templateVariables, 'db-port', 3306)),
                name: sc.get(templateVariables, 'db-name', 'reldens_cms'),
                user: sc.get(templateVariables, 'db-username', ''),
                password: sc.get(templateVariables, 'db-password', ''),
                driver: sc.get(templateVariables, 'db-storage-driver', 'mikro-orm')
            }
        };
    }

    async createIndexJsFile(templateVariables)
    {
        if(!FileHandler.exists(this.indexTemplatePath)){
            Logger.error('Index.js template not found: ' + this.indexTemplatePath);
            return false;
        }
        let indexTemplate = FileHandler.readFile(this.indexTemplatePath);
        let driverKey = templateVariables['db-storage-driver'];
        let templateParams = {driverKey};
        if('prisma' === driverKey){
            templateParams.prismaClientImports = 'const { PrismaClient, Prisma } = require(\'./prisma/client\');\n'
                +'const { '+this.prismaAdapterClass+' } = require(\''+this.prismaAdapter+'\');';
            templateParams.prismaClientParam = ',\n    prismaModules: {PrismaClient, Prisma, PrismaAdapter: '
                +this.prismaAdapterClass+'}';
        }
        if('prisma' !== driverKey){
            templateParams.prismaClientImports = '';
            templateParams.prismaClientParam = '';
        }
        let indexContent = this.renderEngine.render(indexTemplate, templateParams);
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
            FileHandler.joinPaths(this.projectCssPath, 'reldens-admin-client.css')
        );
        FileHandler.copyFile(
            FileHandler.joinPaths(this.moduleAdminPath, 'reldens-admin-client.js'),
            FileHandler.joinPaths(this.projectJsPath, 'reldens-admin-client.js')
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
        FileHandler.copyFolderSync(FileHandler.joinPaths(this.defaultTemplatesPath, 'css'), this.projectCssPath);
        FileHandler.copyFolderSync(FileHandler.joinPaths(this.defaultTemplatesPath, 'js'), this.projectJsPath);
        FileHandler.copyFolderSync(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'partials'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'partials')
        );
        FileHandler.copyFolderSync(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'domains'),
            FileHandler.joinPaths(this.projectTemplatesPath, 'domains')
        );
        FileHandler.copyFolderSync(
            FileHandler.joinPaths(this.defaultTemplatesPath, 'assets'),
            this.projectPublicAssetsPath
        );
        return true;
    }

    fetchDefaults()
    {
        return {
            'app-host': process.env.RELDENS_APP_HOST || 'http://localhost',
            'app-port': process.env.RELDENS_APP_PORT || '8080',
            'app-public-url': process.env.RELDENS_PUBLIC_URL || '',
            'app-admin-path': process.env.RELDENS_ADMIN_ROUTE_PATH || '/reldens-admin',
            'db-storage-driver': process.env.RELDENS_STORAGE_DRIVER || 'mikro-orm',
            'db-client': process.env.RELDENS_DB_CLIENT || 'mysql',
            'db-host': process.env.RELDENS_DB_HOST || 'localhost',
            'db-port': process.env.RELDENS_DB_PORT || '3306',
            'db-name': process.env.RELDENS_DB_NAME || 'reldens_cms',
            'db-username': process.env.RELDENS_DB_USER || '',
            'db-password': process.env.RELDENS_DB_PASSWORD || ''
        };
    }

    async checkAndInstallPackages(requiredPackages)
    {
        let missingPackages = [];
        for(let packageName of requiredPackages){
            let packagePath = FileHandler.joinPaths(this.projectRoot, 'node_modules', packageName);
            if(!FileHandler.exists(packagePath)){
                missingPackages.push(packageName);
            }
        }
        if(0 === missingPackages.length){
            return true;
        }
        Logger.info('Missing required packages: ' + missingPackages.join(', '));
        Logger.info('These packages are required for the CMS to function properly.');
        Logger.info('Would you like to install them automatically? (This may take a few minutes)');
        Logger.info('Installing packages: npm install ' + missingPackages.join(' '));
        try {
            let installCommand = 'npm install ' + missingPackages.join(' ');
            execSync(installCommand, {stdio: 'inherit', cwd: this.projectRoot});
            Logger.info('Dependencies installed successfully.');
            return true;
        } catch (error) {
            Logger.error('Failed to install dependencies: ' + error.message);
            Logger.error('Please run manually: npm install ' + missingPackages.join(' '));
            return false;
        }
    }

    async runSubprocessInstallation(dbConfig, templateVariables)
    {
        Logger.info('Subprocess Prisma installation - Starting...');
        let workerPath = FileHandler.joinPaths(__dirname, 'prisma-subprocess-worker.js');
        let worker = fork(workerPath, [], {
            cwd: this.projectRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {...process.env}
        });
        let message = {
            dbConfig: dbConfig,
            templateVariables: templateVariables,
            migrationsPath: this.migrationsPath,
            projectRoot: this.projectRoot,
            prismaAdapter: this.prismaAdapter,
            prismaAdapterClass: this.prismaAdapterClass
        };
        worker.stdout.on('data', (data) => {
            Logger.info('Subprocess: '+data.toString().trim());
        });
        worker.stderr.on('data', (data) => {
            Logger.error('Subprocess error: '+data.toString().trim());
        });
        worker.send(message);
        let subprocessCompleted = false;
        let subprocessSuccess = false;
        let workerExited = false;
        worker.on('message', (message) => {
            subprocessCompleted = true;
            subprocessSuccess = sc.get(message, 'success', false);
            if(!subprocessSuccess){
                Logger.error('Subprocess failed: '+sc.get(message, 'error', 'Unknown'));
            }
        });
        worker.on('error', (error) => {
            subprocessCompleted = true;
            subprocessSuccess = false;
            Logger.error('Subprocess error: '+error.message);
        });
        worker.on('exit', (code, signal) => {
            workerExited = true;
            if(!subprocessCompleted){
                subprocessCompleted = true;
                subprocessSuccess = false;
            }
        });
        let attempts = 0;
        while(!subprocessCompleted && attempts < this.subprocessMaxAttempts){
            attempts++;
            await this.waitMilliseconds(100);
        }
        if(!workerExited){
            worker.kill('SIGTERM');
            await this.waitMilliseconds(1000);
            if(!workerExited){
                worker.kill('SIGKILL');
            }
        }
        Logger.info('Subprocess Prisma installation - Ended.');
        return subprocessSuccess;
    }

    async waitMilliseconds(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports.Installer = Installer;
