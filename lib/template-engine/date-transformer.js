/**
 *
 * Reldens - CMS - DateTransformer
 *
 */

const { sc } = require('@reldens/utils');

class DateTransformer
{

    constructor(props)
    {
        this.defaultFormat = sc.get(props, 'defaultFormat', 'Y-m-d H:i:s');
    }

    async transform(template, domain, req, systemVariables)
    {
        if(!template){
            return template;
        }
        let datePattern = /\[date\(([^)]*)\)\]/g;
        let matches = [...template.matchAll(datePattern)];
        for(let i = matches.length - 1; i >= 0; i--){
            let match = matches[i];
            let args = match[1] ? match[1].split(',').map(arg => arg.trim().replace(/['"]/g, '')) : [];
            let dateValue = args[0] || '';
            let formatValue = args[1] || this.defaultFormat;
            let formattedDate = this.formatDate(dateValue, formatValue);
            template = template.substring(0, match.index) +
                formattedDate +
                template.substring(match.index + match[0].length);
        }
        return template;
    }

    formatDate(dateValue, format)
    {
        let date;
        if(!dateValue || '' === dateValue || 'now' === dateValue.toLowerCase()){
            return sc.formatDate(new Date(), format);
        }
        date = new Date(dateValue);
        if(isNaN(date.getTime())){
            date = new Date();
        }
        return sc.formatDate(date, format);
    }

}

module.exports.DateTransformer = DateTransformer;
