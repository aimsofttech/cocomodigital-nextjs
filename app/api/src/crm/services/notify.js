'use strict';

/**
 * Notification fan-out: always writes an in-app notification; also emails the
 * user for important types when their prefs allow (uses the existing mailer,
 * which degrades gracefully when SMTP is unconfigured).
 * The frontend polls GET /crm/api/notifications for the live bell.
 */

const { CrmNotification, CrmUser, CrmRole } = require('../models');
const mailer = require('../../services/mailer');
const logger = require('../../utils/logger');

const EMAIL_TYPES = new Set([
  'lead.assigned', 'task.assigned', 'followup.overdue', 'message.failed', 'automation.failed',
]);

/**
 * @param {string|string[]} userIds
 * @param {{type:string, title:string, body?:string, entity?:{kind:string,id:any}}} payload
 */
const notify = async (userIds, payload) => {
  const ids = [].concat(userIds).filter(Boolean);
  if (!ids.length) return [];
  const docs = [];
  for (const userId of ids) {
    try {
      const doc = await CrmNotification.create({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body || '',
        entity: payload.entity,
      });
      docs.push(doc);

      if (EMAIL_TYPES.has(payload.type)) {
        const user = await CrmUser.findById(userId).lean();
        if (user && user.notificationPrefs && user.notificationPrefs.email !== false) {
          mailer.sendMail({
            to: user.email,
            subject: `[Cocoma CRM] ${payload.title}`,
            html: `<p>${payload.title}</p><p>${payload.body || ''}</p>`,
          }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error(`CRM notify failed: ${err.message}`);
    }
  }
  return docs;
};

/** Notify every active user holding a role (e.g. all Managers/Admins). */
const notifyRole = async (roleNames, payload) => {
  const roles = await CrmRole.find({ name: { $in: [].concat(roleNames) } }).select('_id').lean();
  if (!roles.length) return [];
  const users = await CrmUser.find({ roleId: { $in: roles.map((r) => r._id) }, isActive: true })
    .select('_id').lean();
  return notify(users.map((u) => u._id), payload);
};

module.exports = { notify, notifyRole };
