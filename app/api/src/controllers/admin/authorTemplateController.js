const AuthorTemplate = require('../../models/AuthorTemplate');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(AuthorTemplate, { imageFields: ['image'], searchFields: ['name'], defaultSort: { displayOrder: 1 } });
