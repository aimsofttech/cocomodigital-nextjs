const TopBanner = require('../../models/TopBanner');
const ServiceItem = require('../../models/ServiceItem');
const Video = require('../../models/Video');
const Client = require('../../models/Client');
const BookCall = require('../../models/BookCall');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const index = async (req, res) => {
  const lang = req.query.lang || 'en-us';
  const serviceCategoryId = req.query.serviceCategoryId || req.query.service_category_id;

  const countryExists = await TopBanner.exists({ status: 1, country: lang });
  const country = countryExists ? lang : 'en-us';

  const [topBannerRaw, serviceItems, videoRaw, clients] = await Promise.all([
    TopBanner.findOne({ status: 1, country }).sort({ displayOrder: 1 }).select('id bookCallTemplateId country heading subHeading buttonText buttonUrl videoThumbnail videoUrl displayOrder status createdAt updatedAt'),
    ServiceItem.find({ status: 1, ...(serviceCategoryId ? { serviceCategoryId } : {}) }).sort({ displayOrder: 1 }).select('id serviceCategoryId image videoUrl title slug buttonText displayOrder status'),
    Video.findOne({ status: 1 }).sort({ displayOrder: 1 }).select('id thumbnail url displayOrder status'),
    Client.find({ status: 1 }).sort({ displayOrder: 1 }).limit(6).select('id image title slug displayOrder status'),
  ]);

  // Resolve the linked Book Call template (if any) for the banner.
  let bookCallTemplate = null;
  if (topBannerRaw && topBannerRaw.bookCallTemplateId) {
    const bc = await BookCall.findById(topBannerRaw.bookCallTemplateId).catch(() => null);
    if (bc) {
      const obj = bc.toObject();
      bookCallTemplate = {
        ...obj,
        image: buildUrl(obj.image),
      };
    }
  }

  const topBanner = topBannerRaw ? {
    ...topBannerRaw.toObject(),
    videoThumbnail: buildUrl(topBannerRaw.videoThumbnail),
    bookCallTemplate,
  } : null;

  const video = videoRaw ? {
    ...videoRaw.toObject(),
    thumbnail: buildUrl(videoRaw.thumbnail),
  } : null;

  const other_service = serviceItems.map((s) => ({ ...s.toObject(), image: buildUrl(s.image) }));
  const clientData = clients.map((c) => ({ ...c.toObject(), image: buildUrl(c.image) }));

  res.json({ status: 'success', data: { topBanner, other_service, video, client: clientData } });
};

// "Growth at a glance" stat tiles — active only, in display order.
const growthStats = async (req, res) => {
  const stats = await require('../../models/GrowthStat')
    .find({ status: 1 })
    .sort({ displayOrder: 1 })
    .select('prefix value suffix label displayOrder status');
  res.json({ status: 'success', data: { growthStats: stats } });
};

const client = async (req, res) => {
  const clients = await Client.find({ status: 1 }).sort({ displayOrder: 1 })
    .select('id authorTemplateId bookCallTemplateId image title slug description displayOrder status');

  const data = clients.map((c) => ({
    ...c.toObject(),
    image: buildUrl(c.image),
  }));

  res.json({ status: 'success', data: { client: data } });
};

const monthlyPerformanceShowcase = async (req, res) => {
  const MonthlyPerformanceShowcaseCategory = require('../../models/MonthlyPerformanceShowcaseCategory');
  const MonthlyPerformanceShowcaseSubcategory = require('../../models/MonthlyPerformanceShowcaseSubcategory');
  const MonthlyPerformanceShowcase = require('../../models/MonthlyPerformanceShowcase');

  const categories = await MonthlyPerformanceShowcaseCategory.find({ status: 1 }).sort({ display_order: 1 });
  const result = [];

  for (const cat of categories) {
    const subcats = await MonthlyPerformanceShowcaseSubcategory.find({ mps_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    const subcatData = [];
    for (const subcat of subcats) {
      const items = await MonthlyPerformanceShowcase.find({ mps_category_id: cat._id, mps_subcategory_id: subcat._id, status: 1 }).sort({ display_order: 1 });
      subcatData.push({
        ...subcat.toObject(),
        mps_items: items.map((i) => ({ ...i.toObject(), mps_img: buildUrl(i.mps_img) })),
      });
    }
    result.push({ ...cat.toObject(), mps_icon: buildUrl(cat.mps_icon), mps_subcategory: subcatData });
  }

  res.json({ status: 'success', data: { monthly_performance: result } });
};

module.exports = { index, client, monthlyPerformanceShowcase, growthStats };
