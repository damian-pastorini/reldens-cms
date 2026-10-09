/**
 *
 * Reldens - ContentsBuilder Test
 *
 */

const Mustache = require('mustache');
const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { ContentsBuilder } = require('../../lib/admin-manager/contents-builder');
const { AdminResourcesFixtures } = require('../fixtures/admin-resources-fixtures');

class ContentsBuilderTest
{

    constructor()
    {
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('ContentsBuilder');
        await this.testBuildSideBarLabels();
        return this.runner.getResults();
    }

    createContentsBuilder(labels)
    {
        return new ContentsBuilder({
            renderCallback: async (template, params) => Mustache.render(template, params),
            adminFilesContents: {
                sideBarItem: '{{name}}|{{&path}}',
                sideBarHeader: '{{name}}:{{&subItems}}',
                sideBar: '{{&navigationView}}'
            },
            rootPath: '/reldens-admin',
            translations: {labels},
            resources: () => [AdminResourcesFixtures.objectsItemsInventoryResource()],
            emitEvent: async () => true
        });
    }

    async testBuildSideBarLabels()
    {
        this.runner.group('buildSideBar');
        await this.runner.test('should show the entity key label over the table name label', async () => {
            let contentsBuilder = this.createContentsBuilder(AdminResourcesFixtures.objectsItemsInventoryLabels());
            assert.strictEqual(
                await contentsBuilder.buildSideBar(),
                'NPCs Inventories|/reldens-admin/objects-items-inventory'
            );
        });
        await this.runner.test('should show the table name label when the entity key has no label', async () => {
            let contentsBuilder = this.createContentsBuilder({objects_items_inventory: 'Objects Items Inventory'});
            assert.strictEqual(
                await contentsBuilder.buildSideBar(),
                'Objects Items Inventory|/reldens-admin/objects-items-inventory'
            );
        });
        await this.runner.test('should show the table name when the entity has no label', async () => {
            let contentsBuilder = this.createContentsBuilder({});
            assert.strictEqual(
                await contentsBuilder.buildSideBar(),
                'objects_items_inventory|/reldens-admin/objects-items-inventory'
            );
        });
    }

}

module.exports.ContentsBuilderTest = ContentsBuilderTest;
