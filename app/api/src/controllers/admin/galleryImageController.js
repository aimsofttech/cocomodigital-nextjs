const Gallery = require('../../models/Gallery');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(Gallery, { imageFields: ['image'], searchFields: ['title'], defaultSort: { displayOrder: 1 } });
