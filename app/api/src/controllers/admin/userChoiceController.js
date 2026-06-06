const UserChoice = require('../../models/UserChoice');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(UserChoice, { imageFields: ['user_choice_image'], searchFields: ['user_choice_title'], defaultSort: { display_order: 1 } });
