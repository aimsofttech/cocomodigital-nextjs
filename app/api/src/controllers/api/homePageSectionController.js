const HomePageSection = require('../../models/HomePageSection');
const HomePageSectionItem = require('../../models/HomePageSectionItem');
const { buildS3Url } = require('../../utils/s3Upload');
const buildUrl = (key) => (key ? buildS3Url(key) : '');

const index = async (req, res) => {
  const sections = await HomePageSection.find({ status: 1 }).sort({ displayOrder: 1 });
  const result = [];
  for (const section of sections) {
    // home_page_section_id is Mixed: migrated items hold an ObjectId, items
    // saved from the admin hold a string. Match both or admin edits vanish.
    const idVariants = [section._id, String(section._id)];
    const items = await HomePageSectionItem.find({ home_page_section_id: { $in: idVariants }, status: 1 }).sort({ display_order: 1 });
    result.push({
      ...section.toObject(),
      items: items.map((i) => ({ ...i.toObject(), item_image: buildUrl(i.item_image), image: buildUrl(i.get('image')) })),
    });
  }
  res.json({ status: 'success', data: result });
};

module.exports = { index };
