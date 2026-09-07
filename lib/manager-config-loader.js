/**
 *
 * Reldens - CMS - Manager Config Loader
 *
 */

const { sc } = require('@reldens/utils');

class ManagerConfigLoader
{

    static loadFromEnv()
    {
        return {
            host: sc.get(process.env, 'RELDENS_APP_HOST', 'http://localhost'),
            port: Number(sc.get(process.env, 'RELDENS_APP_PORT', 8080)),
            adminPath: sc.get(process.env, 'RELDENS_ADMIN_ROUTE_PATH', '/reldens-admin'),
            adminSecret: sc.get(process.env, 'RELDENS_ADMIN_SECRET', ''),
            database: {
                client: sc.get(process.env, 'RELDENS_DB_CLIENT', 'mysql'),
                host: sc.get(process.env, 'RELDENS_DB_HOST', 'localhost'),
                port: Number(sc.get(process.env, 'RELDENS_DB_PORT', 3306)),
                name: sc.get(process.env, 'RELDENS_DB_NAME', 'reldens_cms'),
                user: sc.get(process.env, 'RELDENS_DB_USER', ''),
                password: sc.get(process.env, 'RELDENS_DB_PASSWORD', ''),
                driver: sc.get(process.env, 'RELDENS_STORAGE_DRIVER', 'mikro-orm'),
                prismaAdapter: sc.get(process.env, 'RELDENS_PRISMA_ADAPTER', '@prisma/adapter-mariadb'),
                prismaAdapterClass: sc.get(process.env, 'RELDENS_PRISMA_ADAPTER_CLASS', 'PrismaMariaDb')
            },
            publicUrl: sc.get(process.env, 'RELDENS_PUBLIC_URL', '')
        };
    }
}

module.exports.ManagerConfigLoader = ManagerConfigLoader;
