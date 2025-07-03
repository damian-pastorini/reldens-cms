/**
 *
 * Reldens - CMS - PartialsTransformer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PartialsTransformer
{

    constructor(props)
    {
        this.renderEngine = sc.get(props, 'renderEngine', false);
        this.getPartials = sc.get(props, 'getPartials', false);
        this.processAllTemplateFunctions = sc.get(props, 'processAllTemplateFunctions', false);
    }

    async transform(template, domain, req, systemVariables)
    {
        let processedTemplate = template;
        let partialTags = this.findAllPartialTags(template);
        for(let i = partialTags.length - 1; i >= 0; i--){
            let tag = partialTags[i];
            let partialContent = this.loadPartialTemplate(tag.name, domain);
            if(!partialContent){
                Logger.warning('Partial template not found: ' + tag.name);
                processedTemplate = processedTemplate.substring(0, tag.start)+''+processedTemplate.substring(tag.end);
                continue;
            }
            if(this.processAllTemplateFunctions){
                partialContent = await this.processAllTemplateFunctions(partialContent, domain, req, systemVariables);
            }
            let wrapperTemplate = '{{#vars}}{{> ' + tag.name + '}}{{/vars}}';
            let renderData = { vars: tag.attributes };
            let partials = {[tag.name]: partialContent};
            processedTemplate = processedTemplate.substring(0, tag.start) +
                this.renderEngine.render(wrapperTemplate, renderData, partials) +
                processedTemplate.substring(tag.end);
        }
        return processedTemplate;
    }

    findAllPartialTags(template)
    {
        let partialTags = [];
        let pos = 0;
        let partial = '<partial';
        for(let tagStart = template.indexOf(partial, pos); -1 !== tagStart; tagStart=template.indexOf(partial, pos)){
            let tagEnd = this.findPartialTagEnd(template, tagStart);
            if(-1 === tagEnd){
                pos = tagStart + partial.length;
                continue;
            }
            let fullTag = template.substring(tagStart, tagEnd);
            let nameMatch = fullTag.match(/name=["']([^"']+)["']/);
            if(!nameMatch){
                pos = tagStart + partial.length;
                continue;
            }
            let partialName = nameMatch[1];
            let attributes = this.parsePartialAttributes(fullTag, partialName);
            partialTags.push({
                start: tagStart,
                end: tagEnd,
                name: partialName,
                attributes: attributes,
                fullTag: fullTag
            });
            pos = tagEnd;
        }
        return partialTags;
    }

    findPartialTagEnd(template, tagStart)
    {
        let inQuotes = false;
        let quoteChar = '';
        let selfCloseTag = '/>';
        let openCloseTag = '</partial>';
        for(let i = tagStart; i < template.length; i++){
            let char = template[i];
            if(!inQuotes && ('"' === char || "'" === char)){
                inQuotes = true;
                quoteChar = char;
                continue;
            }
            if(inQuotes && char === quoteChar && '\\' !== template[i - 1]){
                inQuotes = false;
                quoteChar = '';
                continue;
            }
            if(!inQuotes){
                if(template.substring(i, i + selfCloseTag.length) === selfCloseTag){
                    return i + selfCloseTag.length;
                }
                if('>' === char){
                    let closeIndex = template.indexOf(openCloseTag, i);
                    if(-1 !== closeIndex){
                        return closeIndex + openCloseTag.length;
                    }
                    return i + 1;
                }
            }
        }
        return -1;
    }

    parsePartialAttributes(fullTag, partialName)
    {
        let namePattern = 'name=' + this.getQuotePattern(fullTag, partialName);
        let nameIndex = fullTag.indexOf(namePattern);
        if(-1 === nameIndex){
            return {};
        }
        let attributesStart = nameIndex + namePattern.length;
        let attributesEnd = fullTag.lastIndexOf('/>');
        if(-1 === attributesEnd){
            attributesEnd = fullTag.lastIndexOf('</partial>');
        }
        if(-1 === attributesEnd){
            attributesEnd = fullTag.lastIndexOf('>');
        }
        if(-1 === attributesEnd || attributesEnd <= attributesStart){
            return {};
        }
        let attributesString = fullTag.substring(attributesStart, attributesEnd).trim();
        return this.extractAttributesObject(attributesString);
    }

    getQuotePattern(fullTag, partialName)
    {
        if(fullTag.includes('name="' + partialName + '"')){
            return '"' + partialName + '"';
        }
        if(fullTag.includes("name='" + partialName + "'")){
            return "'" + partialName + "'";
        }
        return '"' + partialName + '"';
    }

    extractAttributesObject(attributesString)
    {
        if(!attributesString){
            return {};
        }
        let attributes = {};
        let valueRegex = /(\w+)=(['"])((?:(?!\2)[^\\]|\\.)*)(\2)/g;
        for(let match of attributesString.matchAll(valueRegex)){
            attributes[match[1]] = match[3];
        }
        let booleanRegex = /\b(\w+)(?!\s*=)/g;
        for(let match of attributesString.matchAll(booleanRegex)){
            if(!sc.hasOwn(attributes, match[1])){
                attributes[match[1]] = true;
            }
        }
        return attributes;
    }

    loadPartialTemplate(partialName, domain)
    {
        if(!this.getPartials){
            return false;
        }
        let partials = this.getPartials(domain);
        if(sc.hasOwn(partials, partialName)){
            return partials[partialName];
        }
        return false;
    }

}

module.exports.PartialsTransformer = PartialsTransformer;
