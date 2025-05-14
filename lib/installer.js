/**
 *
 * Reldens - CMS - Installer
 *
 */

const { FileHandler, Encryptor } = require('@reldens/server-utils');
const { DriversMap, EntitiesGenerator, PrismaSchemaGenerator } = require('@reldens/storage');
const { Logger, sc } = require('@reldens/utils');
const mustache = require('mustache');

class Installer
{
    constructor(props)
    {
        this.app = sc.get(props, 'app', false);
        this.appServerFactory = sc.get(props, 'appServerFactory', false);
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.encoding = sc.get(props, 'encoding', 'utf8');
        this.installLockPath = FileHandler.joinPaths(this.projectRoot, 'install.lock');
        this.envFilePath = FileHandler.joinPaths(this.projectRoot, '.env');
        this.modulePath = FileHandler.joinPaths(__dirname, '..');
        this.installerPath = FileHandler.joinPaths(this.modulePath, 'install');
        this.migrationsPath = FileHandler.joinPaths(this.modulePath, 'migrations');
        this.defaultTemplatesPath = FileHandler.joinPaths(this.modulePath, 'templates');
    }

    isInstalled()
    {
        return FileHandler.exists(this.installLockPath);
    }

    async prepareSetup(app, appServerFactory)
    {
        if(!app || !appServerFactory){
            Logger.error('Missing app or appServerFactory');
            return false;
        }
        this.app = app;
        this.appServerFactory = appServerFactory;
        app.use('/install-assets', appServerFactory.applicationFramework.static(
            this.installerPath,
            { index: false }
        ));
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
        if('' === req._parsedUrl.pathname || '/' === req._parsedUrl.pathname){
            let installerIndexPath = FileHandler.joinPaths(this.installerPath, 'index.html');
            if(!FileHandler.exists(installerIndexPath)){
                return res.status(500).send('Installer template not found');
            }
            let content = FileHandler.readFile(installerIndexPath, {
                encoding: this.encoding
            });
            let templateVariables = req.session?.templateVariables || this.fetchDefaults();
            return res.send(mustache.render(content, templateVariables));
        }
        next();
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
        try {
            let dbDriver = new driverClass(dbConfig);
            if(!await dbDriver.connect()){
                Logger.error('Connection failed');
                return res.redirect('/?error=connection-failed');
            }
            if(!sc.isObjectFunction(dbDriver, 'rawQuery')){
                Logger.error('Method "rawQuery" not found');
                return res.redirect('/?error=raw-query-not-found');
            }
            let installSqlPath = FileHandler.joinPaths(this.migrationsPath, 'install.sql');
            if(!FileHandler.exists(installSqlPath)){
                Logger.error('SQL installation file not found');
                return res.redirect('/?error=sql-file-not-found');
            }
            await this.executeQueryFile(dbDriver, installSqlPath);
            Logger.info('Installed tables.');
            let defaultUserSqlPath = FileHandler.joinPaths(this.migrationsPath, 'default-user.sql');
            if(FileHandler.exists(defaultUserSqlPath)){
                await this.executeQueryFile(dbDriver, defaultUserSqlPath);
                Logger.info('Created default user.');
            }
            let connectionData = {
                client: dbConfig.client,
                connection: dbConfig.config
            };
            await this.generateEntities(connectionData);
            Logger.info('Generated entities.');
            if('prisma' === selectedDriver){
                await this.generatePrismaSchema(connectionData);
                Logger.info('Generated Prisma schema.');
            }
        } catch (error) {
            Logger.error('Installation error: '+error.message);
            return res.redirect('/?error=installation-process-failed');
        }
        if('' === templateVariables['app-admin-path']){
            templateVariables['app-admin-path'] = '/reldens-admin';
        }
        try {
            await this.createEnvFile(templateVariables);
            await this.createLockFile();
            await this.prepareProjectDirectories();
            Logger.info('Installation successful!');
            let adminPath = templateVariables['app-admin-path'];
            return res.redirect(adminPath);
        } catch (error) {
            Logger.error('Configuration error: '+error.message);
            return res.redirect('/?error=configuration-error');
        }
    }

    async executeQueryFile(dbDriver, filePath)
    {
        let sqlContent = FileHandler.readFile(filePath, {
            encoding: this.encoding
        });
        if(!sqlContent){
            throw new Error('Could not read SQL file: '+filePath);
        }
        return await dbDriver.rawQuery(sqlContent.toString());
    }

    async generateEntities(connectionData)
    {
        let generator = new EntitiesGenerator({
            connectionData: connectionData,
            projectPath: this.projectRoot
        });
        let success = await generator.generate();
        if(!success){
            Logger.error('Entity generation failed.');
            return false;
        }
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
        let envTemplate = FileHandler.readFile(envTemplatePath, {
            encoding: this.encoding
        });
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
            host: templateVariables['app-host'] || 'http://localhost',
            port: templateVariables['app-port'] || '3000'
        });
        return FileHandler.writeFile(this.envFilePath, envContent);
    }

    async createLockFile()
    {
        return FileHandler.writeFile(this.installLockPath,
            'Installation completed on '+new Date().toISOString());
    }

    async prepareProjectDirectories()
    {
        let projectTemplatesPath = FileHandler.joinPaths(this.projectRoot, 'templates');
        if(!FileHandler.exists(projectTemplatesPath)){
            FileHandler.createFolder(projectTemplatesPath);
        }
        let projectPublicPath = FileHandler.joinPaths(this.projectRoot, 'public');
        if(!FileHandler.exists(projectPublicPath)){
            FileHandler.createFolder(projectPublicPath);
        }
        let projectCssPath = FileHandler.joinPaths(projectPublicPath, 'css');
        if(!FileHandler.exists(projectCssPath)){
            FileHandler.createFolder(projectCssPath);
        }
        let projectJsPath = FileHandler.joinPaths(projectPublicPath, 'js');
        if(!FileHandler.exists(projectJsPath)){
            FileHandler.createFolder(projectJsPath);
        }
        let defaultPagePath = FileHandler.joinPaths(this.defaultTemplatesPath, 'page.html');
        let defaultNotFoundPath = FileHandler.joinPaths(
            this.defaultTemplatesPath, '404.html');
        let defaultLayoutPath = FileHandler.joinPaths(
            this.defaultTemplatesPath, 'layout.html');
        if(FileHandler.exists(defaultPagePath)){
            FileHandler.copyFile(defaultPagePath, 
                FileHandler.joinPaths(projectTemplatesPath, 'page.html'));
        }
        if(FileHandler.exists(defaultNotFoundPath)){
            FileHandler.copyFile(defaultNotFoundPath, 
                FileHandler.joinPaths(projectTemplatesPath, '404.html'));
        }
        if(FileHandler.exists(defaultLayoutPath)){
            FileHandler.copyFile(defaultLayoutPath, 
                FileHandler.joinPaths(projectTemplatesPath, 'layout.html'));
        }
        let defaultCssPath = FileHandler.joinPaths(
            this.defaultTemplatesPath, 'css', 'styles.css');
        let defaultJsPath = FileHandler.joinPaths(
            this.defaultTemplatesPath, 'js', 'scripts.js');
        if(FileHandler.exists(defaultCssPath)){
            FileHandler.copyFile(defaultCssPath, 
                FileHandler.joinPaths(projectCssPath, 'styles.css'));
        }
        if(FileHandler.exists(defaultJsPath)){
            FileHandler.copyFile(defaultJsPath, 
                FileHandler.joinPaths(projectJsPath, 'scripts.js'));
        }
        return true;
    }

    fetchDefaults()
    {
        return {
            'app-host': process.env.RELDENS_CMS_HOST || 'http://localhost',
            'app-port': process.env.RELDENS_CMS_PORT || '3000',
            'app-admin-path': process.env.RELDENS_CMS_ADMIN_PATH || '/reldens-admin',
            'db-storage-driver': 'prisma',
            'db-client': process.env.RELDENS_CMS_DB_CLIENT || 'mysql2',
            'db-host': process.env.RELDENS_CMS_DB_HOST || 'localhost',
            'db-port': process.env.RELDENS_CMS_DB_PORT || '3306',
            'db-name': process.env.RELDENS_CMS_DB_NAME || 'reldens_cms',
            'db-username': process.env.RELDENS_CMS_DB_USER || '',
            'db-password': process.env.RELDENS_CMS_DB_PASSWORD || ''
        };
    }
}

module.exports.Installer = Installer;
