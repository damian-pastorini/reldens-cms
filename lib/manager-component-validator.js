/**
 *
 * Reldens - CMS - Manager Component Validator
 *
 */

const { Logger } = require('@reldens/utils');

class ManagerComponentValidator
{

    static validateProvidedServer(app, appServer)
    {
        if(!app){
            return false;
        }
        if(!appServer){
            return false;
        }
        if('function' !== typeof app.use){
            Logger.critical('Invalid app instance provided - missing use method.');
            return false;
        }
        if('function' !== typeof appServer.listen){
            Logger.critical('Invalid appServer instance provided - missing listen method.');
            return false;
        }
        return true;
    }

    static validateProvidedDataServer(dataServer)
    {
        if(!dataServer){
            return false;
        }
        if('function' !== typeof dataServer.connect){
            Logger.critical('Invalid dataServer instance provided - missing connect method.');
            return false;
        }
        if('function' !== typeof dataServer.generateEntities){
            Logger.critical('Invalid dataServer instance provided - missing generateEntities method.');
            return false;
        }
        return true;
    }

    static validateProvidedAdminManager(adminManager)
    {
        if(!adminManager){
            return false;
        }
        if('function' !== typeof adminManager.setupAdmin){
            Logger.critical('Invalid adminManager instance provided - missing setupAdmin method.');
            return false;
        }
        return true;
    }

    static validateProvidedFrontend(frontend)
    {
        if(!frontend){
            return false;
        }
        if('function' !== typeof frontend.initialize){
            Logger.critical('Invalid frontend instance provided - missing initialize method.');
            return false;
        }
        return true;
    }
}

module.exports.ManagerComponentValidator = ManagerComponentValidator;
