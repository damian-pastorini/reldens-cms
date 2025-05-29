/**
 *
 * Reldens - TemplatesToPathMapper
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TemplatesToPathMapper
{

    map(templateList, path)
    {
        let result = {};
        for(let templateName of Object.keys(templateList)){
            if(sc.isObject(templateList[templateName])){
                result[templateName] = this.map(templateList[templateName], FileHandler.joinPaths(path, templateName));
                continue;
            }
            result[templateName] = FileHandler.joinPaths(path, templateList[templateName]);
        }
        return result;
    }

}

module.exports.TemplatesToPathMapper = new TemplatesToPathMapper();
