/**
 * Phase 0 migration for the media library.
 *
 * Two things the code change alone does not do, and both matter:
 *
 * 1. `nda` is new on MediaAsset. Existing rows have no value, so they are
 *    invisible to `nda: true` and to `nda: false` alike. The flag has to
 *    be written from each asset's job before any filter can trust it.
 *
 * 2. `media` is new in the module catalog. bootstrapAdminAccess appends
 *    missing modules to stored roles with every permission FALSE, which
 *    is the safe default and also means nobody — including the studio's
 *    own manager role — can reach the library until someone grants it.
 *    Fresh installs get the intended grants from AdminRole's defaults;
 *    roles already in the database need this.
 *
 * Idempotent. Safe to run twice. Report-only unless --write is passed.
 *
 *   node scripts/migrate-caspian-governance.js            # show me
 *   node scripts/migrate-caspian-governance.js --write    # do it
 */
require('dotenv').config();
const mongoose = require('mongoose');
const MediaAsset = require('../src/models/MediaAsset');
const MediaJob = require('../src/models/MediaJob');
const AdminRole = require('../src/models/AdminRole');

const WRITE = process.argv.includes('--write');
const say = (s) => console.log(s);

/* What each stored role should hold on the media module.
 * super_admin is absent on purpose: fullAccess short-circuits the matrix,
 * so writing rows for it would be decoration that later drifts. */
const MEDIA_GRANTS = {
  admin_manager: { view: true, create: true, update: true, delete: true, export: true, import: false },
  editor: { view: true, create: true, update: false, delete: false, export: false, import: false },
  custom: { view: false, create: false, update: false, delete: false, export: false, import: false },
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  say(`database: ${mongoose.connection.name}${WRITE ? '' : '   (dry run — nothing written)'}\n`);

  // ── 1. NDA backfill ──────────────────────────────────────────────────────
  const ndaJobs = await MediaJob.find({ nda: true }).select('_id name');
  const ndaIds = ndaJobs.map((j) => j._id);

  const needFlag = await MediaAsset.countDocuments({ nda: { $exists: false } });
  const shouldBeTrue = ndaIds.length
    ? await MediaAsset.countDocuments({ job: { $in: ndaIds }, nda: { $ne: true } })
    : 0;

  say('1. NDA flag');
  say(`   NDA jobs:                        ${ndaJobs.length}`);
  ndaJobs.forEach((j) => say(`     - ${j.name}`));
  say(`   assets with no nda value:        ${needFlag}`);
  say(`   assets that must become nda:true ${shouldBeTrue}`);

  if (WRITE) {
    const a = await MediaAsset.updateMany({ nda: { $exists: false } }, { $set: { nda: false } });
    const b = ndaIds.length
      ? await MediaAsset.updateMany({ job: { $in: ndaIds } }, { $set: { nda: true } })
      : { modifiedCount: 0 };
    say(`   → defaulted ${a.modifiedCount}, flagged ${b.modifiedCount}`);
  }

  /* An asset whose job is NDA but which was never linked to a job cannot be
   * found this way. Say so rather than implying the sweep was complete. */
  const orphans = await MediaAsset.countDocuments({ job: null });
  if (orphans) {
    say(`   note: ${orphans} asset(s) have no job at all. Their NDA status is`);
    say('         unknowable from data and stays false. If any confidential');
    say('         material was uploaded without a job, it is in this set.');
  }

  // ── 2. media module grants ───────────────────────────────────────────────
  say('\n2. media module permissions');
  const roles = await AdminRole.find({});
  for (const role of roles) {
    const want = MEDIA_GRANTS[role.key];
    if (!want) {
      say(`   ${role.key.padEnd(15)} skipped (fullAccess covers it)`);
      continue;
    }
    const rows = role.permissions || [];
    const i = rows.findIndex((p) => p.module === 'media');
    const current = i === -1 ? null : rows[i];
    const shape = (p) => (p ? ['view', 'create', 'update', 'delete', 'export', 'import']
      .filter((a) => p[a]).join('+') || 'none' : 'ABSENT');

    say(`   ${role.key.padEnd(15)} ${shape(current).padEnd(24)} → ${shape(want)}`);

    if (WRITE) {
      if (i === -1) rows.push({ module: 'media', ...want });
      else Object.assign(rows[i], want);
      role.permissions = rows;
      role.markModified('permissions');
      await role.save();
    }
  }

  say(WRITE ? '\ndone.' : '\nnothing written. Re-run with --write to apply.');
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
