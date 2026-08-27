'use strict';

const router = require('express').Router();
const { CrmDocument } = require('../models');
const { crmProtect, requirePermission, audit } = require('../middleware/crmAuth');
const { createS3Upload, deleteFromS3 } = require('../../utils/s3Upload');
const timeline = require('../services/timeline');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

// Reuses the existing S3 uploader (same bucket, crm_documents/ folder).
const upload = createS3Upload('crm_documents');

// GET /crm/api/documents?entityKind=lead&entityId=...&category=
router.get('/', requirePermission('documents:read'), (req, res) => {
  const filter = { deletedAt: null };
  if (req.query.entityKind && req.query.entityId) {
    filter['entity.kind'] = req.query.entityKind;
    filter['entity.id'] = req.query.entityId;
  }
  if (req.query.category) filter.category = req.query.category;
  return listOf(CrmDocument, req, res, {
    filter,
    searchFields: ['name'],
    populate: [{ path: 'uploadedBy', select: 'name' }],
  });
});

// POST /crm/api/documents  (multipart: file, entityKind, entityId, category?, name?)
router.post('/', requirePermission('documents:manage'), upload.single('file'), async (req, res) => {
  if (!req.file) return bad(res, 'Upload a file in the "file" field');
  const { entityKind, entityId, category, name } = req.body;
  if (!entityKind || !entityId) return bad(res, 'entityKind and entityId are required');
  const doc = await CrmDocument.create({
    name: name || req.file.originalname,
    url: req.file.location,
    s3Key: req.file.key,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    entity: { kind: entityKind, id: entityId },
    category: category || 'other',
    uploadedBy: req.crmUser._id,
  });
  await timeline.record({
    entity: { kind: entityKind, id: entityId },
    type: 'document.uploaded',
    title: `Document uploaded: ${doc.name}`,
    meta: { documentId: doc._id, url: doc.url },
    actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
  });
  return created(res, doc, 'Document uploaded');
});

// DELETE /crm/api/documents/:id (soft delete; S3 object removed best-effort)
router.delete('/:id', requirePermission('documents:manage'), async (req, res) => {
  const doc = await CrmDocument.findOne({ _id: req.params.id, deletedAt: null });
  if (!doc) return notFound(res, 'Document');
  doc.deletedAt = new Date();
  await doc.save();
  if (doc.s3Key) deleteFromS3(doc.s3Key).catch(() => {});
  return ok(res, null);
});

module.exports = router;
