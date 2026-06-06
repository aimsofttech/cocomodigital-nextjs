const AuthorTemplate = require('../../models/AuthorTemplate');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(AuthorTemplate, { imageFields: ['author_image'], searchFields: ['author_name'], defaultSort: { display_order: 1 } });
