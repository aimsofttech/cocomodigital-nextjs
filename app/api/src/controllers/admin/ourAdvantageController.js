const OurAdvantage = require('../../models/OurAdvantage');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(OurAdvantage, { imageFields: ['image'], searchFields: ['title', 'templateName'], defaultSort: { displayOrder: 1 } });
