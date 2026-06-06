const GroupSingleServicePortfolioCategory = require('../../models/GroupSingleServicePortfolioCategory');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(GroupSingleServicePortfolioCategory, { searchFields: ['portfolio_category_name'], defaultSort: { display_order: 1 }, parentField: 'group_service_item_id' });
