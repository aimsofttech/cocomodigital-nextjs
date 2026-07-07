const BookCall = require('../../models/BookCall');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(BookCall, { imageFields: ['image'], searchFields: ['name'], defaultSort: { displayOrder: 1 } });
