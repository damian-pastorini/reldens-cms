/**
 *
 * Reldens - CMS - AddCacheButtonSubscriber
 *
 */

const { Logger, sc } = require('@reldens/utils');

class AddCacheButtonSubscriber
{

    constructor(props = {})
    {
        this.events = sc.get(props, 'events', false);
        this.cacheManager = sc.get(props, 'cacheManager', false);
        this.renderCallback = sc.get(props, 'renderCallback', false);
        this.cacheCleanButton = sc.get(props, 'cacheCleanButton', '');
        this.clearAllCacheButton = sc.get(props, 'clearAllCacheButton', '');
        this.translations = sc.get(props, 'translations', {});
        this.cacheCleanRoute = sc.get(props, 'cacheCleanRoute', '');
        this.clearAllCacheRoute = sc.get(props, 'clearAllCacheRoute', '');
        this.setupEvents();
    }

    setupEvents()
    {
        if(!this.cacheManager){
            Logger.error('Cache Manager not found on AddCacheButtonSubscriber.');
            return false;
        }
        if(!this.cacheManager.isEnabled()){
            Logger.debug('Cache Manager not enabled.');
            return false;
        }
        if(!this.events){
            Logger.error('Events Manager not found on AddCacheButtonSubscriber.');
            return false;
        }
        //Logger.debug('Listening events PropertiesPopulation.');
        this.events.on('reldens.adminViewPropertiesPopulation', this.populateViewFields.bind(this));
        this.events.on('reldens.adminEditPropertiesPopulation', this.populateEditFields.bind(this));
        this.events.on('reldens.adminListPropertiesPopulation', this.populateListFields.bind(this));
    }

    async populateViewFields(event)
    {
        let cacheButton = await this.generateCacheCleanButton(event);
        if(!cacheButton){
            //Logger.info('Missing cache button contents on AddCacheButtonSubscriber.');
            return false;
        }
        if(!event.renderedViewProperties.extraContentForView){
            event.renderedViewProperties.extraContentForView = '';
        }
        event.renderedViewProperties.extraContentForView += cacheButton;
        //Logger.debug('Clean cache button ready on view.');
        return true;
    }

    async populateEditFields(event)
    {
        let cacheButton = await this.generateCacheCleanButton(event);
        if(!cacheButton){
            //Logger.info('Missing cache button contents on AddCacheButtonSubscriber.');
            return false;
        }
        if(!event.renderedEditProperties.extraContentForEdit){
            event.renderedEditProperties.extraContentForEdit = '';
        }
        event.renderedEditProperties.extraContentForEdit += cacheButton;
        //Logger.debug('Clean cache button ready on edit.');
        return true;
    }

    async populateListFields(event)
    {
        let clearAllButton = await this.generateClearAllCacheButton(event);
        if(!clearAllButton){
            return false;
        }
        if(!event.listProperties.extraContentForList){
            event.listProperties.extraContentForList = '';
        }
        event.listProperties.extraContentForList += clearAllButton;
        return true;
    }

    async generateCacheCleanButton(event)
    {
        if('routes' !== event.driverResource.id()){
            return false;
        }
        if(!event.loadedEntity){
            Logger.error('Missing loaded entity on AddCacheButtonSubscriber.');
            return false;
        }
        if(!event.loadedEntity.id){
            Logger.error('Missing loaded entity ID on AddCacheButtonSubscriber.');
            return false;
        }
        if(!this.cacheCleanButton){
            Logger.error('Cache clean button template content not found');
            return '';
        }
        if(!this.renderCallback){
            Logger.error('Render callback not available for cache button');
            return '';
        }
        return await this.renderCallback(
            this.cacheCleanButton,
            {
                cacheCleanRoute: this.cacheCleanRoute,
                routeId: event.loadedEntity.id,
                buttonText: sc.get(this.translations.labels, 'cleanCache', 'cleanCache')
            }
        );
    }

    async generateClearAllCacheButton(event)
    {
        if('routes' !== event.driverResource.id()){
            return false;
        }
        if(!this.clearAllCacheButton){
            Logger.error('Clear all cache button template content not found');
            return '';
        }
        if(!this.renderCallback){
            Logger.error('Render callback not available for clear all cache button');
            return '';
        }
        return await this.renderCallback(
            this.clearAllCacheButton,
            {
                buttonText: sc.get(this.translations.labels, 'clearAllCache', 'clearAllCache'),
                clearAllCacheRoute: this.clearAllCacheRoute,
                confirmTitle: sc.get(this.translations.labels, 'confirmClearCache', 'confirmClearCache'),
                confirmMessage: sc.get(this.translations.messages, 'confirmClearCacheMessage', 'confirmClearCacheMessage'),
                warningText: sc.get(this.translations.labels, 'warning', 'warning'),
                warningMessage: sc.get(this.translations.messages, 'clearCacheWarning', 'clearCacheWarning'),
                cancelText: sc.get(this.translations.labels, 'cancel', 'cancel'),
                confirmText: sc.get(this.translations.labels, 'confirm', 'confirm')
            }
        );
    }

}

module.exports.AddCacheButtonSubscriber = AddCacheButtonSubscriber;
