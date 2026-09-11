/**
 *
 * Reldens - CMS - StorageDriversResolver
 *
 */

const {
    PackageResolver,
    KnexModulesLoader,
    KyselyModulesLoader,
    DrizzleModulesLoader,
    ObjectionModulesLoader,
    MikroOrmModulesLoader
} = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class StorageDriversResolver
{

    static drivers()
    {
        return [
            {key: 'knex', label: 'Knex', modulesProp: 'knexModules', packages: []},
            {key: 'kysely', label: 'Kysely', modulesProp: 'kyselyModules', packages: ['kysely']},
            {
                key: 'drizzle',
                label: 'Drizzle',
                modulesProp: 'drizzleModules',
                packages: ['drizzle-orm', 'drizzle-orm/mysql2']
            },
            {key: 'objection-js', label: 'Objection JS', modulesProp: 'objectionModules', packages: ['objection']},
            {
                key: 'mikro-orm',
                label: 'Mikro ORM',
                modulesProp: 'mikroOrmModules',
                packages: ['@mikro-orm/core', '@mikro-orm/mysql']
            },
            {key: 'prisma', label: 'Prisma', modulesProp: 'prismaModules', packages: ['@prisma/client']}
        ];
    }

    static modulesProp(driverKey)
    {
        return sc.get(StorageDriversResolver.drivers().find(driver => driverKey === driver.key), 'modulesProp', false);
    }

    static available(projectRoot, prismaAdapter)
    {
        return StorageDriversResolver.drivers().filter(driver => {
            let packages = 'prisma' === driver.key ? [...driver.packages, prismaAdapter] : driver.packages;
            return packages.every(packageName => PackageResolver.optionalPackage(packageName, projectRoot));
        });
    }

    static loadModules(driverKey, projectRoot, client)
    {
        if('kysely' === driverKey){
            return KyselyModulesLoader.load(projectRoot);
        }
        if('drizzle' === driverKey){
            return DrizzleModulesLoader.load(projectRoot);
        }
        if('objection-js' === driverKey){
            return ObjectionModulesLoader.load(projectRoot);
        }
        if('mikro-orm' === driverKey){
            return MikroOrmModulesLoader.load(projectRoot, client);
        }
        if('knex' === driverKey){
            return KnexModulesLoader.load();
        }
        return false;
    }

}

module.exports.StorageDriversResolver = StorageDriversResolver;
