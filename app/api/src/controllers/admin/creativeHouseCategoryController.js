const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(CreativeHouseCategory, { imageFields: ['creative_house_icon'],
  searchFields: ['creative_house_category_name'],
  slugField: 'creative_house_category_slug',
  defaultSort: { display_order: 1 },
});
