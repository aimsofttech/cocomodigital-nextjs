const MonthlyPerformanceShowcaseCategory = require('../../models/MonthlyPerformanceShowcaseCategory');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(MonthlyPerformanceShowcaseCategory, { imageFields: ['mps_icon'], searchFields: ['mps_category_name'], defaultSort: { display_order: 1 } });
