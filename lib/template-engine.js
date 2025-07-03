/**
 *
 * Reldens - CMS - TemplateEngine
 *
 */

const { JsonFieldsParser } = require('./json-fields-parser');
const { EntitiesTransformer } = require('./template-engine/entities-transformer');
const { CollectionsTransformer } = require('./template-engine/collections-transformer');
const { CollectionsSingleTransformer } = require('./template-engine/collections-single-transformer');
const { PartialsTransformer } = require('./template-engine/partials-transformer');
const { UrlTransformer } = require('./template-engine/url-transformer');
const { AssetTransformer } = require('./template-engine/asset-transformer');
const { DateTransformer } = require('./template-engine/date-transformer');
const { TranslateTransformer } = require('./template-engine/translate-transformer');
const { SystemVariablesProvider } = require('./template-engine/system-variables-provider');
const { Logger, sc } = require('@reldens/utils');

class TemplateEngine
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.events = sc.get(props, 'events', false);
        this.defaultDomain = sc.get(props, 'defaultDomain', 'default');
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.publicPath = sc.get(props, 'publicPath', './public');
        this.jsonFieldsParser = new JsonFieldsParser({entitiesConfig: sc.get(props, 'entitiesConfig', {})});
        this.systemVariablesProvider = new SystemVariablesProvider({
            defaultDomain: this.defaultDomain,
            projectRoot: this.projectRoot,
            publicPath: this.publicPath
        });
        this.entitiesTransformer = new EntitiesTransformer({
            dataServer: this.dataServer,
            jsonFieldsParser: this.jsonFieldsParser,
            processAllTemplateFunctions: this.processAllTemplateFunctions.bind(this)
        });
        this.collectionsSingleTransformer = new CollectionsSingleTransformer({
            dataServer: this.dataServer,
            jsonFieldsParser: this.jsonFieldsParser,
            renderEngine: this.renderEngine,
            getPartials: this.getPartials,
            findAllPartialTags: this.findAllPartialTags.bind(this),
            loadPartialTemplate: this.loadPartialTemplate.bind(this),
            processAllTemplateFunctions: this.processAllTemplateFunctions.bind(this)
        });
        this.collectionsTransformer = new CollectionsTransformer({
            dataServer: this.dataServer,
            jsonFieldsParser: this.jsonFieldsParser,
            renderEngine: this.renderEngine,
            getPartials: this.getPartials,
            findAllPartialTags: this.findAllPartialTags.bind(this),
            loadPartialTemplate: this.loadPartialTemplate.bind(this),
            processAllTemplateFunctions: this.processAllTemplateFunctions.bind(this)
        });
        this.partialsTransformer = new PartialsTransformer({
            renderEngine: this.renderEngine,
            getPartials: this.getPartials
        });
        this.urlTransformer = new UrlTransformer();
        this.assetTransformer = new AssetTransformer();
        this.dateTransformer = new DateTransformer({
            defaultFormat: sc.get(props, 'defaultDateFormat', 'Y-m-d H:i:s')
        });
        this.translateTransformer = new TranslateTransformer({
            projectRoot: this.projectRoot,
            defaultLocale: sc.get(props, 'defaultLocale', 'en'),
            fallbackLocale: sc.get(props, 'fallbackLocale', 'en')
        });
        this.transformers = [
            this.entitiesTransformer,
            this.collectionsSingleTransformer,
            this.collectionsTransformer,
            this.partialsTransformer,
            this.urlTransformer,
            this.assetTransformer,
            this.dateTransformer,
            this.translateTransformer
        ];
    }

    async processAllTemplateFunctions(template, domain, req, systemVariables)
    {
        let processedTemplate = template;
        for(let transformer of this.transformers){
            if(sc.isFunction(transformer.transform)){
                processedTemplate = await transformer.transform(processedTemplate, domain, req, systemVariables);
            }
        }
        return processedTemplate;
    }

    async render(template, data, partials, domain, req, route, currentEntityData)
    {
        if(!this.renderEngine){
            Logger.critical('Render engine not provided');
            return '';
        }
        if(!sc.isFunction(this.renderEngine.render)){
            Logger.critical('Render engine does not contain a render method');
            return '';
        }
        if(!this.events){
            Logger.critical('Events manager not provided');
            return '';
        }
        let systemVariables = this.systemVariablesProvider.buildSystemVariables(req, route, domain);
        let renderContext = {
            template,
            data,
            partials,
            domain,
            req,
            route,
            currentEntityData
        };
        let eventData = {
            variables: systemVariables,
            renderContext
        };
        await this.events.emit('reldens.afterVariablesCreated', eventData);
        let enhancedData = this.buildEnhancedRenderData(data, eventData.variables, currentEntityData);
        let beforeProcessData = {
            content: template,
            variables: enhancedData,
            renderContext
        };
        await this.events.emit('reldens.beforeContentProcess', beforeProcessData);
        let processedTemplate = await this.processAllTemplateFunctions(
            beforeProcessData.content,
            domain,
            req,
            eventData.variables
        );
        let afterProcessData = {
            processedContent: processedTemplate,
            variables: enhancedData,
            renderContext
        };
        await this.events.emit('reldens.afterContentProcess', afterProcessData);
        return this.renderEngine.render(
            this.unescapeHtml(afterProcessData.processedContent),
            enhancedData,
            partials
        );
    }

    buildEnhancedRenderData(originalData, systemVariables, currentEntityData)
    {
        let enhancedData = Object.assign({}, originalData);
        enhancedData.currentRequest = systemVariables.currentRequest;
        enhancedData.currentRoute = systemVariables.currentRoute;
        enhancedData.currentDomain = systemVariables.currentDomain;
        enhancedData.systemInfo = systemVariables.systemInfo;
        if(currentEntityData){
            enhancedData.currentEntity = currentEntityData;
        }
        return enhancedData;
    }

    unescapeHtml(text)
    {
        return text
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&#x3D;/g, '=')
            .replace(/&#x2F;/g, '/')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    findAllPartialTags(template)
    {
        return this.partialsTransformer.findAllPartialTags(template);
    }

    loadPartialTemplate(partialName, domain)
    {
        return this.partialsTransformer.loadPartialTemplate(partialName, domain);
    }

}

module.exports.TemplateEngine = TemplateEngine;
