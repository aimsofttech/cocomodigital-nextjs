const OurAdvantage = require('../../models/OurAdvantage');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(OurAdvantage, { imageFields: ['image'], searchFields: ['advantage_title'], defaultSort: { display_order: 1 } });
