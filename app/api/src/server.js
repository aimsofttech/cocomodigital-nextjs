require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports - Admin
const adminAuthRoutes = require('./routes/admin/auth');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminTopBannerRoutes = require('./routes/admin/topBanner');
const adminBrandsRoutes = require('./routes/admin/brands');
const adminServiceCategoryRoutes = require('./routes/admin/serviceCategory');
const adminGrowthStatsRoutes = require('./routes/admin/growthStats');
const adminServiceItemRoutes = require('./routes/admin/serviceItem');
const adminVideoRoutes = require('./routes/admin/video');
const adminClientRoutes = require('./routes/admin/client');
const adminMarketingCategoryRoutes = require('./routes/admin/marketingHouseCategory');
const adminMarketingItemRoutes = require('./routes/admin/marketingHouseItem');
const adminMarketingImageRoutes = require('./routes/admin/marketingHouseImage');
const adminMarketingStaticsRoutes = require('./routes/admin/marketingHouseStatics');
const adminMarketingPerformanceRoutes = require('./routes/admin/marketingHousePerformance');
const adminMarketingIdeaStrategyRoutes = require('./routes/admin/marketingHouseIdeaStrategy');
const adminMarketingOtherActivityCategoryRoutes = require('./routes/admin/marketingHouseOtherActivityCategory');
const adminMarketingOtherActivityItemRoutes = require('./routes/admin/marketingHouseOtherActivityItem');
const adminMarketingContentCategoryRoutes = require('./routes/admin/marketingHouseContentCategory');
const adminMarketingContentItemRoutes = require('./routes/admin/marketingHouseContentItem');
const adminMarketingContentCarouselRoutes = require('./routes/admin/marketingHouseContentCarousel');
const adminMarketingCommunityProgramRoutes = require('./routes/admin/marketingHouseCommunityProgram');
const adminMarketingCommunityProgramItemRoutes = require('./routes/admin/marketingHouseCommunityProgramItem');
const adminMarketingProjectRoutes = require('./routes/admin/marketingHouseProject');
const adminMarketingFormRoutes = require('./routes/admin/marketingForm');
const adminCreativeCategoryRoutes = require('./routes/admin/creativeHouseCategory');
const adminCreativeItemRoutes = require('./routes/admin/creativeHouseItem');
const adminCreativeApproachRoutes = require('./routes/admin/creativeHouseApproach');
const adminCreativeFinalOutputRoutes = require('./routes/admin/creativeHouseFinalOutput');
const adminCreativeProjectRoutes = require('./routes/admin/creativeHouseProject');
const adminCreativeWizardRoutes = require('./routes/admin/creativeHouseWizard');
const adminMarketingWizardRoutes = require('./routes/admin/marketingHouseWizard');
const adminMarketingBulkUploadRoutes = require('./routes/admin/marketingHouseBulkUpload');
const adminDevHouseCategoryRoutes = require('./routes/admin/developmentHouseCategory');
const adminDevHouseItemRoutes = require('./routes/admin/developmentHouseItem');
const adminGroupTopBannerRoutes = require('./routes/admin/groupTopBanner');
const adminGroupServiceCategoryRoutes = require('./routes/admin/groupServiceCategory');
const adminGroupServiceItemRoutes = require('./routes/admin/groupServiceItem');
const adminGroupSingleServiceImageRoutes = require('./routes/admin/groupSingleServiceImage');
const adminGroupSingleServiceRecentWorkRoutes = require('./routes/admin/groupSingleServiceRecentWork');
const adminGroupPortfolioCategoryRoutes = require('./routes/admin/groupPortfolioCategory');
const adminGroupPortfolioItemRoutes = require('./routes/admin/groupPortfolioItem');
const adminCreatorPlatformRoutes = require('./routes/admin/creatorPlatform');
const adminSuccessStoriesRoutes = require('./routes/admin/successStories');
const adminSuccessStoriesProjectRoutes = require('./routes/admin/successStoriesProject');
const adminMonthlyPerformanceCategoryRoutes = require('./routes/admin/monthlyPerformanceCategory');
const adminMonthlyPerformanceSubcategoryRoutes = require('./routes/admin/monthlyPerformanceSubcategory');
const adminMonthlyPerformanceItemRoutes = require('./routes/admin/monthlyPerformanceItem');
const adminSocialWorkCategoryRoutes = require('./routes/admin/socialWorkCategory');
const adminSocialWorkItemRoutes = require('./routes/admin/socialWorkItem');
const adminBlogCategoryRoutes = require('./routes/admin/blogCategory');
const adminBlogSubCategoryRoutes = require('./routes/admin/blogSubCategory');
const adminBlogItemRoutes = require('./routes/admin/blogItem');
const adminJobListRoutes = require('./routes/admin/jobList');
const adminJobApplicantRoutes = require('./routes/admin/jobApplicant');
const adminJobCategoryRoutes = require('./routes/admin/jobCategory');
const adminGalleryImageRoutes = require('./routes/admin/galleryImage');
const adminGalleryVideoRoutes = require('./routes/admin/galleryVideo');
const adminAuthorTemplateRoutes = require('./routes/admin/authorTemplate');
const adminBannerTitleTemplateRoutes = require('./routes/admin/bannerTitleTemplate');
const adminBookCallRoutes = require('./routes/admin/bookCall');
const adminUserChoiceRoutes = require('./routes/admin/userChoice');
const adminOurAdvantageRoutes = require('./routes/admin/ourAdvantage');
const adminPageRoutes = require('./routes/admin/page');
const adminContactUsRoutes = require('./routes/admin/contactUs');
const adminFreeConsultationRoutes = require('./routes/admin/freeConsultation');
const adminMeetingRoutes = require('./routes/admin/meeting');
const adminMeetingAvailabilityRoutes = require('./routes/admin/meetingAvailability');
const adminFaqRoutes = require('./routes/admin/faq');
const adminMarketingFaqRoutes = require('./routes/admin/marketingHouseFaq');
const adminGroupServiceItemFaqRoutes = require('./routes/admin/groupServiceItemFaq');
const adminWhatsappTemplateRoutes = require('./routes/admin/whatsappTemplate');
const adminAdminPostRoutes = require('./routes/admin/adminPost');
const adminHomePageSectionRoutes = require('./routes/admin/homePageSection');
const adminHomePageSectionItemRoutes = require('./routes/admin/homePageSectionItem');
const adminGrowthServiceRoutes = require('./routes/admin/growthService');
const adminPodcastRoutes = require('./routes/admin/podcast');
const adminUsersRoutes = require('./routes/admin/adminUsers');
const adminRolesRoutes = require('./routes/admin/adminRoles');
const adminProfileRoutes = require('./routes/admin/profile');
const adminUploadRoutes = require('./routes/admin/uploads');
const adminMediaAssetRoutes = require('./routes/admin/mediaAssets');

// Route imports - Public API
const apiHomeRoutes = require('./routes/api/home');
const apiServiceRoutes = require('./routes/api/service');
const apiCreativeRoutes = require('./routes/api/creative');
const apiMarketingRoutes = require('./routes/api/marketing');
const apiBlogRoutes = require('./routes/api/blog');
const apiJobRoutes = require('./routes/api/job');
const apiClientRoutes = require('./routes/api/client');
const apiContactRoutes = require('./routes/api/contact');
const apiGoogleRoutes = require('./routes/api/google');
const apiCommonRoutes = require('./routes/api/common');
const apiHomePageSectionRoutes = require('./routes/api/homePageSection');
const apiFaqRoutes = require('./routes/api/faq');
const apiGroupServiceFaqRoutes = require('./routes/api/groupServiceFaq');
const apiJobCategoryRoutes = require('./routes/api/jobCategory');
const apiGrowthServiceRoutes = require('./routes/api/growthService');
const apiPodcastRoutes = require('./routes/api/podcast');

const app = express();
app.set('trust proxy', 1);

connectDB();

/* Create the four admin roles if they are missing and map any account that
 * predates the permission system onto one. Idempotent, and never overwrites
 * a role or a permission set that already exists. Runs on every (re)connect
 * because connectDB retries in the background rather than blocking boot. */
const { bootstrapAdminAccess } = require('./config/bootstrapAdminAccess');
const { authorizeAdmin } = require('./middleware/adminAccess');
{
  const mongooseConn = require('mongoose').connection;
  if (mongooseConn.readyState === 1) bootstrapAdminAccess();
  else mongooseConn.once('connected', () => { bootstrapAdminAccess(); });
}

// Security middleware
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  // Next.js SSR fetches all come from localhost with no-store caching
  // (~8 API calls per page render), so throttling loopback traffic in
  // dev starves the web app with 429s after a few dozen refreshes.
  skip: (req) =>
    process.env.NODE_ENV !== 'production' &&
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip),
});
app.use('/api/', limiter);

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS ||
  'http://localhost:3000,http://localhost:5173,http://localhost:5174').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({
  limit: '50mb',
  // Meta signs the raw bytes of its webhook body, so the parsed object cannot
  // verify it. Captured for that one route only — buffering every request body
  // at a 50mb limit would be a real memory cost for no benefit.
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes('/webhooks/whatsapp')) req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

/**
 * Short-circuit API requests while the database is unreachable.
 *
 * Without this, every request queues in Mongoose's buffer, waits the full 10s
 * timeout and then fails with `Operation "crm_users.findOne()" buffering timed
 * out` — a 500 that names an internal driver detail. A login spinner that hangs
 * for ten seconds and then reports a generic server error is indistinguishable
 * from a broken build; "database unavailable, retrying" is not.
 *
 * Deliberately not applied to /health, which exists precisely to be reachable
 * when this is the case.
 */
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  // Only guard the API surfaces; static assets and redirects need no database.
  const needsDb = req.path.startsWith('/api/') || req.path.startsWith('/admin/api/')
    || req.path.startsWith('/crm/');
  if (!needsDb) return next();
  if (require('mongoose').connection.readyState === 1) return next();
  return res.status(503).json({
    status: 'error',
    message: 'Database unavailable — the API is retrying the connection. Please try again shortly.',
    code: 'DB_UNAVAILABLE',
  });
});

// Admin routes
const adminBase = '/admin/api';
/* ── Admin authentication & authorization ─────────────────────────────────
 * Every /admin/api request passes through here before it reaches a router:
 * the token is verified, the account is checked for being live, and the
 * request's module and action are matched against the caller's role.
 *
 * Mounted once rather than per route so a new module cannot ship without a
 * permission check — an unrecognised admin path is denied, not allowed. The
 * `protect` calls inside each router stay exactly as they were and simply
 * reuse the user this has already loaded. */
app.use(adminBase, authorizeAdmin);

app.use(`${adminBase}/auth`, adminAuthRoutes);
app.use(`${adminBase}/profile`, adminProfileRoutes);
app.use(`${adminBase}/users`, adminUsersRoutes);
app.use(`${adminBase}/roles`, adminRolesRoutes);
app.use(`${adminBase}/dashboard`, adminDashboardRoutes);
app.use(`${adminBase}/top-banner`, adminTopBannerRoutes);
app.use(`${adminBase}/brands`, adminBrandsRoutes);
app.use(`${adminBase}/service-department`, adminServiceCategoryRoutes);
app.use(`${adminBase}/growth-stats`, adminGrowthStatsRoutes);
app.use(`${adminBase}/service-category`, adminServiceItemRoutes);
app.use(`${adminBase}/video`, adminVideoRoutes);
app.use(`${adminBase}/client`, adminClientRoutes);
app.use(`${adminBase}/marketing-house/category`, adminMarketingCategoryRoutes);
app.use(`${adminBase}/marketing-house/item`, adminMarketingItemRoutes);
app.use(`${adminBase}/marketing-house/image`, adminMarketingImageRoutes);
app.use(`${adminBase}/marketing-house/statics`, adminMarketingStaticsRoutes);
app.use(`${adminBase}/marketing-house/performance`, adminMarketingPerformanceRoutes);
app.use(`${adminBase}/marketing-house/idea-strategy`, adminMarketingIdeaStrategyRoutes);
app.use(`${adminBase}/marketing-house/other-activity-category`, adminMarketingOtherActivityCategoryRoutes);
app.use(`${adminBase}/marketing-house/other-activity-item`, adminMarketingOtherActivityItemRoutes);
app.use(`${adminBase}/marketing-house/content-category`, adminMarketingContentCategoryRoutes);
app.use(`${adminBase}/marketing-house/content-item`, adminMarketingContentItemRoutes);
app.use(`${adminBase}/marketing-house/content-carousel`, adminMarketingContentCarouselRoutes);
app.use(`${adminBase}/marketing-house/community-program`, adminMarketingCommunityProgramRoutes);
app.use(`${adminBase}/marketing-house/community-program-item`, adminMarketingCommunityProgramItemRoutes);
app.use(`${adminBase}/marketing-house/faq`, adminMarketingFaqRoutes);
app.use(`${adminBase}/marketing-house/project`, adminMarketingProjectRoutes);
app.use(`${adminBase}/marketing-house/form`, adminMarketingFormRoutes);
app.use(`${adminBase}/marketing-house/wizard`, adminMarketingWizardRoutes);
app.use(`${adminBase}/marketing-house/bulk-upload`, adminMarketingBulkUploadRoutes);
app.use(`${adminBase}/creative-house/category`, adminCreativeCategoryRoutes);
app.use(`${adminBase}/creative-house/item`, adminCreativeItemRoutes);
app.use(`${adminBase}/creative-house/approach`, adminCreativeApproachRoutes);
app.use(`${adminBase}/creative-house/final-output`, adminCreativeFinalOutputRoutes);
app.use(`${adminBase}/creative-house/project`, adminCreativeProjectRoutes);
app.use(`${adminBase}/creative-house/wizard`, adminCreativeWizardRoutes);
app.use(`${adminBase}/development-house/category`, adminDevHouseCategoryRoutes);
app.use(`${adminBase}/development-house/item`, adminDevHouseItemRoutes);
app.use(`${adminBase}/group-service/top-banner`, adminGroupTopBannerRoutes);
app.use(`${adminBase}/group-service/category`, adminGroupServiceCategoryRoutes);
app.use(`${adminBase}/group-service/item`, adminGroupServiceItemRoutes);
app.use(`${adminBase}/group-service/single-service-image`, adminGroupSingleServiceImageRoutes);
app.use(`${adminBase}/group-service/recent-work`, adminGroupSingleServiceRecentWorkRoutes);
app.use(`${adminBase}/group-service/portfolio-category`, adminGroupPortfolioCategoryRoutes);
app.use(`${adminBase}/group-service/portfolio-item`, adminGroupPortfolioItemRoutes);
app.use(`${adminBase}/creator-platform`, adminCreatorPlatformRoutes);
app.use(`${adminBase}/success-stories`, adminSuccessStoriesRoutes);
app.use(`${adminBase}/success-stories-project`, adminSuccessStoriesProjectRoutes);
app.use(`${adminBase}/monthly-performance/category`, adminMonthlyPerformanceCategoryRoutes);
app.use(`${adminBase}/monthly-performance/subcategory`, adminMonthlyPerformanceSubcategoryRoutes);
app.use(`${adminBase}/monthly-performance/item`, adminMonthlyPerformanceItemRoutes);
app.use(`${adminBase}/social-work/category`, adminSocialWorkCategoryRoutes);
app.use(`${adminBase}/social-work/item`, adminSocialWorkItemRoutes);
app.use(`${adminBase}/blog/category`, adminBlogCategoryRoutes);
app.use(`${adminBase}/blog/sub-category`, adminBlogSubCategoryRoutes);
app.use(`${adminBase}/blog/item`, adminBlogItemRoutes);
app.use(`${adminBase}/job/list`, adminJobListRoutes);
app.use(`${adminBase}/job/applicant`, adminJobApplicantRoutes);
app.use(`${adminBase}/job/category`, adminJobCategoryRoutes);
app.use(`${adminBase}/gallery/image`, adminGalleryImageRoutes);
app.use(`${adminBase}/gallery/video`, adminGalleryVideoRoutes);
app.use(`${adminBase}/template/author`, adminAuthorTemplateRoutes);
app.use(`${adminBase}/template/banner-title`, adminBannerTitleTemplateRoutes);
app.use(`${adminBase}/template/book-call`, adminBookCallRoutes);
app.use(`${adminBase}/template/user-choice`, adminUserChoiceRoutes);
app.use(`${adminBase}/template/our-advantage`, adminOurAdvantageRoutes);
app.use(`${adminBase}/page`, adminPageRoutes);
app.use(`${adminBase}/contact-us`, adminContactUsRoutes);
app.use(`${adminBase}/free-consultation`, adminFreeConsultationRoutes);
app.use(`${adminBase}/meetings`, adminMeetingRoutes);
app.use(`${adminBase}/meeting-availability`, adminMeetingAvailabilityRoutes);
app.use(`${adminBase}/faq`, adminFaqRoutes);
app.use(`${adminBase}/group-service-item-faq`, adminGroupServiceItemFaqRoutes);
app.use(`${adminBase}/whatsapp-template`, adminWhatsappTemplateRoutes);
app.use(`${adminBase}/admin-post`, adminAdminPostRoutes);
app.use(`${adminBase}/home-page-section`, adminHomePageSectionRoutes);
app.use(`${adminBase}/home-page-section-item`, adminHomePageSectionItemRoutes);
// Growth landing pages (YouTube growth / social video editing / podcast
// editing) — self-contained module, all sub-resources under one mount.
app.use(`${adminBase}/growth-service`, adminGrowthServiceRoutes);
// Podcast money page (/podcast-video-editing-marketing-services) — parent
// record plus its six section collections under one mount.
app.use(`${adminBase}/podcast`, adminPodcastRoutes);
app.use(`${adminBase}/uploads`, adminUploadRoutes);
app.use(`${adminBase}/media`, adminMediaAssetRoutes);

// Public API routes
app.use('/api/home', apiHomeRoutes);
app.use('/api/service', apiServiceRoutes);
app.use('/api/creative', apiCreativeRoutes);
app.use('/api/marketing', apiMarketingRoutes);
app.use('/api/blog', apiBlogRoutes);
app.use('/api/job', apiJobRoutes);
app.use('/api/client', apiClientRoutes);
app.use('/api/contact', apiContactRoutes);
app.use('/api/google', apiGoogleRoutes);
app.use('/api/common', apiCommonRoutes);
app.use('/api/home-page-sections', apiHomePageSectionRoutes);
app.use('/api/faqs', apiFaqRoutes);
app.use('/api/group-service/faqs', apiGroupServiceFaqRoutes);
app.use('/api/job-categories', apiJobCategoryRoutes);
app.use('/api/growth-services', apiGrowthServiceRoutes);
app.use('/api/podcast-pages', apiPodcastRoutes);

// CRM (self-contained module under src/crm — mounted at /crm/api).
// Also mounted at CRM_PUBLIC_PATH when that differs, because provider webhooks
// can only reach whatever prefix the reverse proxy forwards to this app.
{
  const crmRoutes = require('./crm/routes');
  const { mountPaths } = require('./crm/publicUrl');
  for (const mount of mountPaths()) app.use(mount, crmRoutes);
}

// Health check
app.get('/health', (req, res) => {
  // The process being up says nothing about whether it can serve data. Report
  // the database separately so "the API is running but everything 500s" is one
  // request away from being explained.
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const db = states[require('mongoose').connection.readyState] || 'unknown';
  return res.status(db === 'connected' ? 200 : 503).json({
    status: db === 'connected' ? 'ok' : 'degraded',
    db,
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Socket.IO needs the raw HTTP server, so Express can no longer own listen().
// Same port, same process — the upgrade handshake is routed by path
// (/crm/socket.io), leaving every existing REST route untouched.
const http = require('http');

const server = http.createServer(app);
try {
  require('./crm/realtime').init(server, { origins: allowedOrigins });
} catch (err) {
  // A broken realtime layer must not stop the API from serving requests; the
  // inbox falls back to its polling refresh.
  logger.error(`CRM realtime init failed: ${err.message}`);
}

server.listen(PORT, () => {
  console.log('\n================================');
  console.log(`  API    : http://localhost:${PORT}`);
  console.log(`  Socket : ws://localhost:${PORT}/crm/socket.io`);
  console.log(`  Mode   : ${process.env.NODE_ENV || 'development'}`);
  console.log('================================\n');
  // Verify SMTP at boot so a misconfiguration surfaces immediately (non-fatal).
  require('./services/mailer').verify().catch(() => {});
  // Start the CRM scheduler + job handlers (Mongo-backed, no Redis).
  try { require('./crm/services/workers').init(); } catch (err) { logger.error(`CRM workers init failed: ${err.message}`); }
  // Report Google Meet / Calendar status so it's obvious whether booking emails
  // will include a Meet link.
  if (require('./services/calendarService').isConfigured()) {
    logger.info('Google Meet: configured — bookings will include a Meet link.');
  } else {
    logger.warn(
      'Google Meet: not configured — set GOOGLE_CLIENT_ID/SECRET then visit ' +
        '/api/google/oauth/start to connect (bookings still work without a link).'
    );
  }
  if (process.env.NODE_ENV !== 'test') {
    require('./services/reminderService').startReminderPoller();
  }
});

module.exports = app;
// The raw HTTP server, for callers that need to close it or reuse the socket
// binding (scripts/test-realtime.js). Requiring this module already starts it,
// so a test must never create a second server on the same port.
module.exports.httpServer = server;
