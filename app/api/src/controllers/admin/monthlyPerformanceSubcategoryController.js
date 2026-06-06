const MonthlyPerformanceShowcaseSubcategory = require('../../models/MonthlyPerformanceShowcaseSubcategory');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(MonthlyPerformanceShowcaseSubcategory, { searchFields: ['mps_subcategory_name'], defaultSort: { display_order: 1 }, parentField: 'mps_category_id' });
