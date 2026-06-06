const TopBanner = require('../../models/TopBanner');
const Brand = require('../../models/Brand');
const ServiceCategory = require('../../models/ServiceCategory');
const ServiceItem = require('../../models/ServiceItem');
const Video = require('../../models/Video');
const Client = require('../../models/Client');
const MarketingHouseCategory = require('../../models/MarketingHouseCategory');
const MarketingHouseItem = require('../../models/MarketingHouseItem');
const CreativeHouseCategory = require('../../models/CreativeHouseCategory');
const CreativeHouseItem = require('../../models/CreativeHouseItem');
const UserChoice = require('../../models/UserChoice');
const AuthorTemplate = require('../../models/AuthorTemplate');
const BookCall = require('../../models/BookCall');
const BannerTitleTemplate = require('../../models/BannerTitleTemplate');
const OurAdvantage = require('../../models/OurAdvantage');
const FreeConsultationCategory = require('../../models/FreeConsultationCategory');
const BlogCategory = require('../../models/BlogCategory');
const BlogItem = require('../../models/BlogItem');
const JobList = require('../../models/JobList');
const JobApplicant = require('../../models/JobApplicant');
const ContactUs = require('../../models/ContactUs');

const getStatusCount = async (Model) => {
  const [total, active, inactive] = await Promise.all([
    Model.countDocuments(),
    Model.countDocuments({ status: 1 }),
    Model.countDocuments({ status: 0 }),
  ]);
  return { total, active, inactive };
};

const index = async (req, res) => {
  const [
    totalBanner, totalBrand, totalServiceDept, totalServiceCat,
    totalVideo, totalClient, totalMarketingCategory, totalMarketingItem,
    totalCreativeCategory, totalCreativeItem, totalHireUs, totalAuthor,
    totalBookCall, totalCommonBanner, totalOurAdvantage, totalConsultation,
    totalBlogCategory, totalBlogItem, totalJobList, totalApplicants,
    totalContacts,
  ] = await Promise.all([
    getStatusCount(TopBanner),
    getStatusCount(Brand),
    getStatusCount(ServiceCategory),
    getStatusCount(ServiceItem),
    getStatusCount(Video),
    getStatusCount(Client),
    getStatusCount(MarketingHouseCategory),
    getStatusCount(MarketingHouseItem),
    getStatusCount(CreativeHouseCategory),
    getStatusCount(CreativeHouseItem),
    getStatusCount(UserChoice),
    getStatusCount(AuthorTemplate),
    getStatusCount(BookCall),
    getStatusCount(BannerTitleTemplate),
    getStatusCount(OurAdvantage),
    getStatusCount(FreeConsultationCategory),
    getStatusCount(BlogCategory),
    getStatusCount(BlogItem),
    getStatusCount(JobList),
    getStatusCount(JobApplicant),
    getStatusCount(ContactUs),
  ]);

  res.json({
    status: 'success',
    data: {
      totalBanner, totalBrand, totalServiceDept, totalServiceCat,
      totalVideo, totalClient, totalMarketingCategory, totalMarketingItem,
      totalCreativeCategory, totalCreativeItem, totalHireUs, totalAuthor,
      totalBookCall, totalCommonBanner, totalOurAdvantage, totalConsultation,
      totalBlogCategory, totalBlogItem, totalJobList, totalApplicants,
      totalContacts,
    },
  });
};

module.exports = { index };
