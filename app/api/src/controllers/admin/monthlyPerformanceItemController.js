const MonthlyPerformanceShowcase = require('../../models/MonthlyPerformanceShowcase');
const createCrudController = require('./crudFactory');
module.exports = createCrudController(MonthlyPerformanceShowcase, { imageFields: ['mps_img'], searchFields: ['mps_title'], defaultSort: { display_order: 1 }, parentField: 'mps_category_id' });
