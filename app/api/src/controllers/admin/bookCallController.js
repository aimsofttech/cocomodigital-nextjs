const BookCall = require('../../models/BookCall');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(BookCall, { imageFields: ['book_image'], searchFields: ['book_name'], defaultSort: { display_order: 1 } });
