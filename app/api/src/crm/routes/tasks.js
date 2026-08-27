'use strict';

const router = require('express').Router();
const { CrmTask } = require('../models');
const { crmProtect, requirePermission, scopeFilter, audit } = require('../middleware/crmAuth');
const timeline = require('../services/timeline');
const notify = require('../services/notify');
const jobs = require('../services/jobs');
const { ok, created, bad, notFound, listOf } = require('./_helpers');

router.use(crmProtect, audit);

const entityOf = (task) =>
  task.leadId ? { kind: 'lead', id: task.leadId } : (task.contactId ? { kind: 'contact', id: task.contactId } : null);

// GET /crm/api/tasks?assigneeId=me&status=&due=today|overdue|week&leadId=
router.get('/', requirePermission('tasks:read'), (req, res) => {
  const filter = { ...scopeFilter(req, 'assigneeId') };
  if (req.query.assigneeId) filter.assigneeId = req.query.assigneeId === 'me' ? req.crmUser._id : req.query.assigneeId;
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  if (req.query.leadId) filter.leadId = req.query.leadId;
  if (req.query.contactId) filter.contactId = req.query.contactId;
  const now = new Date();
  if (req.query.due === 'today') {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    filter.dueAt = { $lte: end };
    filter.status = { $in: ['open', 'in_progress'] };
  } else if (req.query.due === 'overdue') {
    filter.dueAt = { $lt: now };
    filter.status = { $in: ['open', 'in_progress'] };
  } else if (req.query.due === 'week') {
    filter.dueAt = { $lte: new Date(Date.now() + 7 * 24 * 36e5) };
    filter.status = { $in: ['open', 'in_progress'] };
  }
  return listOf(CrmTask, req, res, {
    filter,
    searchFields: ['title', 'description'],
    sort: { dueAt: 1 },
    populate: [
      { path: 'assigneeId', select: 'name' },
      { path: 'leadId', select: 'name' },
      { path: 'contactId', select: 'firstName lastName' },
    ],
  });
});

// POST /crm/api/tasks
router.post('/', requirePermission('tasks:create'), async (req, res) => {
  const { title, description, type, leadId, contactId, dealId, assigneeId, dueAt, priority, reminderAt } = req.body;
  if (!title) return bad(res, 'title is required');
  const task = await CrmTask.create({
    title, description, type: type || 'todo',
    leadId, contactId, dealId,
    assigneeId: assigneeId || req.crmUser._id,
    createdBy: req.crmUser._id,
    dueAt: dueAt ? new Date(dueAt) : undefined,
    priority: priority || 'medium',
    reminderAt: reminderAt ? new Date(reminderAt) : undefined,
  });
  if (task.reminderAt) {
    await jobs.schedule('task:reminder', task.reminderAt, { taskId: String(task._id) },
      { dedupeKey: `task:reminder:${task._id}` });
  }
  if (String(task.assigneeId) !== String(req.crmUser._id)) {
    await notify.notify(task.assigneeId, {
      type: 'task.assigned', title: `New task: ${task.title}`,
      entity: entityOf(task) || undefined,
    });
  }
  const ent = entityOf(task);
  if (ent) {
    await timeline.record({
      entity: ent, type: 'task.created', title: `Task created: ${task.title}`,
      meta: { taskId: task._id },
      actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
    });
  }
  return created(res, task, 'Task created');
});

// PUT /crm/api/tasks/:id
router.put('/:id', requirePermission('tasks:update'), async (req, res) => {
  const task = await CrmTask.findOne({ _id: req.params.id, ...scopeFilter(req, 'assigneeId') });
  if (!task) return notFound(res, 'Task');
  const FIELDS = ['title', 'description', 'type', 'priority', 'dueAt', 'assigneeId', 'reminderAt'];
  for (const f of FIELDS) if (req.body[f] !== undefined) task[f] = req.body[f];
  await task.save();
  if (req.body.reminderAt) {
    await jobs.schedule('task:reminder', new Date(req.body.reminderAt), { taskId: String(task._id) },
      { dedupeKey: `task:reminder:${task._id}` });
  }
  return ok(res, task);
});

// PATCH /crm/api/tasks/:id/status  { status }
router.patch('/:id/status', requirePermission('tasks:update'), async (req, res) => {
  const { status } = req.body;
  if (!['open', 'in_progress', 'done', 'cancelled'].includes(status)) return bad(res, 'Invalid status');
  const task = await CrmTask.findOne({ _id: req.params.id, ...scopeFilter(req, 'assigneeId') });
  if (!task) return notFound(res, 'Task');
  task.status = status;
  if (status === 'done') {
    task.completedAt = new Date();
    task.completedBy = req.crmUser._id;
    await jobs.cancelByKey(`task:reminder:${task._id}`);
    const ent = entityOf(task);
    if (ent) {
      await timeline.record({
        entity: ent, type: 'task.completed', title: `Task completed: ${task.title}`,
        meta: { taskId: task._id },
        actor: { kind: 'user', userId: req.crmUser._id, label: req.crmUser.name },
      });
    }
  }
  await task.save();
  return ok(res, task);
});

router.delete('/:id', requirePermission('tasks:delete'), async (req, res) => {
  const task = await CrmTask.findByIdAndDelete(req.params.id);
  if (!task) return notFound(res, 'Task');
  await jobs.cancelByKey(`task:reminder:${task._id}`);
  return ok(res, null);
});

module.exports = router;
