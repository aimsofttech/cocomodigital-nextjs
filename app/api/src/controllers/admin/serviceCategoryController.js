const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const createCrudController = require('./crudFactory');
const { cascadeDelete } = require('./cascadeDelete');

const base = createCrudController(ServiceCategory, {
  imageFields: ['icon'],
  searchFields: ['name'],
  defaultSort: { displayOrder: 1 },
});

// Deleting a Service Department removes all its Service Categories too.
const destroyWithCascade = async (req, res) => {
  await cascadeDelete(req.params.id, [
    { model: ServiceItem, fk: 'serviceCategoryId', media: ['image'] },
  ]);
  return base.destroy(req, res);
};

module.exports = { ...base, destroy: destroyWithCascade };
