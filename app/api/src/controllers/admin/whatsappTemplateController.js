const WhatsappTemplate = require('../../models/WhatsappTemplate');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(WhatsappTemplate, { searchFields: ['template_name'], defaultSort: { createdAt: -1 } });
