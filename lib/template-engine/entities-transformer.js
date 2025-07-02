/**
 *
 * Reldens - CMS - EntitiesTransformer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class EntitiesTransformer
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.jsonFieldsParser = sc.get(props, 'jsonFieldsParser', false);
        this.processAllTemplateFunctions = sc.get(props, 'processAllTemplateFunctions', false);
    }

    getEntityRegex()
    {
        return /<entity\s+name="([^"]+)"(?:\s+field="([^"]+)"\s+value="([^"]+)"|\s+id="([^"]+)")?\s*\/?>/g;
    }

    async transform(template, domain, req, systemVariables)
    {
        let processedTemplate = template;
        for(let match of template.matchAll(this.getEntityRegex())){
            let tableName = match[1];
            let field = sc.get(match, '2', 'id');
            let value = sc.get(match, '3', sc.get(match, '4', ''));
            if(!value){
                Logger.warning('Entity tag missing value: '+match[0]);
                continue;
            }
            processedTemplate = processedTemplate.replace(
                match[0],
                await this.processAllTemplateFunctions(
                    sc.get(await this.fetchEntityForTemplate(tableName, value, field), 'content', ''),
                    domain,
                    req,
                    systemVariables
                )
            );
        }
        return processedTemplate;
    }

    async fetchEntityForTemplate(tableName, identifier, identifierField)
    {
        let entity = this.dataServer.getEntity(tableName);
        if(!entity){
            Logger.warning('Entity not found in dataServer: '+tableName);
            return false;
        }
        let result = await entity.loadOneBy(identifierField, identifier);
        if(!result){
            return false;
        }
        return this.jsonFieldsParser.parseJsonFields(
            result,
            this.jsonFieldsParser.getJsonFieldsForEntity(tableName)
        );
    }

}

module.exports.EntitiesTransformer = EntitiesTransformer;
