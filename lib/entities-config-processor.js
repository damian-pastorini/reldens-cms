/**
 *
 * Reldens - EntitiesConfigProcessor
 *
 */

const { Logger, sc } = require('@reldens/utils');

class EntitiesConfigProcessor
{

    /**
     * @param {Object} baseEntitiesConfig
     * @param {Object} overrides
     * @param {Object} props
     * @returns {Object}
     */
    static applyOverrides(baseEntitiesConfig, overrides, props = {})
    {
        if(!overrides || 'object' !== typeof overrides || 0 === Object.keys(overrides).length){
            return baseEntitiesConfig;
        }
        let mergedConfig = sc.deepMergeProperties({}, baseEntitiesConfig);
        for(let entityKey of Object.keys(overrides)){
            let override = overrides[entityKey];
            if(!override){
                continue;
            }
            let baseConfig = mergedConfig[entityKey] || {};
            mergedConfig[entityKey] = this.applyEntityOverride(entityKey, baseConfig, override, props);
        }
        return mergedConfig;
    }

    /**
     * @param {string} entityKey
     * @param {Object} baseConfig
     * @param {*} override
     * @param {Object} props
     * @returns {Object}
     */
    static applyEntityOverride(entityKey, baseConfig, override, props)
    {
        if('function' === typeof override && sc.hasOwn(override, 'propertiesConfig')){
            return override.propertiesConfig(baseConfig, props);
        }
        if(sc.isFunction(override)){
            return override(baseConfig, props);
        }
        if('object' === typeof override){
            return sc.deepMergeProperties({}, baseConfig, override);
        }
        Logger.warning('Invalid override type for entity: '+entityKey);
        return baseConfig;
    }

}

module.exports.EntitiesConfigProcessor = EntitiesConfigProcessor;
