/**
 *
 * Reldens - CsrfProtection
 *
 * Session based CSRF tokens for the administration router. The token is created on the first request of a session
 * and compared with a constant time comparison on every state changing request, accepted from the request body or
 * from the request header.
 *
 */

const crypto = require('crypto');
const { Logger, sc } = require('@reldens/utils');

class CsrfProtection
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {boolean} */
        this.enabled = Boolean(sc.get(props, 'enabled', false));
        /** @type {string} */
        this.tokenFieldName = sc.get(props, 'tokenFieldName', '_csrf');
        /** @type {string} */
        this.headerName = sc.get(props, 'headerName', 'x-csrf-token');
        /** @type {Array<string>} */
        this.ignoredPaths = sc.get(props, 'ignoredPaths', []);
        /** @type {Array<string>} */
        this.safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    }

    /**
     * @param {Object} req
     * @returns {string}
     */
    fetchToken(req)
    {
        if(!req.session){
            return '';
        }
        if(!req.session.csrfToken){
            req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        }
        return req.session.csrfToken;
    }

    /**
     * @param {Object} req
     * @returns {boolean}
     */
    isIgnoredPath(req)
    {
        for(let ignoredPath of this.ignoredPaths){
            if(0 === String(req.path).indexOf(ignoredPath)){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {Object} req
     * @returns {boolean}
     */
    isValidRequest(req)
    {
        let sessionToken = sc.get(req.session, 'csrfToken', '');
        if('' === sessionToken){
            return false;
        }
        let requestToken = String(
            sc.get(req.body, this.tokenFieldName, '') || sc.get(req.headers, this.headerName, '')
        );
        if(requestToken.length !== sessionToken.length){
            return false;
        }
        return crypto.timingSafeEqual(Buffer.from(requestToken), Buffer.from(sessionToken));
    }

    /**
     * @returns {Function}
     */
    createMiddleware()
    {
        return (req, res, next) => {
            this.fetchToken(req);
            if(!this.enabled){
                return next();
            }
            if(-1 !== this.safeMethods.indexOf(req.method)){
                return next();
            }
            if(this.isIgnoredPath(req)){
                return next();
            }
            if(this.isValidRequest(req)){
                return next();
            }
            Logger.warning('Rejected administration request without a valid CSRF token.', {path: req.path});
            return res.status(403).send('Invalid request token.');
        };
    }

}

module.exports.CsrfProtection = CsrfProtection;
