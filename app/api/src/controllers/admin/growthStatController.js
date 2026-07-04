const GrowthStat = require('../../models/GrowthStat');
const createCrudController = require('./crudFactory');

module.exports = createCrudController(GrowthStat, {
  searchFields: ['label', 'prefix', 'suffix'],
  defaultSort: { displayOrder: 1 },
  // Stat tiles have no public detail page — no slug needed.
  slug: false,
});
