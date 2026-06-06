const DevelopmentHouseCategory = require('../../models/DevelopmentHouseCategory');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(DevelopmentHouseCategory, { searchFields: ['development_house_category_name'], defaultSort: { display_order: 1 } });
