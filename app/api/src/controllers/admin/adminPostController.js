const AdminPost = require('../../models/AdminPost');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(AdminPost, { imageFields: ['post_image'], searchFields: ['post_title'], defaultSort: { createdAt: -1 } });
