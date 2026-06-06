const DevelopmentHouseItem = require('../../models/DevelopmentHouseItem');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(DevelopmentHouseItem, { imageFields: ['development_house_img'], searchFields: ['development_house_title'], defaultSort: { display_order: 1 }, parentField: 'development_house_category_id' });
