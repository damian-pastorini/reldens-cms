/**
 *
 * Reldens - AdminResourcesFixtures
 *
 */

class AdminResourcesFixtures
{

    static driverResource(tableName, entityKey, properties)
    {
        return {
            id: () => tableName,
            entityKey,
            entityPath: tableName.replace(/_/g, '-'),
            options: {
                navigation: null,
                listProperties: Object.keys(properties),
                showProperties: Object.keys(properties),
                filterProperties: Object.keys(properties),
                editProperties: Object.keys(properties),
                properties
            }
        };
    }

    static itemsItemResource()
    {
        return this.driverResource('items_item', 'itemsItem', {
            id: {isId: true, type: 'number', isRequired: true, dbType: 'int'},
            key: {isRequired: true, isUnique: true, dbType: 'varchar'},
            label: {isRequired: true, dbType: 'varchar'}
        });
    }

    static itemsItemRows()
    {
        return [
            {id: 1, key: 'coins', label: 'Coins'},
            {id: 4, key: 'axe', label: 'Axe'},
            {id: 5, key: 'spear', label: 'Spear'}
        ];
    }

    static itemKeyReferenceProperty()
    {
        return {
            type: 'reference',
            reference: 'items_item',
            alias: 'related_items_item_item_key',
            referenceKey: 'key',
            isRequired: true,
            dbType: 'varchar'
        };
    }

    static objectsItemsInventoryResource()
    {
        return this.driverResource('objects_items_inventory', 'objectsItemsInventory', {
            id: {isId: true, type: 'number', isRequired: true, dbType: 'int'},
            owner_id: {type: 'reference', reference: 'objects', alias: 'related_objects', dbType: 'int'}
        });
    }

    static objectsItemsInventoryLabels()
    {
        return {
            objects_items_inventory: 'Objects Items Inventory',
            objectsItemsInventory: 'NPCs Inventories'
        };
    }

}

module.exports.AdminResourcesFixtures = AdminResourcesFixtures;
