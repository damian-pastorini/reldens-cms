/**
 *
 * Reldens - RouterContents Test
 *
 */

const { TestRunner, assert } = require('@reldens/storage/tests/utils/test-runner');
const { RouterContents } = require('../../lib/admin-manager/router-contents');
const { AdminResourcesFixtures } = require('../fixtures/admin-resources-fixtures');

class RouterContentsTest
{

    constructor()
    {
        this.runner = new TestRunner();
    }

    async run()
    {
        this.runner.suite('RouterContents');
        await this.testGeneratePropertyEditRenderedValue();
        return this.runner.getResults();
    }

    createRouterContents()
    {
        return new RouterContents({
            dataServer: {getEntity: () => ({loadAll: async () => AdminResourcesFixtures.itemsItemRows()})},
            relations: () => ({items_item: {related_items_item_item_key: 'label', related_items_item: 'label'}}),
            resourcesByReference: () => ({items_item: AdminResourcesFixtures.itemsItemResource()}),
            fetchEntityIdPropertyKey: () => 'id'
        });
    }

    async testGeneratePropertyEditRenderedValue()
    {
        this.runner.group('generatePropertyEditRenderedValue');
        await this.runner.test('should use the referenceKey column as the options values', async () => {
            let options = await this.createRouterContents().generatePropertyEditRenderedValue(
                {id: 2, object_id: 10, item_key: 'spear'},
                'item_key',
                AdminResourcesFixtures.itemKeyReferenceProperty()
            );
            assert.deepStrictEqual(options.map((option) => option.value), ['coins', 'axe', 'spear']);
            assert.deepStrictEqual(
                options.map((option) => option.label),
                ['Coins (ID: 1)', 'Axe (ID: 4)', 'Spear (ID: 5)']
            );
        });
        await this.runner.test('should select the option of the stored key when referenceKey is set', async () => {
            let options = await this.createRouterContents().generatePropertyEditRenderedValue(
                {id: 2, object_id: 10, item_key: 'spear'},
                'item_key',
                AdminResourcesFixtures.itemKeyReferenceProperty()
            );
            assert.deepStrictEqual(options.map((option) => option.selected), ['', '', ' selected="selected"']);
        });
        await this.runner.test('should keep the ids as the options values without referenceKey', async () => {
            let options = await this.createRouterContents().generatePropertyEditRenderedValue(
                {id: 1, item_id: 4},
                'item_id',
                {type: 'reference', reference: 'items_item', alias: 'related_items_item', isRequired: true, dbType: 'int'}
            );
            assert.deepStrictEqual(options.map((option) => option.value), [1, 4, 5]);
            assert.deepStrictEqual(options.map((option) => option.selected), ['', ' selected="selected"', '']);
        });
    }

}

module.exports.RouterContentsTest = RouterContentsTest;
