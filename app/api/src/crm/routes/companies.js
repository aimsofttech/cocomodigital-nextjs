'use strict';

const router = require('express').Router();
const { CrmCompany, CrmContact, CrmDeal } = require('../models');
const { crmProtect, requirePermission, audit } = require('../middleware/crmAuth');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

router.get('/', requirePermission('companies:read'), (req, res) =>
  listOf(CrmCompany, req, res, {
    filter: { deletedAt: null },
    searchFields: ['name', 'website', 'industry'],
    populate: [{ path: 'ownerId', select: 'name' }],
  }));

router.post('/', requirePermission('companies:manage'), async (req, res) => {
  const { name, website, industry, size, gstin, address, tags, ownerId } = req.body;
  if (!name) return bad(res, 'Company name is required');
  const company = await CrmCompany.create({ name, website, industry, size, gstin, address, tags, ownerId });
  return created(res, company, 'Company created');
});

router.get('/:id', requirePermission('companies:read'), async (req, res) => {
  const company = await CrmCompany.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!company) return notFound(res, 'Company');
  const [contacts, deals] = await Promise.all([
    CrmContact.find({ companyId: company._id, deletedAt: null }).select('firstName lastName email phone designation').lean(),
    CrmDeal.find({ companyId: company._id, deletedAt: null }).select('title stageKey value currency').lean(),
  ]);
  const totalDealValue = deals.reduce((s, d) => s + (d.value || 0), 0);
  return ok(res, { ...company, contacts, deals, totalDealValue });
});

router.put('/:id', requirePermission('companies:manage'), async (req, res) => {
  const company = await CrmCompany.findOne({ _id: req.params.id, deletedAt: null });
  if (!company) return notFound(res, 'Company');
  const FIELDS = ['name', 'website', 'industry', 'size', 'gstin', 'address', 'tags', 'ownerId'];
  for (const f of FIELDS) if (req.body[f] !== undefined) company[f] = req.body[f];
  await company.save();
  return ok(res, company);
});

router.delete('/:id', requirePermission('companies:manage'), async (req, res) => {
  const inUse = await CrmContact.countDocuments({ companyId: req.params.id, deletedAt: null });
  if (inUse) return bad(res, `Company has ${inUse} contact(s) — reassign them first`);
  const company = await CrmCompany.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
  if (!company) return notFound(res, 'Company');
  return ok(res, null);
});

module.exports = router;
