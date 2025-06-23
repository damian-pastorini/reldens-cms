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
const { Logger, sc } = require('@reldens/utils');

class TemplateEngine
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.jsonFieldsParser = new JsonFieldsParser({entitiesConfig: sc.get(props, 'entitiesConfig', {})});
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
            loadPartialTemplate: this.loadPartialTemplate.bind(this)
        });
        this.collectionsTransformer = new CollectionsTransformer({
            dataServer: this.dataServer,
            jsonFieldsParser: this.jsonFieldsParser,
            renderEngine: this.renderEngine,
            getPartials: this.getPartials,
            findAllPartialTags: this.findAllPartialTags.bind(this),
            loadPartialTemplate: this.loadPartialTemplate.bind(this)
        });
        this.partialsTransformer = new PartialsTransformer({
            renderEngine: this.renderEngine,
            getPartials: this.getPartials
        });
        this.transformers = [
            this.entitiesTransformer,
            this.collectionsSingleTransformer,
            this.collectionsTransformer,
            this.partialsTransformer
        ];
    }

    async processAllTemplateFunctions(template, domain, req)
    {
        let processedTemplate = template;
        for(let transformer of this.transformers){
            if(sc.isFunction(transformer.transform)){
                processedTemplate = await transformer.transform(processedTemplate, domain, req);
            }
        }
        return processedTemplate;
    }

    async render(template, data, partials, domain, req)
    {
        if(!this.renderEngine){
            Logger.error('Render engine not provided');
            return '';
        }
        if(!sc.isFunction(this.renderEngine.render)){
            Logger.error('Render engine does not contain a render method');
            return '';
        }
        return this.renderEngine.render(
            this.unescapeHtml(await this.processAllTemplateFunctions(template, domain, req)),
            data,
            partials
        );
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
