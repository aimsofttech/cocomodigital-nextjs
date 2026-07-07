/**
 * Cascade deletes for the Group Services hierarchy:
 *
 *   Group Service Category
 *     └─ Group Service Item        (groupServiceCategoryId)
 *          ├─ Service Media        (groupServiceItemId)
 *          ├─ Recent Work          (groupServiceItemId)
 *          ├─ Portfolio Category   (groupServiceItemId)
 *          │    └─ Portfolio Item  (portfolioCategoryId)
 *          └─ FAQ                  (groupServiceItemId)
 *
 * Deleting a parent removes every record beneath it (and their S3 media),
 * so no orphaned section records are left behind. All FK fields are Mixed
 * (string or ObjectId), so every match covers both representations.
 * Best-effort by design: S3 failures never block the DB deletes.
 */
const mongoose = require('mongoose');
const GroupServiceItem = require('../models/GroupServiceItem');
const GroupSingleServiceImage = require('../models/GroupSingleServiceImage');
const GroupSingleServiceRecentWork = require('../models/GroupSingleServiceRecentWork');
const GroupSingleServicePortfolioCategory = require('../models/GroupSingleServicePortfolioCategory');
const GroupSingleServicePortfolioItem = require('../models/GroupSingleServicePortfolioItem');
const GroupServiceItemFaq = require('../models/GroupServiceItemFaq');
const { deleteManyFromS3 } = require('./s3Upload');

// Both string and ObjectId variants of each id, for matching Mixed FK fields.
const fkKeys = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .filter((v) => v !== null && v !== undefined && v !== '')
    .flatMap((id) => {
      const s = String(id);
      const out = [s];
      if (mongoose.Types.ObjectId.isValid(s)) out.push(new mongoose.Types.ObjectId(s));
      return out;
    });

// Fields that may hold S3 keys/URLs, per section model. deleteManyFromS3
// ignores values that are not in our bucket (e.g. external YouTube URLs).
const SECTION_MEDIA = {
  image: ['image', 'uploadVideoUrl', 'videoUrl'],
  recentWork: ['image', 'video', 'videoThumbnail', 'videoUrl'],
  portfolioItem: ['image', 'videoThumbnail', 'videoUrl'],
};

// Delete every doc of `Model` whose `field` points at one of `ids`;
// removes the docs' S3 media first. Returns the number of docs removed.
const deleteWhere = async (Model, field, ids, mediaFields = []) => {
  const keys = fkKeys(ids);
  if (!keys.length) return 0;
  const docs = await Model.find({ [field]: { $in: keys } }).lean();
  if (!docs.length) return 0;
  const media = docs.flatMap((d) => mediaFields.map((f) => d[f]).filter(Boolean));
  if (media.length) await deleteManyFromS3(media);
  await Model.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
  return docs.length;
};

/** Delete all Portfolio Items under the given Portfolio Categories. */
const cascadePortfolioCategories = async (portfolioCategoryIds) =>
  deleteWhere(
    GroupSingleServicePortfolioItem,
    'portfolioCategoryId',
    portfolioCategoryIds,
    SECTION_MEDIA.portfolioItem
  );

/** Delete every section record belonging to the given Group Service Items
 *  (media, recent work, portfolio categories + their items, FAQs). */
const cascadeItemSections = async (itemIds) => {
  const keys = fkKeys(itemIds);
  if (!keys.length) return;

  // Portfolio: items under this item's categories, then items linked
  // directly to the item, then the categories themselves.
  const pcats = await GroupSingleServicePortfolioCategory.find({
    groupServiceItemId: { $in: keys },
  }).select('_id').lean();
  await cascadePortfolioCategories(pcats.map((c) => c._id));
  await deleteWhere(GroupSingleServicePortfolioItem, 'groupServiceItemId', itemIds, SECTION_MEDIA.portfolioItem);
  await GroupSingleServicePortfolioCategory.deleteMany({ groupServiceItemId: { $in: keys } });

  await deleteWhere(GroupSingleServiceImage, 'groupServiceItemId', itemIds, SECTION_MEDIA.image);
  await deleteWhere(GroupSingleServiceRecentWork, 'groupServiceItemId', itemIds, SECTION_MEDIA.recentWork);
  // Also clears category↔item join rows referencing these items (the FAQ
  // model shares the group_service_category_item collection with them).
  await deleteWhere(GroupServiceItemFaq, 'groupServiceItemId', itemIds);
};

/** Delete every Group Service Item under a Group Service Category,
 *  including each item's sections and S3 media. */
const cascadeCategoryItems = async (categoryId) => {
  const keys = fkKeys(categoryId);
  if (!keys.length) return;

  const items = await GroupServiceItem.find({
    groupServiceCategoryId: { $in: keys },
  }).lean();

  if (items.length) {
    await cascadeItemSections(items.map((i) => i._id));
    const thumbs = items.map((i) => i.thumbnail).filter(Boolean);
    if (thumbs.length) await deleteManyFromS3(thumbs);
    await GroupServiceItem.deleteMany({ _id: { $in: items.map((i) => i._id) } });
  }

  // Join rows linking (other) items to this category. FAQ docs live in the
  // same collection but carry a `question` field — leave those untouched.
  await mongoose.connection
    .collection('group_service_category_item')
    .deleteMany({ groupServiceCategoryId: { $in: keys }, question: { $exists: false } });
};

module.exports = { cascadeCategoryItems, cascadeItemSections, cascadePortfolioCategories };
