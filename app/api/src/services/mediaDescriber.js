const crypto = require('crypto');
const MediaAsset = require('../models/MediaAsset');
const logger = require('../utils/logger');
const { describe } = require('./visionProviders');

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

  /* Rule 3 applies here too, and it did not used to.
   *
   * This path copied rights, consent, shows and assetType across from the
   * twin and stamped every one of them 'model' without ever reading the
   * target's setBy — while applyResult() a hundred lines down guards each
   * write with humanSet(). So the cheap path silently undid review that
   * the expensive path was careful to protect.
   *
   * The bad case is specific rather than theoretical: someone marks a
   * frame client-ip and not usable, the same bytes arrive again under a
   * different filename, the twin says own/usable, and the dedupe promotes
   * a client's artwork to publishable without anyone touching it.
   *
   * Identical bytes still means an identical frame, so anything a human
   * has NOT ruled on still copies — that is the saving this rests on. */
  const decidedByHuman = asset.setBy instanceof Map
    ? Object.fromEntries(asset.setBy)
    : (asset.setBy || {});
  const humanOwns = (field) => decidedByHuman[field] === 'human';

  const patch = {
    caption: twin.caption,
    altText: twin.altText,
    tags: twin.tags,
    category: twin.category,
    people: twin.people,
    ocrText: twin.ocrText,
    sensitive: twin.sensitive,
    describeStatus: 'done',
    describeError: null,
    'describeMeta.provider': twin.describeMeta && twin.describeMeta.provider,
    'describeMeta.model': twin.describeMeta && twin.describeMeta.model,
    'describeMeta.promptVersion': PROMPT_VERSION,
    'describeMeta.costUsd': 0,
    'describeMeta.describedAt': new Date(),
    'describeMeta.copiedFromChecksum': true,
  };

  // The four a person is allowed to have ruled on. Each copies only if
  // nobody has, and only then is it stamped as the model's doing.
  if (!humanOwns('rights')) { patch.rights = twin.rights; patch['setBy.rights'] = 'model'; }
  if (!humanOwns('consent')) { patch.consent = twin.consent; patch['setBy.consent'] = 'model'; }
  if (!humanOwns('shows')) { patch.shows = twin.shows; patch['setBy.shows'] = 'model'; }
  if (!humanOwns('assetType')) { patch.assetType = twin.assetType; patch['setBy.assetType'] = 'model'; }

  // usable rides with rights: promoting a row to publishable is the whole
  // risk, so it never moves independently of the rights decision.
  if (!humanOwns('rights')) patch.usable = twin.usable;

  await MediaAsset.updateOne({ _id: asset._id }, patch);
  return true;
};

/**
 * The provider call. Still the only vendor-aware line in this file: the
 * adapters, the prompt and the cost table all live in visionProviders.js
 * so that swapping vendors cannot reach the budget ceiling, the checksum
 * dedupe or the review rules.
 *
 * Returns, per asset, index-aligned with the input:
 *   { caption, altText, tags[], category, shows[], assetType, people,
 *     ocrText, rights, consent, sensitive, usable,
 *     inputTokens, outputTokens, costUsd }
 * or null, which means that asset already has its status and a readable
 * reason written to Mongo — 'failed' for a fault, 'skipped' for a video
 * waiting on ffmpeg — and the rest of the batch carries on without it.
 *
 * provider and model are passed in rather than re-read from env inside
 * visionProviders, so describeMeta can never record a different model from
 * the one that was actually billed.
 */
const callProvider = async (assets) =>
  describe(assets, { provider: CONFIG.provider, model: CONFIG.model });

/** Describe a single asset now (admin "re-describe this one" button). */
const describeNow = async (asset) => {
  /* Confidential material never leaves the building to be captioned.
   *
   * Describing means POSTing the actual bytes to Anthropic, OpenAI or
   * Google. For most of this library that is unremarkable. For an asset
   * belonging to an NDA engagement it is a disclosure to a third party,
   * made by a background job, with no person in the loop and nothing in
   * the response that would reveal it had happened.
   *
   * Checked before the checksum reuse below, deliberately: reuse copies a
   * description that some earlier call already paid a provider to produce,
   * so allowing it here would launder exactly the leak this prevents when
   * an NDA frame is byte-identical to one that was described openly.
   *
   * These rows stay `pending` rather than `failed`. Nothing is wrong with
   * them — they are waiting for a human to caption them, which is the
   * correct handling for confidential work and shows up in the queue as
   * work rather than as an error. */
  if (asset.nda) {
    return {
      id: asset._id,
      skipped: true,
      reason: 'asset belongs to an NDA job — describe it by hand, do not send it to a provider',
    };
  }
  if (await reuseByChecksum(asset)) {
    return { id: asset._id, reused: true, costUsd: 0 };
  }
  if (CONFIG.provider === 'none') {
    return { id: asset._id, skipped: true, reason: 'no provider configured' };
  }

  /* The ceiling applies here too.
   *
   * This function is what POST /admin/api/media/:id/describe calls, and it
   * went straight to the provider without ever reading CONFIG.budgetUsd —
   * so rule 4 in the header above ("a hard monthly ceiling") was true of
   * the queue and false of the button beside every asset in the admin.
   * A person clicking re-describe down a long list is exactly how a
   * ceiling gets discovered to be missing.
   *
   * Re-read from the database rather than trusting the in-process counter,
   * for the same reason enqueue() does: a restart must not reset it. */
  if (CONFIG.budgetUsd > 0) {
    spend.usd = await monthlySpendFromDb();
    if (spend.usd >= CONFIG.budgetUsd) {
      return {
        id: asset._id,
        skipped: true,
        budgetReached: true,
        reason: `monthly budget reached ($${spend.usd.toFixed(2)} of $${CONFIG.budgetUsd})`,
      };
    }
  }

  const [result] = await callProvider([asset]);
  if (!result) {
    // The provider already wrote a status and a reason onto the row. Read
    // them back rather than throwing, so the admin's re-describe button
    // shows "this file is an SVG" instead of a 500 — and so a video parked
    // for want of ffmpeg does not report itself as a failure.
    const fresh = await MediaAsset.findById(asset._id)
      .select('describeStatus describeError').lean();
    const status = (fresh && fresh.describeStatus) || 'failed';
    return {
      id: asset._id,
      failed: status === 'failed',
      skipped: status === 'skipped',
      error: (fresh && fresh.describeError) || 'Describe failed.',
    };
  }
  await applyResult(asset, result);
  return { id: asset._id, reused: false, costUsd: result.costUsd || 0 };
};

const applyResult = async (asset, r) => {
  spend.usd += r.costUsd || 0;

  // A field a person has ruled on is not up for re-litigation. `reviewed`
  // keeps a whole row out of the queue, but the admin's force=1 path walks
  // straight past that, and setBy is the only record of which individual
  // fields were a human's call. Without this check, forcing a re-describe
  // to fix a bad caption also silently reverts a rights decision.
  const decided = asset.setBy instanceof Map
    ? Object.fromEntries(asset.setBy)
    : (asset.setBy || {});
  const humanSet = (field) => decided[field] === 'human';

  // usable is derived from the EFFECTIVE rights, not the model's guess:
  // a human who set rights=own should not have every re-describe hide the
  // asset again because the model still reads it as unknown.
  const rights = humanSet('rights') ? asset.rights : (r.rights || 'unknown');
  const sensitive = Boolean(r.sensitive);

  const patch = {
    caption: r.caption || '',
    altText: r.altText || '',
    tags: (r.tags || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean),
    category: r.category || '',
    people: r.people || 0,
    ocrText: r.ocrText || '',
    sensitive,
    usable: Boolean(r.usable) && !sensitive && rights === 'own',
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
  };

  // The four the taxonomy note assigns to the model. Each is written only
  // if no human has claimed it, and each stamps its own provenance —
  // otherwise a guess and a ruling are indistinguishable in the column.
  if (!humanSet('rights')) { patch.rights = rights; patch['setBy.rights'] = 'model'; }
  if (!humanSet('consent')) { patch.consent = r.consent || 'unknown'; patch['setBy.consent'] = 'model'; }
  if (!humanSet('shows')) { patch.shows = r.shows || []; patch['setBy.shows'] = 'model'; }
  if (!humanSet('assetType')) { patch.assetType = r.assetType || 'unknown'; patch['setBy.assetType'] = 'model'; }

  await MediaAsset.updateOne({ _id: asset._id }, patch);
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

  /* NDA assets are excluded from selection, not just refused later.
   *
   * describeNow() turns them away, but this loop calls reuseByChecksum()
   * directly a few lines down, before describeNow is ever reached — so a
   * confidential frame that happens to be byte-identical to one described
   * openly would quietly inherit that description. Keeping them out of
   * `pending` closes both paths at once, and stops the queue picking up
   * the same rows on every run only to reject them. */
  const pending = await MediaAsset.find({
    describeStatus: { $in: ['pending', 'failed'] },
    describeAttempts: { $lt: CONFIG.maxAttempts },
    reviewed: 0,
    nda: { $ne: true },
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
      const parked = [];
      for (let j = 0; j < batch.length; j += 1) {
        // A null slot is an asset the provider already wrote a status onto
        // — 'failed' for a bad file, 'skipped' for a video waiting on
        // ffmpeg. Both must be counted: a run reporting "considered 6,
        // described 4" and nothing else is a bug hunt waiting to happen.
        if (!results[j]) { parked.push(batch[j]._id); continue; }
        await applyResult(batch[j], results[j]);
        summary.described += 1;
        summary.costUsd += results[j].costUsd || 0;
      }
      if (parked.length) {
        // One query rather than guessing: 'skipped' is a video with no
        // ffmpeg and is not a fault, 'failed' is. Reporting a missing
        // binary as five failures sends someone debugging the describer.
        const rows = await MediaAsset.find({ _id: { $in: parked } })
          .select('describeStatus').lean();
        rows.forEach((r) => {
          if (r.describeStatus === 'skipped') summary.skipped += 1;
          else summary.failed += 1;
        });
      }
    } catch (err) {
      // A misconfiguration is not the assets' fault and must not eat their
      // retry budget: put the batch back and stop. Three clicks of the
      // queue button with an unset API key would otherwise push every
      // pending row past MEDIA_DESCRIBE_MAX_ATTEMPTS, and nothing in the
      // admin resets that.
      if (err.isConfigError) {
        logger.error(`mediaDescriber: not configured — ${err.message}`);
        await MediaAsset.updateMany({ _id: { $in: ids } }, {
          describeStatus: 'pending', $inc: { describeAttempts: -1 },
        });
        summary.skipped += remaining.length - i;
        summary.configError = err.message;
        break;
      }
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
