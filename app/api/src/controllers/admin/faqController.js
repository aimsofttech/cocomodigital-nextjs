const Faq = require('../../models/Faq');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(Faq, { searchFields: ['question', 'answer'], defaultSort: { display_order: 1 } });
