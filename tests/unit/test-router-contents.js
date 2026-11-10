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
        await this.testGenerateEditRouteContent();
        return this.runner.getResults();
    }

    createItemsRepository(loadedIds)
    {
        return {
            loadOneByWithRelations: async (idProperty, id) => {
                loadedIds.push(id);
                return AdminResourcesFixtures.itemsItemRows().find((row) => String(row[idProperty]) === id) || null;
            }
        };
    }

    createEditRouterContents(editSetup)
    {
        return new RouterContents({
            dataServer: {getEntity: () => this.createItemsRepository(editSetup.loadedIds)},
            translations: {labels: {}},
            rootPath: '/admin',
            viewPath: '/view',
            adminFilesContents: {fields: {edit: {number: 'number-field', text: 'text-field'}}},
            emitEvent: async (eventName) => editSetup.emittedEvents.push(eventName),
            adminContentsRender: async (template, data) => {
                editSetup.renders.push({template, data});
                return template;
            },
            adminContentsRenderRoute: async (content) => content,
            adminContentsEntities: () => ({'items-item': {edit: 'edit-template'}}),
            adminContentsSideBar: () => '',
            fetchTranslation: (propertyKey) => propertyKey,
            fetchEntityIdPropertyKey: () => 'id'
        });
    }

    async renderEditRoute(idValue)
    {
        let editSetup = {loadedIds: [], emittedEvents: [], renders: []};
        let query = '' === idValue ? {} : {id: idValue};
        editSetup.result = await this.createEditRouterContents(editSetup).generateEditRouteContent(
            {query},
            AdminResourcesFixtures.itemsItemResource(),
            'items-item'
        );
        editSetup.editRender = editSetup.renders.find((render) => 'edit-template' === render.template);
        return editSetup;
    }

    async testGenerateEditRouteContent()
    {
        this.runner.group('generateEditRouteContent');
        await this.runner.test('should return empty content for an id that loads no entity', async () => {
            let editSetup = await this.renderEditRoute('999');
            assert.strictEqual(editSetup.result, '');
            assert.deepStrictEqual(editSetup.loadedIds, ['999']);
            assert.strictEqual(editSetup.emittedEvents.includes('reldens.adminEditPropertiesPopulation'), false);
            assert.deepStrictEqual(editSetup.renders, []);
        });
        await this.runner.test('should render the edit form of an existing entity', async () => {
            let editSetup = await this.renderEditRoute('4');
            assert.strictEqual(editSetup.result, 'edit-template');
            assert.deepStrictEqual(editSetup.loadedIds, ['4']);
            assert.strictEqual(editSetup.emittedEvents.includes('reldens.adminEditPropertiesPopulation'), true);
            assert.strictEqual(editSetup.editRender.data.idValue, '4');
            assert.strictEqual(editSetup.editRender.data.templateTitle.startsWith('Edit '), true);
            assert.strictEqual(editSetup.editRender.data.entityViewRoute, '/admin/items-item/view?id=4');
        });
        await this.runner.test('should render the create form without loading an entity when no id is sent', async () => {
            let editSetup = await this.renderEditRoute('');
            assert.strictEqual(editSetup.result, 'edit-template');
            assert.deepStrictEqual(editSetup.loadedIds, []);
            assert.strictEqual(editSetup.editRender.data.idValue, '');
            assert.strictEqual(editSetup.editRender.data.templateTitle.startsWith('Create '), true);
            assert.strictEqual(editSetup.editRender.data.entityViewRoute, '/admin/items-item');
        });
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
