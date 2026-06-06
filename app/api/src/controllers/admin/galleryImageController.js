const Gallery = require('../../models/Gallery');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(Gallery, { imageFields: ['image_file'], searchFields: ['image_title'], defaultSort: { display_order: 1 } });
