/**
 *
 * Reldens - CMS - PathFunctionTransformer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PathFunctionTransformer
{

    constructor(functionPattern)
    {
        this.functionPattern = functionPattern;
    }

    async transform(template, domain, req, systemVariables)
    {
        if(!template){
            return template;
        }
        let currentRequest = sc.get(systemVariables, 'currentRequest', {});
        let publicPath = sc.get(sc.get(systemVariables, 'systemInfo', {}), 'publicPath', '');
        let matches = [...template.matchAll(this.functionPattern)];
        for(let i = matches.length - 1; i >= 0; i--){
            let match = matches[i];
            let absoluteUrl = this.buildUrl(match[1].replace(/['"]/g, ''), currentRequest, publicPath);
            template = template.substring(0, match.index)+absoluteUrl+template.substring(match.index+match[0].length);
        }
        return template;
    }

    buildUrl(path)
    {
        Logger.error('Missing buildUrl() implementation on the path function transformer.', this.constructor.name);
        return path;
    }

}

module.exports.PathFunctionTransformer = PathFunctionTransformer;
