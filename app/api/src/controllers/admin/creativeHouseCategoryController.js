const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseCategory, { imageFields: ['creative_house_icon'],
  searchFields: ['creative_house_category_name'],
  defaultSort: { display_order: 1 },
});
