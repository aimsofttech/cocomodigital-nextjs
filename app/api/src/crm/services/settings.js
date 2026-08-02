'use strict';

/** CRM-wide settings stored as a single crm_settings doc (key 'general'). */

const { CrmSetting } = require('../models');

const DEFAULTS = {
  timezone: 'Asia/Kolkata',
  quietHoursStart: '21:00',   // no WhatsApp/SMS sends between these times
  quietHoursEnd: '09:00',
  assignmentStrategy: 'round_robin',   // round_robin | load_balanced
  emailTracking: true,
  idleLeadDays: 7,
  followupEscalateHours: 4,
  automationDailyCapPerEntity: 10,
  defaultCountryCode: '91',
  // WhatsApp goes out only when an agent presses Send. Automation rules with a
  // send_whatsapp action are skipped while this is false. Email/SMS unaffected.
  automatedWhatsappEnabled: false,
  // Meta policy requires recorded opt-in before you message anyone. Turn this on
  // once you leave the sandbox: it blocks WhatsApp to any contact without a
  // whatsappOptInAt stamp, rather than trusting the default-true flag.
  requireExplicitWhatsappOptIn: false,
};

let cache = null;
let cacheAt = 0;

const getSettings = async () => {
  if (cache && Date.now() - cacheAt < 30e3) return cache;
  const doc = await CrmSetting.findOne({ key: 'general' }).lean();
  cache = { ...DEFAULTS, ...((doc && doc.value) || {}) };
  cacheAt = Date.now();
  return cache;
};

const updateSettings = async (patch) => {
  const current = await getSettings();
  const value = { ...current, ...patch };
  await CrmSetting.findOneAndUpdate(
    { key: 'general' },
    { $set: { value } },
    { upsert: true }
  );
  cache = value;
  cacheAt = Date.now();
  return value;
};

/** Minutes since midnight in the configured timezone. */
const minutesNowInTz = (timezone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value);
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
};

const parseHM = (s) => {
  const [h, m] = String(s || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/**
 * If "now" falls inside quiet hours, return the Date when sending becomes
 * allowed again; otherwise return null.
 */
const quietHoursDelay = async () => {
  const s = await getSettings();
  const now = minutesNowInTz(s.timezone);
  const start = parseHM(s.quietHoursStart);
  const end = parseHM(s.quietHoursEnd);
  let inQuiet;
  if (start <= end) inQuiet = now >= start && now < end;
  else inQuiet = now >= start || now < end;   // window crosses midnight
  if (!inQuiet) return null;
  const minutesUntilEnd = end > now ? end - now : (24 * 60 - now) + end;
  return new Date(Date.now() + minutesUntilEnd * 60e3);
};

module.exports = { getSettings, updateSettings, quietHoursDelay, DEFAULTS };
