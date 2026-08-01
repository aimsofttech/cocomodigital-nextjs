'use strict';

/**
 * Lead ingestion — the bridge between the existing website enquiry flows and
 * the CRM. Called (fire-and-forget, never throws) from the existing public
 * controllers right after they save their own document, so leads appear in
 * the CRM instantly with zero polling and zero extra infrastructure.
 *
 * Dedup: 1) exact external record (idempotent), 2) email/phone match on an
 * open lead → logged as a re-enquiry instead of a duplicate.
 */

const { CrmLead, CrmContact, CrmCall, CrmTask } = require('../models');
const timeline = require('./timeline');
const automation = require('./automation');
const logger = require('../../utils/logger');

const SCORE = { meeting: 30, consultation: 20, marketing_form: 10, contact_form: 5 };

const computeScore = (lead) => {
  let score = SCORE[lead.source && lead.source.channel] || 0;
  if (lead.budget) score += 15;
  if (lead.phone) score += 10;
  return score;
};

const ratingFor = (score) => (score >= 50 ? 'hot' : score >= 20 ? 'warm' : 'cold');

/**
 * @param {{ channel:string, externalCollection?:string, externalId?:string,
 *           name:string, email?:string, phone?:string, company?:string,
 *           message?:string, serviceInterest?:string, budget?:string,
 *           sourcePage?:string, raw?:object, meetingStartUtc?:Date|string }} input
 */
const ingest = async (input) => {
  try {
    if (!input || !input.name) return null;

    // The Leads module is sales-only. Job applications belong to the separate
    // Job Applicants module and are rejected here even if a caller still passes
    // the old channel, so no recruitment records can leak back into Leads.
    if (input.channel === 'job_applicant') return null;

    // 1) Idempotency on the external record.
    if (input.externalId) {
      const existing = await CrmLead.findOne({
        'source.externalCollection': input.externalCollection,
        'source.externalId': String(input.externalId),
      }).lean();
      if (existing) return existing;
    }

    // 2) Duplicate person? (email or phone match on a non-deleted lead)
    const or = [];
    if (input.email) or.push({ email: String(input.email).toLowerCase() });
    if (input.phone) {
      const tail = String(input.phone).replace(/[^\d]/g, '').slice(-10);
      if (tail.length === 10) or.push({ phone: new RegExp(`${tail}$`) });
    }
    if (or.length) {
      const dupLead = await CrmLead.findOne({ $or: or, deletedAt: null, status: { $nin: ['won', 'junk'] } })
        .sort({ createdAt: -1 });
      if (dupLead) {
        await timeline.record({
          entity: { kind: 'lead', id: dupLead._id },
          type: 'lead.re_enquired',
          title: `New enquiry received again via ${input.channel}`,
          meta: { channel: input.channel, message: input.message, sourcePage: input.sourcePage },
          actor: { kind: 'sync', label: 'Website' },
        });
        await automation.emitEvent('lead.re_enquired', {
          entityKind: 'lead', entityId: dupLead._id, data: { channel: input.channel },
        });
        return dupLead;
      }

      const dupContact = await CrmContact.findOne({ $or: or, deletedAt: null });
      if (dupContact) {
        // Existing customer enquired again → task for their owner, no new lead.
        await timeline.record({
          entity: { kind: 'contact', id: dupContact._id },
          type: 'contact.enquiry',
          title: `Existing customer submitted a new enquiry via ${input.channel}`,
          meta: { channel: input.channel, message: input.message },
          actor: { kind: 'sync', label: 'Website' },
        });
        if (dupContact.ownerId) {
          await CrmTask.create({
            title: `Customer enquiry: ${dupContact.firstName} (${input.channel})`,
            description: input.message,
            type: 'todo',
            contactId: dupContact._id,
            assigneeId: dupContact.ownerId,
            dueAt: new Date(Date.now() + 24 * 36e5),
            priority: 'high',
          });
          await require('./notify').notify(dupContact.ownerId, {
            type: 'contact.enquiry',
            title: `Existing customer enquired again: ${dupContact.firstName}`,
            entity: { kind: 'contact', id: dupContact._id },
          });
        }
        return null;
      }
    }

    // 3) Create the lead.
    const lead = await CrmLead.create({
      name: input.name,
      email: input.email ? String(input.email).toLowerCase() : undefined,
      phone: input.phone,
      company: input.company,
      message: input.message,
      serviceInterest: input.serviceInterest,
      budget: input.budget,
      source: {
        channel: input.channel,
        externalCollection: input.externalCollection,
        externalId: input.externalId ? String(input.externalId) : undefined,
        sourcePage: input.sourcePage,
        raw: input.raw,
      },
      status: 'new',
      tags: [],
    });
    lead.score = computeScore(lead);
    lead.rating = ratingFor(lead.score);
    await lead.save();

    await timeline.record({
      entity: { kind: 'lead', id: lead._id },
      type: 'lead.created',
      title: `Lead captured from ${input.channel.replace('_', ' ')}${input.sourcePage ? ` (${input.sourcePage})` : ''}`,
      meta: { channel: input.channel },
      actor: { kind: 'sync', label: 'Website' },
    });

    // Meeting bookings also get a scheduled call at the booked slot.
    if (input.channel === 'meeting' && input.meetingStartUtc) {
      const at = new Date(input.meetingStartUtc);
      if (!Number.isNaN(at.getTime()) && at > new Date()) {
        const call = await CrmCall.create({
          leadId: lead._id,
          ownerId: lead.ownerId || undefined,
          purpose: 'intro',
          scheduledAt: at,
          durationPlannedMin: 15,
          status: 'scheduled',
          notes: `Auto-created from website meeting booking. ${input.message || ''}`.trim(),
          createdByAutomation: true,
        });
        await require('./jobs').schedule('call:reminder',
          new Date(at.getTime() - 15 * 60e3),
          { callId: String(call._id) }, { dedupeKey: `call:reminder:${call._id}` });
        await timeline.record({
          entity: { kind: 'lead', id: lead._id },
          type: 'call.scheduled',
          title: `Discovery call scheduled from website booking (${at.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`,
          meta: { callId: call._id },
          actor: { kind: 'sync', label: 'Website' },
        });
      }
    }

    await require('./notify').notifyRole(['Admin', 'Manager'], {
      type: 'lead.new',
      title: `New lead: ${lead.name} (${input.channel.replace('_', ' ')})`,
      body: (input.message || '').slice(0, 120),
      entity: { kind: 'lead', id: lead._id },
    });

    await automation.emitEvent('lead.created', {
      entityKind: 'lead', entityId: lead._id,
      data: { channel: input.channel, serviceInterest: input.serviceInterest || '' },
    });

    return lead;
  } catch (err) {
    // Ingestion must NEVER break the public website flows.
    logger.error(`CRM leadIngest failed: ${err.message}`);
    return null;
  }
};

/** Safe fire-and-forget wrapper used inside existing controllers. */
const ingestSafe = (input) => {
  // `ingest` already logs and swallows its own failures; this catch is the
  // backstop for anything thrown before that try block is entered. Logged
  // rather than discarded, so a lead never goes missing without a trace.
  ingest(input).catch((err) => {
    logger.error(`CRM leadIngest (safe) failed for channel=${input && input.channel}: ${err.message}`);
  });
};

module.exports = { ingest, ingestSafe, computeScore, ratingFor };
