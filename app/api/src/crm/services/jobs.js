'use strict';

/**
 * MongoDB-backed job scheduler — replaces Redis/BullMQ with zero extra
 * infrastructure. Jobs live in the `crm_jobs` collection; a poller claims due
 * jobs atomically (findOneAndUpdate) every TICK_MS, so it is safe even if a
 * second API instance is ever started.
 *
 * Supports: delayed one-off jobs, dedupe keys (idempotent scheduling +
 * cancellation), retries with exponential backoff, and repeatable jobs.
 */

const { CrmJob } = require('../models');
const logger = require('../../utils/logger');

const TICK_MS = 15 * 1000;          // poll interval
const BATCH = 10;                   // max jobs per tick
const STALE_LOCK_MS = 10 * 60e3;    // re-queue jobs stuck in 'running'

const handlers = {};                // name -> async (data, job) => {}
let timer = null;
let running = false;

const define = (name, fn) => { handlers[name] = fn; };

/**
 * Schedule a job. If dedupeKey is given, an existing pending job with the
 * same key is replaced (idempotent re-scheduling).
 */
const schedule = async (name, runAt, data = {}, opts = {}) => {
  const doc = {
    name,
    data,
    runAt: runAt || new Date(),
    status: 'pending',
    attempts: 0,
    maxAttempts: opts.maxAttempts || 3,
    lastError: null,
  };
  if (opts.repeatEveryMs) doc.repeatEveryMs = opts.repeatEveryMs;
  if (opts.dedupeKey) {
    doc.dedupeKey = opts.dedupeKey;
    return CrmJob.findOneAndUpdate(
      { dedupeKey: opts.dedupeKey, status: 'pending' },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  return CrmJob.create(doc);
};

/** Cancel pending job(s) by dedupe key. */
const cancelByKey = async (dedupeKey) => {
  if (!dedupeKey) return;
  await CrmJob.updateMany(
    { dedupeKey, status: 'pending' },
    { $set: { status: 'cancelled', finishedAt: new Date() } }
  );
};

/** Register a repeatable job (self-rescheduling). */
const every = async (name, everyMs, data = {}) => {
  await schedule(name, new Date(Date.now() + 5000), data, {
    dedupeKey: `repeat:${name}`,
    repeatEveryMs: everyMs,
    maxAttempts: 1,
  });
};

const runJob = async (job) => {
  const fn = handlers[job.name];
  try {
    if (!fn) throw new Error(`No handler registered for job "${job.name}"`);
    await fn(job.data || {}, job);
    if (job.repeatEveryMs) {
      // Re-schedule the next occurrence.
      await CrmJob.updateOne(
        { _id: job._id },
        { $set: { status: 'pending', runAt: new Date(Date.now() + job.repeatEveryMs), attempts: 0, lockedAt: null } }
      );
    } else {
      await CrmJob.updateOne(
        { _id: job._id },
        { $set: { status: 'done', finishedAt: new Date() } }
      );
    }
  } catch (err) {
    logger.error(`CRM job "${job.name}" failed: ${err.message}`);
    const attempts = (job.attempts || 0) + 1;
    if (job.repeatEveryMs) {
      // Repeatables never die — try again next interval.
      await CrmJob.updateOne(
        { _id: job._id },
        { $set: { status: 'pending', runAt: new Date(Date.now() + job.repeatEveryMs), lastError: err.message, lockedAt: null } }
      );
    } else if (attempts < (job.maxAttempts || 3)) {
      // Exponential backoff: 1m, 5m, 25m...
      const delayMs = 60e3 * Math.pow(5, attempts - 1);
      await CrmJob.updateOne(
        { _id: job._id },
        { $set: { status: 'pending', attempts, runAt: new Date(Date.now() + delayMs), lastError: err.message, lockedAt: null } }
      );
    } else {
      await CrmJob.updateOne(
        { _id: job._id },
        { $set: { status: 'failed', attempts, lastError: err.message, finishedAt: new Date() } }
      );
    }
  }
};

const tick = async () => {
  if (running) return;
  // Nothing here can work without a database, and every query would sit in
  // Mongoose's buffer until it times out — producing a "buffering timed out
  // after 10000ms" error every 15 seconds, which buries the one line that
  // actually matters (the connection failure itself).
  if (require('mongoose').connection.readyState !== 1) return;
  running = true;
  try {
    // Recover jobs whose worker died mid-run.
    await CrmJob.updateMany(
      { status: 'running', lockedAt: { $lt: new Date(Date.now() - STALE_LOCK_MS) } },
      { $set: { status: 'pending', lockedAt: null } }
    );
    for (let i = 0; i < BATCH; i++) {
      const job = await CrmJob.findOneAndUpdate(
        { status: 'pending', runAt: { $lte: new Date() } },
        { $set: { status: 'running', lockedAt: new Date() } },
        { sort: { runAt: 1 }, new: true }
      );
      if (!job) break;
      // Run sequentially — keeps load predictable on the shared API process.
      // eslint-disable-next-line no-await-in-loop
      await runJob(job);
    }
  } catch (err) {
    logger.error(`CRM scheduler tick error: ${err.message}`);
  } finally {
    running = false;
  }
};

const start = () => {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  timer.unref();
  logger.info('CRM scheduler: started (Mongo-backed, no Redis).');
};

const stop = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { define, schedule, cancelByKey, every, start, stop, tick };
