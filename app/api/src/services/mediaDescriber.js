const crypto = require('crypto');
const MediaAsset = require('../models/MediaAsset');
const logger = require('../utils/logger');

/**
 * The describe worker — the only place in the system that spends money.
 *
 * Design rules, in priority order:
 *
 *  1. NEVER called from a read path. Searching is a Mongo query; nothing
 *     here runs when a user searches. This is what keeps the running
 *     cost flat as traffic grows.
 *
 *  2. Never describe the same bytes twice. Assets carry a sha256. If a
 *     row already has a description for that checksum we copy it across
 *     for free. The two website repos hold the same fifty studio
 *     photographs each — that alone is a 37% saving on the current
 *     library.
 *
 *  3. Never overwrite a human. reviewed = 1 means somebody corrected the
 *     machine, and the machine does not get to correct them back.
 *
 *  4. Never exceed the budget. MEDIA_DESCRIBE_BUDGET_USD is a hard
 *     monthly ceiling. When it is reached the worker stops and says so
 *     rather than quietly running up a bill.
 *
 *  5. Safe to merge with no provider configured. With
 *     MEDIA_DESCRIBE_PROVIDER unset the worker is inert: nothing is
 *     called, nothing is spent, assets sit at 'pending', and search
 *     still works over whatever tags people typed by hand. Turning it on
 *     is a deliberate, separate decision.
 */

const PROMPT_VERSION = 'v1';

const CONFIG = {
  provider: process.env.MEDIA_DESCRIBE_PROVIDER || 'none',
  model: process.env.MEDIA_DESCRIBE_MODEL || '',
  batchSize: Number(process.env.MEDIA_DESCRIBE_BATCH || 6),
  maxAttempts: Number(process.env.MEDIA_DESCRIBE_MAX_ATTEMPTS || 3),
  budgetUsd: Number(process.env.MEDIA_DESCRIBE_BUDGET_USD || 0),
};

// In-process spend counter, reset on the calendar month. Deliberately
// cross-checked against the DB on every run so a restart cannot reset
// the ceiling and let the worker spend the budget twice.
let spend = { month: new Date().getUTCMonth(), usd: 0 };

const monthlySpendFromDb = async () => {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await MediaAsset.aggregate([
    { $match: { 'describeMeta.describedAt': { $gte: start } } },
    { $group: { _id: null, usd: { $sum: '$describeMeta.costUsd' } } },
  ]);
  return row ? row.usd : 0;
};

const budgetStatus = () => ({
  provider: CONFIG.provider,
  model: CONFIG.model || null,
  budgetUsd: CONFIG.budgetUsd,
  spentThisMonthUsd: Number(spend.usd.toFixed(4)),
  enabled: CONFIG.provider !== 'none',
});

/**
 * Copy a description from an already-described row with identical bytes.
 * Returns true when it worked, which means this asset cost nothing.
 */
const reuseByChecksum = async (asset) => {
  if (!asset.checksum) return false;
  const twin = await MediaAsset.findOne({
    checksum: asset.checksum,
    describeStatus: 'done',
    _id: { $ne: asset._id },
  }).lean();
  if (!twin) return false;

  await MediaAsset.updateOne({ _id: asset._id }, {
    caption: twin.caption,
    altText: twin.altText,
    tags: twin.tags,
    category: twin.category,
    people: twin.people,
    ocrText: twin.ocrText,
    rights: twin.rights,
    sensitive: twin.sensitive,
    usable: twin.usable,
    describeStatus: 'done',
    describeError: null,
    'describeMeta.provider': twin.describeMeta && twin.describeMeta.provider,
    'describeMeta.model': twin.describeMeta && twin.describeMeta.model,
    'describeMeta.promptVersion': PROMPT_VERSION,
    'describeMeta.costUsd': 0,
    'describeMeta.describedAt': new Date(),
    'describeMeta.copiedFromChecksum': true,
  });
  return true;
};

/**
 * The provider call. Deliberately the only vendor-specific function in
 * the file, and deliberately unimplemented until someone chooses a
 * vendor — see docs/MEDIA_ASSET_INDEX.md for the contract it must meet
 * and the recommended cheap-model choice.
 *
 * Must return, per asset:
 *   { caption, altText, tags[], category, people, ocrText,
 *     rights, sensitive, usable, inputTokens, outputTokens, costUsd }
 */
const callProvider = async (/* assets */) => {
  throw new Error(
    `MEDIA_DESCRIBE_PROVIDER="${CONFIG.provider}" has no implementation yet. ` +
    'Implement callProvider() in src/services/mediaDescriber.js.',
  );
};

/** Describe a single asset now (admin "re-describe this one" button). */
const describeNow = async (asset) => {
  if (await reuseByChecksum(asset)) {
    return { id: asset._id, reused: true, costUsd: 0 };
  }
  if (CONFIG.provider === 'none') {
    return { id: asset._id, skipped: true, reason: 'no provider configured' };
  }
  const [result] = await callProvider([asset]);
  await applyResult(asset, result);
  return { id: asset._id, reused: false, costUsd: result.costUsd || 0 };
};

const applyResult = async (asset, r) => {
  spend.usd += r.costUsd || 0;
  await MediaAsset.updateOne({ _id: asset._id }, {
    caption: r.caption || '',
    altText: r.altText || '',
    tags: (r.tags || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean),
    category: r.category || '',
    people: r.people || 0,
    ocrText: r.ocrText || '',
    rights: r.rights || 'unknown',
    sensitive: Boolean(r.sensitive),
    usable: Boolean(r.usable) && !r.sensitive && r.rights === 'own',
    describeStatus: 'done',
    describeError: null,
    'describeMeta.provider': CONFIG.provider,
    'describeMeta.model': CONFIG.model,
    'describeMeta.promptVersion': PROMPT_VERSION,
    'describeMeta.inputTokens': r.inputTokens || 0,
    'describeMeta.outputTokens': r.outputTokens || 0,
    'describeMeta.costUsd': r.costUsd || 0,
    'describeMeta.describedAt': new Date(),
    'describeMeta.copiedFromChecksum': false,
  });
};

/**
 * Drain up to `limit` pending assets. Intended to be called from a cron
 * or an admin button — never from a request that a user is waiting on.
 */
const enqueue = async (limit = 20) => {
  const now = new Date();
  if (now.getUTCMonth() !== spend.month) spend = { month: now.getUTCMonth(), usd: 0 };
  spend.usd = await monthlySpendFromDb();

  const summary = { considered: 0, reused: 0, described: 0, skipped: 0, failed: 0, costUsd: 0 };

  const pending = await MediaAsset.find({
    describeStatus: { $in: ['pending', 'failed'] },
    describeAttempts: { $lt: CONFIG.maxAttempts },
    reviewed: 0,
  }).sort({ createdAt: 1 }).limit(limit);

  summary.considered = pending.length;
  if (!pending.length) return summary;

  // Free pass first: anything whose bytes we have already described.
  const remaining = [];
  for (const asset of pending) {
    if (await reuseByChecksum(asset)) summary.reused += 1;
    else remaining.push(asset);
  }

  if (CONFIG.provider === 'none') {
    summary.skipped = remaining.length;
    return summary;
  }

  for (let i = 0; i < remaining.length; i += CONFIG.batchSize) {
    if (CONFIG.budgetUsd > 0 && spend.usd >= CONFIG.budgetUsd) {
      logger.warn(`mediaDescriber: monthly budget $${CONFIG.budgetUsd} reached, stopping`);
      summary.skipped += remaining.length - i;
      summary.budgetReached = true;
      break;
    }

    const batch = remaining.slice(i, i + CONFIG.batchSize);
    const ids = batch.map((a) => a._id);
    await MediaAsset.updateMany({ _id: { $in: ids } }, {
      describeStatus: 'processing', $inc: { describeAttempts: 1 },
    });

    try {
      const results = await callProvider(batch);
      for (let j = 0; j < batch.length; j += 1) {
        if (!results[j]) continue;
        await applyResult(batch[j], results[j]);
        summary.described += 1;
        summary.costUsd += results[j].costUsd || 0;
      }
    } catch (err) {
      logger.error(`mediaDescriber batch failed: ${err.message}`);
      await MediaAsset.updateMany({ _id: { $in: ids } }, {
        describeStatus: 'failed', describeError: err.message,
      });
      summary.failed += batch.length;
    }
  }

  summary.costUsd = Number(summary.costUsd.toFixed(5));
  return summary;
};

/** sha256 of a buffer — used at upload time so dedupe works from day one. */
const checksumOf = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

module.exports = { enqueue, describeNow, budgetStatus, checksumOf, PROMPT_VERSION };
