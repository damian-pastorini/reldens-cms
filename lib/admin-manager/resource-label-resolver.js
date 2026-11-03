/**
 *
 * Reldens - ResourceLabelResolver
 *
 */

const { sc } = require('@reldens/utils');

class ResourceLabelResolver
{

    static resolve(labels, driverResource)
    {
        return sc.get(labels, driverResource.entityKey, sc.get(labels, driverResource.id(), driverResource.id()));
    }

}

module.exports.ResourceLabelResolver = ResourceLabelResolver;
