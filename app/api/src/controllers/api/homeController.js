const TopBanner = require('../../models/TopBanner');
const ServiceItem = require('../../models/ServiceItem');
const Video = require('../../models/Video');
const Client = require('../../models/Client');
const BookCall = require('../../models/BookCall');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const index = async (req, res) => {
  const lang = req.query.lang || 'en-us';
  const serviceCategoryId = req.query.service_category_id;

  const countryExists = await TopBanner.exists({ status: 1, country: lang });
  const country = countryExists ? lang : 'en-us';

  const [topBannerRaw, serviceItems, videoRaw, clients] = await Promise.all([
    TopBanner.findOne({ status: 1, country }).sort({ displayOrder: 1 }).select('id bookCallTemplateId country heading subHeading buttonText buttonUrl videoThumbnail videoUrl displayOrder status createdAt updatedAt'),
    ServiceItem.find({ status: 1, ...(serviceCategoryId ? { service_category_id: serviceCategoryId } : {}) }).sort({ display_order: 1 }).select('id service_category_id service_image service_video_url service_title service_slug button_text display_order status'),
    Video.findOne({ status: 1 }).sort({ display_order: 1 }).select('id video_thumbnail video_url display_order status'),
    Client.find({ status: 1 }).sort({ display_order: 1 }).limit(6).select('id client_img client_title client_slug display_order status'),
  ]);

  // Resolve the linked Book Call template (if any) for the banner.
  let bookCallTemplate = null;
  if (topBannerRaw && topBannerRaw.bookCallTemplateId) {
    const bc = await BookCall.findById(topBannerRaw.bookCallTemplateId).catch(() => null);
    if (bc) {
      const obj = bc.toObject();
      bookCallTemplate = {
        ...obj,
        book_image: buildUrl(obj.book_image),
        book_call_image: buildUrl(obj.book_call_image),
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
    video_thumbnail: buildUrl(videoRaw.video_thumbnail),
    video_url: videoRaw.video_url,
  } : null;

  const other_service = serviceItems.map((s) => ({ ...s.toObject(), service_image: buildUrl(s.service_image), slug: s.service_slug, service_button_text: s.button_text }));
  const clientData = clients.map((c) => ({ ...c.toObject(), client_img: buildUrl(c.client_img), slug: c.client_slug }));

  res.json({ status: 'success', data: { topBanner, other_service, video, client: clientData } });
};

const client = async (req, res) => {
  const clients = await Client.find({ status: 1 }).sort({ display_order: 1 })
    .select('id author_template_id book_call_template_id client_img client_title client_slug client_description display_order status');

  const data = clients.map((c) => ({
    ...c.toObject(),
    image: buildUrl(c.client_img),
    title: c.client_title,
    slug: c.client_slug,
    description: c.client_description,
    author_id: c.author_template_id,
    book_call_id: c.book_call_template_id,
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

module.exports = { index, client, monthlyPerformanceShowcase };
