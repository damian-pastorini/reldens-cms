/**
 *
 * Reldens - Entity Access Manager Test
 *
 */

const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { EntityAccessManager } = require('../../lib/frontend/entity-access-manager');

class EntityAccessManagerTest
{

    constructor()
    {
        this.runner = new TestRunner();
        this.accessRows = [
            {
                entity_name: 'cmsPages',
                is_public: 1,
                access_rules: '{"publicConditions":{"enabled":1},"publicRelations":["related_routes"]}'
            },
            {entity_name: 'cmsBlocks', is_public: 1, access_rules: null},
            {entity_name: 'cmsSearch', is_public: 0, access_rules: {searchSets: {}}}
        ];
        this.entityAccess = {cmsPages: {accessRules: {publicFilters: ['category_id'], publicConditions: {enabled: 0}}}};
    }

    async run()
    {
        this.runner.suite('EntityAccessManager');
        await this.testAccessRules();
        await this.testPublicEntityRoutes();
        return this.runner.getResults();
    }

    async createAccessManager(loadCalls)
    {
        let entity = {
            loadOne: async (filters) => {
                loadCalls.push({method: 'loadOne', filters});
                return {id: filters.id};
            },
            loadOneWithRelations: async (filters, relations) => {
                loadCalls.push({method: 'loadOneWithRelations', filters, relations});
                return {id: filters.id};
            }
        };
        let accessManager = new EntityAccessManager({
            entityAccess: this.entityAccess,
            dataServer: {
                getEntity: (entityName) => 'entitiesAccess' === entityName ? {loadAll: async () => this.accessRows} : entity
            }
        });
        await accessManager.loadEntityAccessRules();
        return accessManager;
    }

    async testAccessRules()
    {
        this.runner.group('access rules from the arguments and the entities access table');
        let accessManager = await this.createAccessManager([]);
        await this.runner.test('should override the argument rules with the access_rules column values', async () => {
            assert.deepStrictEqual(accessManager.getAccessRules('cmsPages'), {
                publicFilters: ['category_id'],
                publicConditions: {enabled: 1},
                publicRelations: ['related_routes']
            });
        });
        await this.runner.test('should use the is_public value of an existing row over the default', async () => {
            assert.strictEqual(accessManager.resolvePublicAccess('cmsSearch', true), false);
        });
        await this.runner.test('should use the default access without a row', async () => {
            assert.strictEqual(accessManager.resolvePublicAccess('missingEntity', true), true);
        });
    }

    async testPublicEntityRoutes()
    {
        this.runner.group('public entity routes');
        let loadCalls = [];
        let accessManager = await this.createAccessManager(loadCalls);
        await accessManager.findEntityByPath('/cmsPages/5');
        await accessManager.findEntityByPath('/cmsBlocks/7');
        await this.runner.test('should load the entity row with the public conditions and relations', async () => {
            assert.deepStrictEqual(
                loadCalls.shift(),
                {method: 'loadOneWithRelations', filters: {enabled: 1, id: '5'}, relations: ['related_routes']}
            );
        });
        await this.runner.test('should load the entity row without relations by default', async () => {
            assert.deepStrictEqual(loadCalls.shift(), {method: 'loadOne', filters: {id: '7'}});
        });
    }

}

module.exports.EntityAccessManagerTest = EntityAccessManagerTest;
