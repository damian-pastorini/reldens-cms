/**
 *
 * Reldens - CMS - SystemVariablesProvider
 *
 */

const { sc } = require('@reldens/utils');

class SystemVariablesProvider
{

    constructor(props)
    {
        this.defaultDomain = sc.get(props, 'defaultDomain', 'default');
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.publicPath = sc.get(props, 'publicPath', './public');
    }

    buildSystemVariables(req, route, domain)
    {
        let currentRequest = this.buildCurrentRequestData(req, domain);
        let currentRoute = this.buildCurrentRouteData(route);
        let currentDomain = this.buildCurrentDomainData(domain);
        let systemInfo = this.buildSystemInfo();
        return {
            currentRequest,
            currentRoute,
            currentDomain,
            systemInfo
        };
    }

    buildCurrentRequestData(req, domain)
    {
        if(!req){
            return {};
        }
        let protocol = sc.get(req, 'protocol', 'http');
        let host = req.get('host') || 'localhost';
        let originalUrl = sc.get(req, 'originalUrl', sc.get(req, 'path', '/'));
        let fullUrl = protocol+'://'+host+originalUrl;
        return {
            method: sc.get(req, 'method', 'GET'),
            path: sc.get(req, 'path', '/'),
            originalUrl,
            fullUrl,
            protocol,
            host,
            domain: domain || host.split(':')[0],
            query: sc.get(req, 'query', {}),
            params: sc.get(req, 'params', {}),
            headers: sc.get(req, 'headers', {}),
            userAgent: req.get('user-agent') || '',
            ip: sc.get(req, 'ip', ''),
            baseUrl: protocol+'://'+host,
            timestamp: sc.getCurrentDate(),
            isSecure: 'https' === protocol
        };
    }

    buildCurrentRouteData(route)
    {
        if(!route){
            return null;
        }
        return {
            id: sc.get(route, 'id', null),
            path: sc.get(route, 'path', ''),
            router: sc.get(route, 'router', ''),
            domain: sc.get(route, 'domain', null),
            enabled: sc.get(route, 'enabled', false),
            title: sc.get(route, 'title', ''),
            template: sc.get(route, 'template', ''),
            layout: sc.get(route, 'layout', ''),
            meta_title: sc.get(route, 'meta_title', ''),
            meta_description: sc.get(route, 'meta_description', ''),
            sort_order: sc.get(route, 'sort_order', 0)
        };
    }

    buildCurrentDomainData(domain)
    {
        return {
            current: domain || this.defaultDomain,
            default: this.defaultDomain,
            resolved: domain || this.defaultDomain
        };
    }

    buildSystemInfo()
    {
        let date = new Date();
        return {
            projectRoot: this.projectRoot,
            publicPath: this.publicPath,
            nodeVersion: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV || 'development',
            timestamp: sc.getCurrentDate(),
            uptime: process.uptime(),
            currentDate: sc.formatDate(date),
            currentYear: sc.formatDate(date, 'Y')
        };
    }

}

module.exports.SystemVariablesProvider = SystemVariablesProvider;
