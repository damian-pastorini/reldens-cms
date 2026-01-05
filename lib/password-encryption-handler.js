/**
 *
 * Reldens - CMS - Password Encryption Handler
 *
 */

const { Encryptor } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class PasswordEncryptionHandler
{

    constructor(props)
    {
        this.events = sc.get(props, 'events', false);
        this.entityKey = sc.get(props, 'entityKey', 'users');
        this.passwordField = sc.get(props, 'passwordField', 'password');
        this.enabled = sc.get(props, 'enabled', true);
        if(!this.events){
            Logger.warning('PasswordEncryptionHandler: No events manager provided, handler will not be active.');
            this.enabled = false;
        }
    }

    registerEventListeners()
    {
        if(!this.enabled){
            Logger.debug('PasswordEncryptionHandler is disabled, skipping event registration.');
            return false;
        }
        this.events.on('reldens.adminBeforeEntitySave', async (eventData) => {
            await this.handleBeforeEntitySave(eventData);
        });
        Logger.debug('PasswordEncryptionHandler registered for event: reldens.adminBeforeEntitySave');
        return true;
    }

    async handleBeforeEntitySave(eventData)
    {
        let driverResource = sc.get(eventData, 'driverResource', false);
        if(!driverResource){
            return;
        }
        if(driverResource.entityKey !== this.entityKey){
            return;
        }
        let req = sc.get(eventData, 'req', false);
        if(!req){
            return;
        }
        let passwordValue = sc.get(req.body, this.passwordField, null);
        if(!passwordValue){
            return;
        }
        if('' === passwordValue){
            return;
        }
        if(this.isAlreadyEncrypted(passwordValue)){
            Logger.debug('Password field appears to be already encrypted, skipping encryption.');
            return;
        }
        Logger.debug('Encrypting password for user entity save.');
        let encryptedPassword = Encryptor.encryptPassword(passwordValue);
        if(!encryptedPassword){
            Logger.error('Failed to encrypt password for user entity save.');
            return;
        }
        req.body[this.passwordField] = encryptedPassword;
        Logger.debug('Password encrypted successfully for user entity save.');
    }

    isAlreadyEncrypted(value)
    {
        if(!sc.isString(value)){
            return false;
        }
        let parts = value.split(':');
        if(2 !== parts.length){
            return false;
        }
        let saltLength = parts[0].length;
        let hashLength = parts[1].length;
        if(64 !== saltLength){
            return false;
        }
        if(128 !== hashLength){
            return false;
        }
        return true;
    }

}

module.exports.PasswordEncryptionHandler = PasswordEncryptionHandler;
