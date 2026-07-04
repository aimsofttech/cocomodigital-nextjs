const Brand = require('../../models/Brand');
const AuthorTemplate = require('../../models/AuthorTemplate');
const BannerTitleTemplate = require('../../models/BannerTitleTemplate');
const BookCall = require('../../models/BookCall');
const OurAdvantage = require('../../models/OurAdvantage');
const GroupCreatorPlatform = require('../../models/GroupCreatorPlatform');
const SuccessStoriesProject = require('../../models/SuccessStoriesProject');
const UserChoice = require('../../models/UserChoice');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const { buildS3Url } = require('../../utils/s3Upload');

const buildUrl = (key) => (key ? buildS3Url(key) : '');

const commonApi = async (req, res) => {
  const [brands, authors, bannerTitles, bookCalls, advantages, creatorPlatforms, successStories, hireUs] = await Promise.all([
    Brand.find({ status: 1 }).sort({ displayOrder: 1 }),
    AuthorTemplate.find({ status: 1 }).sort({ display_order: 1 }),
    BannerTitleTemplate.find({ status: 1 }).sort({ display_order: 1 }),
    BookCall.find({ status: 1 }).sort({ display_order: 1 }),
    OurAdvantage.find({ status: 1 }).sort({ display_order: 1 }),
    GroupCreatorPlatform.find({ status: 1 }).sort({ display_order: 1 }),
    SuccessStoriesProject.find({ status: 1 }).sort({ display_order: 1 }).limit(10),
    UserChoice.find({ status: 1 }).sort({ display_order: 1 }),
  ]);
  res.json({
    status: 'success',
    data: {
      brands: brands.map((b) => ({ ...b.toObject(), image: buildUrl(b.image) })),
      authors: authors.map((a) => ({ ...a.toObject(), author_image: buildUrl(a.author_image) })),
      banner_titles: bannerTitles.map((b) => ({ ...b.toObject(), banner_image: buildUrl(b.banner_image) })),
      book_calls: bookCalls.map((b) => ({ ...b.toObject(), book_call_image: buildUrl(b.book_call_image) })),
      advantages: advantages.map((a) => ({ ...a.toObject(), advantage_icon: buildUrl(a.advantage_icon) })),
      creator_platforms: creatorPlatforms.map((c) => ({ ...c.toObject(), creator_thumbnail: buildUrl(c.creator_thumbnail) })),
      success_stories: successStories.map((s) => ({ ...s.toObject(), project_image: buildUrl(s.project_image) })),
      hire_us: hireUs.map((h) => ({ ...h.toObject(), user_choice_image: buildUrl(h.user_choice_image) })),
    },
  });
};

const brand = async (req, res) => {
  const data = await Brand.find({ status: 1 }).sort({ displayOrder: 1 });
  res.json({ status: 'success', data: data.map((b) => ({ ...b.toObject(), image: buildUrl(b.image) })) });
};

const hireUs = async (req, res) => {
  const data = await UserChoice.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((h) => ({ ...h.toObject(), user_choice_image: buildUrl(h.user_choice_image) })) });
};

const author = async (req, res) => {
  const data = await AuthorTemplate.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((a) => ({ ...a.toObject(), author_image: buildUrl(a.author_image) })) });
};

const bannerTitle = async (req, res) => {
  const data = await BannerTitleTemplate.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((b) => ({ ...b.toObject(), banner_image: buildUrl(b.banner_image) })) });
};

const bookCall = async (req, res) => {
  const data = await BookCall.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((b) => ({ ...b.toObject(), book_call_image: buildUrl(b.book_call_image) })) });
};

const ourAdvantage = async (req, res) => {
  const data = await OurAdvantage.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((a) => ({ ...a.toObject(), advantage_icon: buildUrl(a.advantage_icon) })) });
};

const contentService = async (req, res) => {
  const data = await GroupCreatorPlatform.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((c) => ({ ...c.toObject(), creator_thumbnail: buildUrl(c.creator_thumbnail) })) });
};

const successStories = async (req, res) => {
  const data = await SuccessStoriesProject.find({ status: 1 }).sort({ display_order: 1 });
  res.json({ status: 'success', data: data.map((s) => ({ ...s.toObject(), project_image: buildUrl(s.project_image) })) });
};

const categories = async (req, res) => {
  const cats = await ServiceCategory.find({ status: 1 }).sort({ display_order: 1 });
  const result = [];
  for (const cat of cats) {
    const items = await ServiceItem.find({ service_category_id: cat._id, status: 1 }).sort({ display_order: 1 });
    result.push({ ...cat.toObject(), items: items.map((i) => ({ ...i.toObject(), service_image: buildUrl(i.service_image) })) });
  }
  res.json({ status: 'success', data: result });
};

module.exports = { commonApi, brand, hireUs, author, bannerTitle, bookCall, ourAdvantage, contentService, successStories, categories };
