const HomePageSection = require('../../models/HomePageSection');
const HomePageSectionItem = require('../../models/HomePageSectionItem');
const { buildS3Url } = require('../../utils/s3Upload');
const buildUrl = (key) => (key ? buildS3Url(key) : '');

const index = async (req, res) => {
  const sections = await HomePageSection.find({ status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const section of sections) {
    const items = await HomePageSectionItem.find({ home_page_section_id: section._id, status: 1 }).sort({ display_order: 1 });
    result.push({
      ...section.toObject(),
      items: items.map((i) => ({ ...i.toObject(), item_image: buildUrl(i.item_image) })),
    });
  }
  res.json({ status: 'success', data: result });
};

module.exports = { index };
