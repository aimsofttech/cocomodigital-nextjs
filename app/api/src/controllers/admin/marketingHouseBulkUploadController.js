'use strict';

/**
 * Marketing House — Bulk Upload.
 *
 * Lets an admin create many complete Marketing House records at once from a
 * single CSV/XLSX file. Each row becomes one Marketing House *item* plus ALL of
 * its related sections, supplied as JSON cells:
 *   • single-level sections (one JSON array of objects):
 *       highlights, poster_media, idea_strategy, pre_launch, performance,
 *       faqs, projects
 *   • two-level sections (JSON array of categories, each with nested `items`,
 *     and content items may carry nested `carousels`):
 *       other_activities, content_created, community_program
 *
 * Three endpoints:
 *   GET  /template   → download a sample CSV (headers + one example row).
 *   POST /validate   → parse + validate the file, report problems, write NOTHING.
 *   POST /import     → parse + validate + create. Each row is created atomically:
 *                      if any part of a row fails, every document already created
 *                      for that row is rolled back, so a row is all-or-nothing.
 *
 * The category / author / book-call selected in the form are sent as body fields
 * and applied to every row (a row may override the category via a `category_name`
 * column). This mirrors the legacy "Upload Marketing" screen while extending it
 * to the full Marketing House data model.
 */

const mongoose = require('mongoose');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseStatics = require('../../models/MarketingHouseStatics');
const MarketingHouseImage = require('../../models/MarketingHouseImage');
const MarketingHouseIdeaStrategyPlanning = require('../../models/MarketingHouseIdeaStrategyPlanning');
const MarketingHousePreLaunchActivity = require('../../models/MarketingHousePreLaunchActivity');
const MarketingHousePerformance = require('../../models/MarketingHousePerformance');
const Faq = require('../../models/Faq');
const MarketingHouseProject = require('../../models/MarketingHouseProject');
const MarketingHouseOtherActivityCategory = require('../../models/MarketingHouseOtherActivityCategory');
const MarketingHouseOtherActivityItem = require('../../models/MarketingHouseOtherActivityItem');
const MarketingHouseContentCreatedCategory = require('../../models/MarketingHouseContentCreatedCategory');
const MarketingHouseContentCreatedItem = require('../../models/MarketingHouseContentCreatedItem');
const MarketingHouseContentCreatedItemCarousel = require('../../models/MarketingHouseContentCreatedItemCarousel');
const MarketingHouseCommunityProgramCategory = require('../../models/MarketingHouseCommunityProgramCategory');
const MarketingHouseCommunityProgramCategoryItem = require('../../models/MarketingHouseCommunityProgramCategoryItem');
const { generateSlug } = require('../../utils/helpers');
const { getYoutubeVideoId } = require('../../utils/s3Upload');
const { fileToRecords, coerce } = require('../../utils/csv');

// ── Section configuration ───────────────────────────────────────────────────
// Each related section is one JSON-array column on the row. `key` is the CSV
// column name, `model` the collection to insert into, `fields` the columns a
// user may fill per section entry, and `required` the fields each entry must
// have for the row to be valid. Every child is linked back to its parent item
// through `marketing_house_item_id`.
const SECTIONS = [
  {
    key: 'highlights',
    label: 'Highlights',
    model: MarketingHouseStatics,
    fields: ['statics_title', 'statics_value', 'statics_description'],
    required: [],
  },
  {
    key: 'poster_media',
    label: 'Poster Media',
    model: MarketingHouseImage,
    fields: ['image', 'image_title'],
    required: ['image'],
  },
  {
    key: 'idea_strategy',
    label: 'Idea Strategy Planning',
    model: MarketingHouseIdeaStrategyPlanning,
    fields: ['title', 'description', 'image'],
    required: ['title'],
  },
  {
    key: 'pre_launch',
    label: 'PreLaunch Activity',
    model: MarketingHousePreLaunchActivity,
    fields: ['title', 'description', 'image'],
    required: ['title'],
  },
  {
    key: 'performance',
    label: 'Performance',
    model: MarketingHousePerformance,
    fields: ['performance_title', 'performance_description', 'performance_video_url', 'performance_image'],
    required: [],
  },
  {
    key: 'faqs',
    label: 'FAQ',
    model: Faq,
    fields: ['question', 'answer'],
    required: ['question', 'answer'],
  },
  {
    key: 'projects',
    label: 'Projects',
    model: MarketingHouseProject,
    fields: ['project_title', 'project_description', 'project_video_url', 'project_image'],
    required: ['project_title'],
  },
];

// ── Two-level (grouped) section configuration ───────────────────────────────
// These sections are a list of *categories*, each holding a nested list of
// *items*. Each grouped column is one JSON array of category objects of the
// shape: { <categoryFields…>, items: [ { <itemFields…> [, <carousel.key>: [...] ] } ] }.
// The category is created first (linked to the item via marketing_house_item_id),
// then each of its items is created (linked to BOTH the item and the new
// category id). `itemCategoryFkFields` lists EVERY field name the category id
// must be written to — admin list pages scope by the `marketing_house_*` variant
// while the schema declares the short one, so we write both to be safe.
const GROUPED_SECTIONS = [
  {
    key: 'other_activities',
    label: 'Add-on (Other) Activities',
    categoryModel: MarketingHouseOtherActivityCategory,
    categoryFields: ['category_name'],
    categoryRequired: ['category_name'],
    itemModel: MarketingHouseOtherActivityItem,
    itemFields: ['title', 'image', 'image1', 'image2', 'image3', 'image4', 'video_url', 'youtube_id', 'description'],
    itemRequired: ['title'],
    itemCategoryFkFields: ['other_activity_category_id', 'marketing_house_other_activity_category_id'],
    itemYoutube: { source: 'video_url', target: 'youtube_id' },
  },
  {
    key: 'content_created',
    label: 'Content Created',
    categoryModel: MarketingHouseContentCreatedCategory,
    categoryFields: ['category_name'],
    categoryRequired: ['category_name'],
    itemModel: MarketingHouseContentCreatedItem,
    itemFields: ['item_title', 'item_image', 'item_video_url', 'item_youtube_id', 'url', 'upload_video_url'],
    itemRequired: [],
    itemCategoryFkFields: ['content_created_category_id', 'marketing_house_content_created_category_id'],
    itemYoutube: { source: 'url', target: 'item_youtube_id' },
    // Each content item may carry its own nested carousel images.
    carousel: {
      key: 'carousels',
      model: MarketingHouseContentCreatedItemCarousel,
      fields: ['carousel_title', 'carousel_image'],
      required: [],
      itemFkField: 'content_created_item_id',
    },
  },
  {
    key: 'community_program',
    label: 'Continuity (Community) Program',
    categoryModel: MarketingHouseCommunityProgramCategory,
    categoryFields: ['category_name', 'category_image'],
    categoryRequired: ['category_name'],
    itemModel: MarketingHouseCommunityProgramCategoryItem,
    itemFields: [
      'item_title', 'item_image', 'item_video_url', 'item_youtube_id',
      'community_program_item_description', 'community_program_item_video_url',
      'community_program_item_video_file', 'community_program_item_video_thumbnail',
    ],
    itemRequired: [],
    itemCategoryFkFields: ['community_program_category_id'],
    itemYoutube: { source: 'community_program_item_video_url', target: 'item_youtube_id' },
  },
];

// Core item columns (besides the section columns above) understood on a row.
const ITEM_COLUMNS = [
  'marketing_house_title',
  'marketing_house_description',
  'marketing_house_description2',
  'marketing_house_video_url',
  'marketing_house_thumbnail',
  'category_name',
  'display_order',
  'status',
];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

// Parse a JSON-array cell into an array of plain objects. Empty → []. Accepts a
// value already coerced to an array, or a JSON string. Throws on malformed JSON
// or a non-array/object shape so the caller can report it as a row error.
const parseArrayCell = (raw, columnLabel) => {
  if (raw === undefined || raw === null || raw === '') return [];
  let val = raw;
  if (typeof val === 'string') {
    const t = val.trim();
    if (t === '') return [];
    try {
      val = JSON.parse(t);
    } catch (e) {
      throw new Error(`"${columnLabel}" is not valid JSON: ${e.message}`);
    }
  }
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return [val]; // a single object is treated as a one-element list
  throw new Error(`"${columnLabel}" must be a JSON array of objects`);
};

// Ensure a slug unique within the items collection (suffixes -2, -3, … on clash).
const ensureUniqueItemSlug = async (base) => {
  if (!base) return base;
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await MarketingHouseItem.findOne({ marketing_house_slug: slug }).select('_id').lean();
    if (!exists) return slug;
    counter += 1;
    slug = `${base}-${counter}`;
  }
};

// Resolve the category for a row: an explicit per-row `category_name` wins,
// otherwise the form-selected category id applies to every row. Returns the
// category _id (string) or null when none could be resolved.
const resolveCategoryId = async (row, defaultCategoryId, categoryCache) => {
  const name = row.category_name;
  if (!isBlank(name)) {
    const key = String(name).trim().toLowerCase();
    if (categoryCache.has(key)) return categoryCache.get(key);
    const cat = await MarketingHouseCategory.findOne({
      name: { $regex: `^${escapeRegex(String(name).trim())}$`, $options: 'i' },
    }).select('_id').lean();
    const id = cat ? String(cat._id) : null;
    categoryCache.set(key, id);
    return id;
  }
  return defaultCategoryId || null;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Validate a single parsed row. Returns { valid, errors:[..], sections:{key:[entries]} }.
// `sections` holds the parsed/normalised section entries so a subsequent import
// pass doesn't have to re-parse.
const validateRow = async (row, ctx) => {
  const errors = [];

  const title = row.marketing_house_title;
  if (isBlank(title)) errors.push('marketing_house_title is required');

  // Category must be resolvable (from the form or a category_name column).
  let categoryId = null;
  try {
    categoryId = await resolveCategoryId(row, ctx.defaultCategoryId, ctx.categoryCache);
  } catch (e) {
    errors.push(`category lookup failed: ${e.message}`);
  }
  if (!categoryId) {
    errors.push(
      isBlank(row.category_name)
        ? 'a category is required (select one in the form or add a category_name column)'
        : `category_name "${row.category_name}" does not match any existing category`
    );
  }

  // Parse + validate each section column.
  const sections = {};
  for (const sec of SECTIONS) {
    let entries;
    try {
      entries = parseArrayCell(row[sec.key], sec.key);
    } catch (e) {
      errors.push(e.message);
      continue;
    }
    entries.forEach((entry, idx) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(`${sec.key}[${idx}] must be an object`);
        return;
      }
      for (const reqField of sec.required) {
        if (isBlank(entry[reqField])) {
          errors.push(`${sec.key}[${idx}].${reqField} is required`);
        }
      }
    });
    sections[sec.key] = entries;
  }

  // Parse + validate each two-level (grouped) section column.
  const groups = {};
  for (const grp of GROUPED_SECTIONS) {
    let cats;
    try {
      cats = parseArrayCell(row[grp.key], grp.key);
    } catch (e) {
      errors.push(e.message);
      continue;
    }
    cats.forEach((cat, ci) => {
      if (cat === null || typeof cat !== 'object' || Array.isArray(cat)) {
        errors.push(`${grp.key}[${ci}] must be a category object`);
        return;
      }
      for (const reqField of grp.categoryRequired) {
        if (isBlank(cat[reqField])) errors.push(`${grp.key}[${ci}].${reqField} is required`);
      }
      // Items under the category (optional, but if present must be an array).
      const items = cat.items;
      if (items !== undefined && items !== null && items !== '') {
        if (!Array.isArray(items)) {
          errors.push(`${grp.key}[${ci}].items must be a JSON array`);
        } else {
          items.forEach((it, ii) => {
            if (it === null || typeof it !== 'object' || Array.isArray(it)) {
              errors.push(`${grp.key}[${ci}].items[${ii}] must be an object`);
              return;
            }
            for (const reqField of grp.itemRequired) {
              if (isBlank(it[reqField])) errors.push(`${grp.key}[${ci}].items[${ii}].${reqField} is required`);
            }
            // Nested carousels (content items only).
            if (grp.carousel && it[grp.carousel.key] !== undefined && it[grp.carousel.key] !== null && it[grp.carousel.key] !== '') {
              if (!Array.isArray(it[grp.carousel.key])) {
                errors.push(`${grp.key}[${ci}].items[${ii}].${grp.carousel.key} must be a JSON array`);
              }
            }
          });
        }
      }
    });
    groups[grp.key] = cats;
  }

  return { valid: errors.length === 0, errors, categoryId, sections, groups };
};

// Turn a raw record (string cells) into a row with section JSON cells coerced.
const coerceRow = (rec) => {
  const out = {};
  for (const [k, v] of Object.entries(rec)) out[k] = coerce(v);
  return out;
};

// Read + parse the uploaded file into rows. Throws a user-facing message on
// parse failure / empty file.
const readRows = (file) => {
  let records;
  try {
    records = fileToRecords(file);
  } catch (err) {
    const e = new Error(`Could not parse file: ${err.message}`);
    e.statusCode = 400;
    throw e;
  }
  if (!records.length) {
    const e = new Error('No data rows found in the file');
    e.statusCode = 400;
    throw e;
  }
  return records.map(coerceRow);
};

// Build the body fields shared by validate + import from the request.
const buildContext = (req) => ({
  defaultCategoryId: !isBlank(req.body.marketing_house_category_id)
    ? String(req.body.marketing_house_category_id).trim()
    : null,
  authorTemplateId: !isBlank(req.body.author_template_id)
    ? String(req.body.author_template_id).trim()
    : null,
  bookCallTemplateId: !isBlank(req.body.book_call_template_id)
    ? String(req.body.book_call_template_id).trim()
    : null,
  // Optional fallback thumbnail (uploaded via the form) applied to any row that
  // doesn't supply its own `marketing_house_thumbnail`.
  defaultThumbnail: !isBlank(req.body.default_thumbnail)
    ? String(req.body.default_thumbnail).trim()
    : null,
  userId: req.user && req.user._id,
  categoryCache: new Map(),
});

// ── Controller actions ──────────────────────────────────────────────────────

// GET /template — a sample CSV with the full column set and one example row.
const downloadTemplate = async (req, res) => {
  const columns = [
    ...ITEM_COLUMNS,
    ...SECTIONS.map((s) => s.key),
    ...GROUPED_SECTIONS.map((g) => g.key),
  ];

  const example = {
    marketing_house_title: 'Half CA Web Series',
    marketing_house_description: 'A flagship YouTube campaign for Half CA.',
    marketing_house_description2: 'Secondary description (optional).',
    marketing_house_video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    marketing_house_thumbnail: 'https://example.com/thumb.jpg',
    category_name: '',
    display_order: '1',
    status: '1',
    highlights: JSON.stringify([
      { statics_title: 'Views', statics_value: '2M+', statics_description: 'Total views' },
    ]),
    poster_media: JSON.stringify([
      { image: 'https://example.com/poster1.jpg', image_title: 'Poster 1' },
    ]),
    idea_strategy: JSON.stringify([
      { title: 'Strategy', description: 'The plan', image: 'https://example.com/s1.jpg' },
    ]),
    pre_launch: JSON.stringify([
      { title: 'Teaser', description: 'Pre-launch teaser', image: '' },
    ]),
    performance: JSON.stringify([
      {
        performance_title: 'Reach',
        performance_description: 'Campaign reach',
        performance_video_url: '',
        performance_image: '',
      },
    ]),
    faqs: JSON.stringify([
      { question: 'What is this?', answer: 'A web series campaign.' },
    ]),
    projects: JSON.stringify([
      { project_title: 'Launch Film', project_description: 'The launch project', project_video_url: '', project_image: '' },
    ]),
    other_activities: JSON.stringify([
      {
        category_name: 'Influencer Collabs',
        items: [
          { title: 'Reel with X', description: 'Collab reel', image: '', video_url: '', youtube_id: '' },
        ],
      },
    ]),
    content_created: JSON.stringify([
      {
        category_name: 'Trailers',
        items: [
          {
            item_title: 'Official Trailer',
            item_image: '',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            carousels: [
              { carousel_title: 'Frame 1', carousel_image: 'https://example.com/c1.jpg' },
            ],
          },
        ],
      },
    ]),
    community_program: JSON.stringify([
      {
        category_name: 'Fan Club',
        category_image: '',
        items: [
          { item_title: 'Episode 1', item_image: '', community_program_item_description: 'First episode' },
        ],
      },
    ]),
  };

  // Quote every cell so the embedded JSON (with commas/quotes) round-trips.
  const cell = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [
    columns.map(cell).join(','),
    columns.map((c) => cell(example[c])).join(','),
  ];
  const csv = '﻿' + lines.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="marketing-house-bulk-upload-template.csv"');
  res.send(csv);
};

// POST /validate — dry run. Reports per-row validity with no DB writes.
const validate = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

  let rows;
  try {
    rows = readRows(req.file);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ status: 'error', message: err.message });
  }

  const ctx = buildContext(req);
  const rowReports = [];
  let validCount = 0;

  for (let i = 0; i < rows.length; i++) {
    // eslint-disable-next-line no-await-in-loop
    const r = await validateRow(rows[i], ctx);
    if (r.valid) validCount += 1;
    rowReports.push({
      row: i + 2, // +1 (1-based) +1 (header) → spreadsheet row number
      title: rows[i].marketing_house_title || '',
      valid: r.valid,
      errors: r.errors,
    });
  }

  const invalid = rowReports.filter((r) => !r.valid);
  return res.json({
    status: 'success',
    message: `${validCount} of ${rows.length} row(s) are valid${invalid.length ? `, ${invalid.length} have errors` : ''}`,
    data: {
      total: rows.length,
      valid: validCount,
      invalid: invalid.length,
      rows: rowReports,
    },
  });
};

// Create one complete record (item + sections) for a validated row, rolling
// back every document created for the row if any insert fails.
const importRow = async (row, validated, ctx) => {
  const created = []; // { model, id } — for rollback
  try {
    const title = String(row.marketing_house_title).trim();
    const videoUrl = !isBlank(row.marketing_house_video_url) ? String(row.marketing_house_video_url).trim() : '';
    const ytId = videoUrl ? getYoutubeVideoId(videoUrl) : null;
    const slug = await ensureUniqueItemSlug(generateSlug(title));
    const thumbnail = !isBlank(row.marketing_house_thumbnail)
      ? String(row.marketing_house_thumbnail).trim()
      : (ctx.defaultThumbnail || '');

    const itemBody = {
      marketing_house_category_id: validated.categoryId,
      marketing_house_title: title,
      title, // bare-name mirror (used by listing/search)
      marketing_house_slug: slug,
      slug,
      marketing_house_description: !isBlank(row.marketing_house_description) ? row.marketing_house_description : undefined,
      description: !isBlank(row.marketing_house_description) ? row.marketing_house_description : undefined,
      marketing_house_description2: !isBlank(row.marketing_house_description2) ? row.marketing_house_description2 : undefined,
      marketing_house_video_url: videoUrl || undefined,
      marketing_video: videoUrl || undefined,
      marketing_house_youtube_id: ytId || undefined,
      marketing_video_type: ytId || undefined,
      marketing_house_thumbnail: thumbnail || undefined,
      poster_image: thumbnail || undefined,
      display_order: !isBlank(row.display_order) ? parseInt(row.display_order, 10) || 0 : 0,
      status: !isBlank(row.status) ? (parseInt(row.status, 10) ? 1 : 0) : 1,
      user_id: ctx.userId,
    };
    if (ctx.authorTemplateId) itemBody.author_template_id = ctx.authorTemplateId;
    if (ctx.bookCallTemplateId) itemBody.book_call_template_id = ctx.bookCallTemplateId;

    const item = await MarketingHouseItem.create(itemBody);
    created.push({ model: MarketingHouseItem, id: item._id });
    const itemId = String(item._id);

    // Insert each section's entries, linked to the new item.
    for (const sec of SECTIONS) {
      const entries = validated.sections[sec.key] || [];
      for (const entry of entries) {
        const body = { marketing_house_item_id: itemId, user_id: ctx.userId };
        for (const f of sec.fields) {
          if (!isBlank(entry[f])) body[f] = entry[f];
        }
        if (!isBlank(entry.display_order)) body.display_order = parseInt(entry.display_order, 10) || 0;
        body.status = !isBlank(entry.status) ? (parseInt(entry.status, 10) ? 1 : 0) : 1;
        // eslint-disable-next-line no-await-in-loop
        const doc = await sec.model.create(body);
        created.push({ model: sec.model, id: doc._id });
      }
    }

    // Insert each two-level (grouped) section: category → items → carousels.
    for (const grp of GROUPED_SECTIONS) {
      const cats = (validated.groups && validated.groups[grp.key]) || [];
      for (const cat of cats) {
        const catBody = { marketing_house_item_id: itemId, user_id: ctx.userId };
        for (const f of grp.categoryFields) {
          if (!isBlank(cat[f])) catBody[f] = cat[f];
        }
        if (!isBlank(cat.display_order)) catBody.display_order = parseInt(cat.display_order, 10) || 0;
        catBody.status = !isBlank(cat.status) ? (parseInt(cat.status, 10) ? 1 : 0) : 1;
        // eslint-disable-next-line no-await-in-loop
        const catDoc = await grp.categoryModel.create(catBody);
        created.push({ model: grp.categoryModel, id: catDoc._id });
        const catId = String(catDoc._id);

        const items = Array.isArray(cat.items) ? cat.items : [];
        for (const it of items) {
          const itBody = { marketing_house_item_id: itemId, user_id: ctx.userId };
          // Link the item to its new category under every FK field name in use.
          for (const fk of grp.itemCategoryFkFields) itBody[fk] = catId;
          for (const f of grp.itemFields) {
            if (!isBlank(it[f])) itBody[f] = it[f];
          }
          // Derive a YouTube id from the item's video URL when not supplied.
          if (grp.itemYoutube && isBlank(it[grp.itemYoutube.target]) && !isBlank(it[grp.itemYoutube.source])) {
            const yt = getYoutubeVideoId(String(it[grp.itemYoutube.source]));
            if (yt) itBody[grp.itemYoutube.target] = yt;
          }
          if (!isBlank(it.display_order)) itBody.display_order = parseInt(it.display_order, 10) || 0;
          itBody.status = !isBlank(it.status) ? (parseInt(it.status, 10) ? 1 : 0) : 1;
          // eslint-disable-next-line no-await-in-loop
          const itDoc = await grp.itemModel.create(itBody);
          created.push({ model: grp.itemModel, id: itDoc._id });

          // Nested carousels belong to this content item.
          if (grp.carousel) {
            const carousels = Array.isArray(it[grp.carousel.key]) ? it[grp.carousel.key] : [];
            for (const car of carousels) {
              const carBody = {
                marketing_house_item_id: itemId,
                [grp.carousel.itemFkField]: String(itDoc._id),
                user_id: ctx.userId,
              };
              for (const f of grp.carousel.fields) {
                if (!isBlank(car[f])) carBody[f] = car[f];
              }
              if (!isBlank(car.display_order)) carBody.display_order = parseInt(car.display_order, 10) || 0;
              carBody.status = !isBlank(car.status) ? (parseInt(car.status, 10) ? 1 : 0) : 1;
              // eslint-disable-next-line no-await-in-loop
              const carDoc = await grp.carousel.model.create(carBody);
              created.push({ model: grp.carousel.model, id: carDoc._id });
            }
          }
        }
      }
    }

    return { itemId, sectionsCreated: created.length - 1 };
  } catch (err) {
    // Roll back everything created for this row — a row is all-or-nothing.
    await Promise.all(
      created.map(({ model, id }) => model.deleteOne({ _id: id }).catch(() => {}))
    );
    err.rolledBack = created.length;
    throw err;
  }
};

// POST /import — validate then create. Returns a detailed per-row report.
const importBulk = async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

  let rows;
  try {
    rows = readRows(req.file);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ status: 'error', message: err.message });
  }

  const ctx = buildContext(req);
  const results = [];
  let created = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    // eslint-disable-next-line no-await-in-loop
    const validated = await validateRow(rows[i], ctx);
    if (!validated.valid) {
      failed += 1;
      results.push({ row: rowNum, title: rows[i].marketing_house_title || '', status: 'failed', errors: validated.errors });
      continue;
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await importRow(rows[i], validated, ctx);
      created += 1;
      results.push({
        row: rowNum,
        title: rows[i].marketing_house_title || '',
        status: 'created',
        itemId: r.itemId,
        sectionsCreated: r.sectionsCreated,
      });
    } catch (err) {
      failed += 1;
      results.push({
        row: rowNum,
        title: rows[i].marketing_house_title || '',
        status: 'failed',
        errors: [err.message],
      });
    }
  }

  return res.status(created ? 201 : 400).json({
    status: created ? 'success' : 'error',
    message: `${created} record(s) imported${failed ? `, ${failed} failed` : ''}`,
    data: {
      total: rows.length,
      created,
      failed,
      results,
      errors: results.filter((r) => r.status === 'failed').slice(0, 100),
    },
  });
};

module.exports = { downloadTemplate, validate, importBulk };
