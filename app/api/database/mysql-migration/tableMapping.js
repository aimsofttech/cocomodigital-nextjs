/**
 * Complete MySQL table → MongoDB collection mapping.
 *
 * Each entry defines:
 *  - collection  : target MongoDB collection name (= Mongoose model collection)
 *  - model       : Mongoose model name used by the Node.js app
 *  - fields      : { mysqlColumn: mongoField }  — omit entries where name is identical
 *  - foreignKeys : { mongoField: 'referencedMysqlTable' }
 *  - statusField : name of the status column in MySQL (to auto-convert active/inactive → 1/0)
 *  - skip        : don't migrate this table (system tables)
 *  - order       : migration order (lower = first, to satisfy FK dependencies)
 */

const TABLE_MAP = {

  /* ─────────────────────────── SYSTEM / AUTH ────────────────────────── */

  users: {
    collection: 'users',
    model: 'User',
    order: 1,
    fields: {
      // No renames — field names match Mongoose model exactly
    },
    statusField: null,
    foreignKeys: {},
  },

  password_resets:           { skip: true },
  personal_access_tokens:    { skip: true },
  failed_jobs:               { skip: true },
  migrations:                { skip: true },

  /* ──────────────────────────── HOME PAGE ───────────────────────────── */

  top_banner: {
    collection: 'topbanners',
    model: 'TopBanner',
    order: 10,
    fields: {
      // Migration had: headline, subheading, action_button_text, action_button_url
      // Model expects: heading, sub_heading, banner_button_text, banner_button_url
      headline:            'heading',
      subheading:          'sub_heading',
      action_button_text:  'banner_button_text',
      action_button_url:   'banner_button_url',
      // If the actual table already has heading/sub_heading (added later), those pass through
    },
    statusField: 'status',
    foreignKeys: {
      user_id:               'users',
      book_call_template_id: 'book_calls',
    },
  },

  // Some deployments use 'brands', some 'trusted_brands' — try both
  trusted_brands: {
    collection: 'brands',
    model: 'Brand',
    order: 10,
    fields: {
      logo_image:   'brand_image',
      website_url:  'website_url',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  brands: {
    collection: 'brands',
    model: 'Brand',
    order: 10,
    fields: {
      logo_image: 'brand_image',   // some versions use logo_image
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* Service categories */
  explore_our_service_category: {
    collection: 'servicecategories',
    model: 'ServiceCategory',
    order: 11,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* Service items */
  explore_our_service_item: {
    collection: 'serviceitems',
    model: 'ServiceItem',
    order: 12,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      service_category_id: 'explore_our_service_category',
      user_id:             'users',
    },
  },

  /* Videos */
  video: {
    collection: 'videos',
    model: 'Video',
    order: 10,
    fields: {
      thumbnail:    'video_thumbnail',
      video_url:    'video_url',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* Clients */
  client: {
    collection: 'clients',
    model: 'Client',
    order: 13,
    fields: {
      client_image: 'client_img',
      order:        'display_order',
    },
    statusField: 'status',
    foreignKeys: {
      user_id:               'users',
      author_template_id:    'author_templates',
      book_call_template_id: 'book_calls',
    },
  },

  /* ─────────────────────── MARKETING HOUSE ──────────────────────────── */

  marketing_house_categories: {
    collection: 'marketinghousecategories',
    model: 'MarketingHouseCategory',
    order: 20,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  marketing_house_items: {
    collection: 'marketinghouseitems',
    model: 'MarketingHouseItem',
    order: 21,
    fields: {
      title:               'marketing_house_title',
      poster_image:        'marketing_house_thumbnail',
      marketing_video:     'marketing_house_video_url',
      marketing_video_type:'marketing_video_type',
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_category_id: 'marketing_house_categories',
      user_id:                     'users',
      author_template_id:          'author_templates',
      book_call_template_id:       'book_calls',
      our_advantage_template_id:   'our_advantages',
    },
  },

  marketing_house_images: {
    collection: 'marketinghouseimages',
    model: 'MarketingHouseImage',
    order: 22,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_category_id: 'marketing_house_categories',
      marketing_house_item_id:     'marketing_house_items',
      user_id:                     'users',
    },
  },

  marketing_house_statics: {
    collection: 'marketinghousestatics',
    model: 'MarketingHouseStatics',
    order: 22,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
      user_id:                 'users',
    },
  },

  marketing_house_performance: {
    collection: 'marketinghouseperformances',
    model: 'MarketingHousePerformance',
    order: 22,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
      user_id:                 'users',
    },
  },

  marketing_house_pre_launch_activities: {
    collection: 'marketinghouseprelaunchactivities',
    model: 'MarketingHousePreLaunchActivity',
    order: 22,
    fields: {
      title:       'activity_title',
      description: 'activity_description',
      image:       'activity_image',
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_category_id: 'marketing_house_categories',
      marketing_house_item_id:     'marketing_house_items',
      user_id:                     'users',
    },
  },

  marketing_house_idea_strategy_planning: {
    collection: 'marketinghouseideastrategyplannings',
    model: 'MarketingHouseIdeaStrategyPlanning',
    order: 22,
    fields: {
      title:       'idea_title',
      description: 'idea_description',
      image:       'idea_image',
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
      user_id:                 'users',
    },
  },

  marketing_house_other_activity_category: {
    collection: 'marketinghouseotheractiviticategories',
    model: 'MarketingHouseOtherActivityCategory',
    order: 23,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_category_id: 'marketing_house_categories',
      marketing_house_item_id:     'marketing_house_items',
      user_id:                     'users',
    },
  },

  marketing_house_other_activity_item: {
    collection: 'marketinghouseotheractivtyitems',
    model: 'MarketingHouseOtherActivityItem',
    order: 24,
    fields: {
      title:            'item_title',
      description:      'item_description',
      image1:           'item_image',
      // image2..image4 — map to same item_image (only first image kept; extras dropped)
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_other_activity_category_id: 'marketing_house_other_activity_category',
      user_id:                                     'users',
    },
    // marketing_house_item_id derived via parent category
    extraFields: (row, idMap) => {
      const parentCatId = row.marketing_house_other_activity_category_id;
      return {};
    },
  },

  marketing_house_content_created_categories: {
    collection: 'marketinghousecontentcreatedcategories',
    model: 'MarketingHouseContentCreatedCategory',
    order: 23,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_category_id: 'marketing_house_categories',
      marketing_house_item_id:     'marketing_house_items',
      user_id:                     'users',
    },
  },

  marketing_house_content_created_items: {
    collection: 'marketinghousecontentcreateditems',
    model: 'MarketingHouseContentCreatedItem',
    order: 24,
    fields: {
      image:  'item_image',
      url:    'item_video_url',
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_content_created_category_id: 'marketing_house_content_created_categories',
      user_id:                                      'users',
    },
  },

  marketing_house_content_created_item_carousels: {
    collection: 'marketinghousecontentcreateditemcarousels',
    model: 'MarketingHouseContentCreatedItemCarousel',
    order: 25,
    fields: {
      image: 'carousel_image',
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_content_created_category_id: 'marketing_house_content_created_categories',
      user_id:                                      'users',
    },
  },

  marketing_house_community_program_category: {
    collection: 'marketinghousecommunityprogramcategories',
    model: 'MarketingHouseCommunityProgramCategory',
    order: 23,
    fields: {
      image: 'category_image',
    },
    statusField: 'status',
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
      user_id:                 'users',
    },
  },

  marketing_house_community_program_category_item: {
    collection: 'marketinghousecommunityprogramcategoryitems',
    model: 'MarketingHouseCommunityProgramCategoryItem',
    order: 24,
    fields: {
      image:  'item_image',
      url:    'item_video_url',
    },
    statusField: 'status',
    foreignKeys: {
      community_program_category_id: 'marketing_house_community_program_category',
      marketing_house_item_id:       'marketing_house_items',
      user_id:                       'users',
    },
  },

  marketing_house_project: {
    collection: 'marketinghouseprojects',
    model: 'MarketingHouseProject',
    order: 22,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
      user_id:                 'users',
    },
  },

  marketing_form: {
    collection: 'marketingforms',
    model: 'MarketingForm',
    order: 50,
    fields: {},
    statusField: null,
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
    },
  },

  /* ─────────────────────── CREATIVE HOUSE ───────────────────────────── */

  creative_house_category: {
    collection: 'creativehousecategories',
    model: 'CreativeHouseCategory',
    order: 20,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  creative_house_item: {
    collection: 'creativehouseitems',
    model: 'CreativeHouseItem',
    order: 21,
    fields: {
      creative_house_upload_video_url: 'creative_house_video_url',
    },
    statusField: 'status',
    foreignKeys: {
      creative_house_category_id: 'creative_house_category',
      user_id:                    'users',
      author_template_id:         'author_templates',
      book_call_template_id:      'book_calls',
    },
  },

  creative_house_approach: {
    collection: 'creativehouseapproaches',
    model: 'CreativeHouseApproach',
    order: 22,
    fields: {
      title:       'approach_title',
      description: 'approach_description',
      image:       'approach_image',
    },
    statusField: 'status',
    foreignKeys: {
      creative_house_item_id: 'creative_house_item',
      user_id:                'users',
    },
  },

  creative_house_final_output: {
    collection: 'creativehousefinaloutputs',
    model: 'CreativeHouseFinalOutput',
    order: 22,
    fields: {
      title: 'output_title',
      image: 'output_image',
      url:   'output_video_url',
    },
    statusField: 'status',
    foreignKeys: {
      creative_house_item_id: 'creative_house_item',
      user_id:                'users',
    },
  },

  creative_house_project: {
    collection: 'creativehouseprojects',
    model: 'CreativeHouseProject',
    order: 22,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      creative_house_item_id:     'creative_house_item',
      creative_house_category_id: 'creative_house_category',
      user_id:                    'users',
    },
  },

  /* ───────────────────── DEVELOPMENT HOUSE ──────────────────────────── */

  development_house_category: {
    collection: 'developmenthousecategories',
    model: 'DevelopmentHouseCategory',
    order: 20,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  development_house_item: {
    collection: 'developmenthouseitems',
    model: 'DevelopmentHouseItem',
    order: 21,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      development_house_category_id: 'development_house_category',
      user_id:                       'users',
    },
  },

  /* ────────────────────── GROUP SERVICES ────────────────────────────── */

  group_top_banner: {
    collection: 'grouptopbanners',
    model: 'GroupTopBanner',
    order: 30,
    fields: {
      explore_our_service_category_id: 'service_category_id',
      explore_our_service_item_id:     'service_item_id',
    },
    statusField: 'status',
    foreignKeys: {
      service_category_id: 'explore_our_service_category',
      service_item_id:     'explore_our_service_item',
      user_id:             'users',
    },
  },

  group_service_category: {
    collection: 'groupservicecategories',
    model: 'GroupServiceCategory',
    order: 31,
    fields: {
      explore_our_service_category_id: 'service_category_id',
      explore_our_service_item_id:     'service_item_id',
    },
    statusField: 'status',
    foreignKeys: {
      service_category_id: 'explore_our_service_category',
      service_item_id:     'explore_our_service_item',
      user_id:             'users',
    },
  },

  group_service_item: {
    collection: 'groupserviceitems',
    model: 'GroupServiceItem',
    order: 32,
    fields: {
      group_service_slug: 'group_service_item_slug',
    },
    statusField: 'status',
    foreignKeys: {
      group_service_category_id: 'group_service_category',
      user_id:                   'users',
    },
  },

  group_single_service_image: {
    collection: 'groupsingleserviceimages',
    model: 'GroupSingleServiceImage',
    order: 33,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      group_service_item_id:     'group_service_item',
      group_service_category_id: 'group_service_category',
      user_id:                   'users',
    },
  },

  group_single_service_recent_work: {
    collection: 'groupsingleservicerecentworks',
    model: 'GroupSingleServiceRecentWork',
    order: 33,
    fields: {
      title: 'recent_work_title',
      image: 'recent_work_image',
      url:   'recent_work_video_url',
    },
    statusField: 'status',
    foreignKeys: {
      group_service_item_id:     'group_service_item',
      group_service_category_id: 'group_service_category',
      user_id:                   'users',
    },
  },

  group_single_service_portfolio_category: {
    collection: 'groupsingleserviceportfoliocategories',
    model: 'GroupSingleServicePortfolioCategory',
    order: 33,
    fields: {
      category_name: 'portfolio_category_name',
    },
    statusField: 'status',
    foreignKeys: {
      group_service_item_id:     'group_service_item',
      group_service_category_id: 'group_service_category',
      user_id:                   'users',
    },
  },

  group_single_service_portfolio_item: {
    collection: 'groupsingleserviceportfolioitems',
    model: 'GroupSingleServicePortfolioItem',
    order: 34,
    fields: {
      title: 'portfolio_item_title',
      image: 'portfolio_item_image',
      url:   'portfolio_item_video_url',
    },
    statusField: 'status',
    foreignKeys: {
      portfolio_category_id:     'group_single_service_portfolio_category',
      group_service_category_id: 'group_service_category',
      user_id:                   'users',
    },
  },

  group_creator_platform: {
    collection: 'groupcreatorplatforms',
    model: 'GroupCreatorPlatform',
    order: 30,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  group_success_stories: {
    collection: 'groupsuccessstories',
    model: 'GroupSuccessStories',
    order: 30,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* ──────────────────── MONTHLY PERFORMANCE SHOWCASE ────────────────── */

  monthly_performance_showcase_category: {
    collection: 'monthlyperformanceshowcasecategories',
    model: 'MonthlyPerformanceShowcaseCategory',
    order: 20,
    fields: {
      icon: 'mps_icon',
      name: 'mps_category_name',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  monthly_performance_showcase_subcategory: {
    collection: 'monthlyperformanceshowcasesubcategories',
    model: 'MonthlyPerformanceShowcaseSubcategory',
    order: 21,
    fields: {
      name: 'mps_subcategory_name',
    },
    statusField: 'status',
    foreignKeys: {
      mps_category_id: 'monthly_performance_showcase_category',
      user_id:         'users',
    },
  },

  monthly_performance_showcase: {
    collection: 'monthlyperformanceshowcases',
    model: 'MonthlyPerformanceShowcase',
    order: 22,
    fields: {
      title:       'mps_title',
      description: 'mps_description',
      image:       'mps_img',
    },
    statusField: 'status',
    foreignKeys: {
      mps_category_id:    'monthly_performance_showcase_category',
      mps_subcategory_id: 'monthly_performance_showcase_subcategory',
      user_id:            'users',
    },
  },

  /* ───────────────────────── SOCIAL WORK ────────────────────────────── */

  social_work_category: {
    collection: 'socialworkcategories',
    model: 'SocialWorkCategory',
    order: 20,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  social_work_item: {
    collection: 'socialworkitems',
    model: 'SocialWorkItem',
    order: 21,
    fields: {
      image: 'social_work_img',
      title: 'social_work_title',
    },
    statusField: 'status',
    foreignKeys: {
      social_work_category_id: 'social_work_category',
      user_id:                 'users',
    },
  },

  /* ─────────────────────────── BLOG ─────────────────────────────────── */

  blog_categories: {
    collection: 'blogcategories',
    model: 'BlogCategory',
    order: 20,
    fields: {
      blog_category_name: 'category_name',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  blog_sub_categories: {
    collection: 'blogsubcategories',
    model: 'BlogSubCategory',
    order: 21,
    fields: {
      blog_sub_category_name: 'sub_category_name',
    },
    statusField: 'status',
    foreignKeys: {
      blog_category_id: 'blog_categories',
      user_id:          'users',
    },
  },

  blog_items: {
    collection: 'blogitems',
    model: 'BlogItem',
    order: 22,
    fields: {
      main_image:      'blog_thumbnail',
      blog_item_slug:  'blog_slug',
      blog_description:'blog_content',
    },
    statusField: 'status',
    foreignKeys: {
      blog_category_id:     'blog_categories',
      blog_sub_category_id: 'blog_sub_categories',
      user_id:              'users',
    },
  },

  /* ─────────────────────────── JOBS ─────────────────────────────────── */

  job_categories: {
    collection: 'jobcategories',
    model: 'JobCategory',
    order: 20,
    fields: {
      name: 'category_name',
      slug: 'category_slug',
    },
    statusField: 'status',
    foreignKeys: {},
  },

  job_list: {
    collection: 'joblists',
    model: 'JobList',
    order: 21,
    fields: {
      job_experience: 'experience',
      job_salary:     'salary_range',
      workplace_type: 'job_type',
    },
    statusField: 'status',
    foreignKeys: {
      job_category_id: 'job_categories',
      user_id:         'users',
    },
  },

  job_applicants: {
    collection: 'jobapplicants',
    model: 'JobApplicant',
    order: 22,
    fields: {
      job_id:          'job_list_id',
      first_name:      '_firstName',   // will be combined into applicant_name
      last_name:       '_lastName',    // will be combined
      phone_no:        'applicant_phone',
      email:           'applicant_email',
      linkedin_profile:'linkedin_url',
      upload_resume:   'applicant_resume',
      portfolio_link:  'portfolio_url',
      job_prefrence:   'job_preference',
      notice_period_days: 'notice_period_days',
      current_ctc:     'current_ctc',
      annual_ctc:      'annual_ctc',
    },
    statusField: null,
    foreignKeys: {
      job_list_id: 'job_list',
    },
    postTransform: (doc) => {
      // Combine first_name + last_name → applicant_name
      if (doc._firstName !== undefined || doc._lastName !== undefined) {
        doc.applicant_name = [doc._firstName || '', doc._lastName || ''].join(' ').trim();
        delete doc._firstName;
        delete doc._lastName;
      }
      if (!doc.application_status) doc.application_status = 'pending';
      if (doc.is_read === undefined) doc.is_read = 0;
      return doc;
    },
  },

  /* ───────────────────────── GALLERY ────────────────────────────────── */

  gallery: {
    collection: 'galleries',
    model: 'Gallery',
    order: 20,
    fields: {},
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  gallery_video: {
    collection: 'galleryvideos',
    model: 'GalleryVideo',
    order: 20,
    fields: {
      thumbnail: 'video_thumbnail',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* ─────────────────────────── TEMPLATES ────────────────────────────── */

  author_template: {
    collection: 'authortemplates',
    model: 'AuthorTemplate',
    order: 10,
    fields: {
      image:       'author_image',
      name:        'author_name',
      designation: 'author_designation',
      bio:         'author_bio',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  banner_title_template: {
    collection: 'bannertitletemplates',
    model: 'BannerTitleTemplate',
    order: 10,
    fields: {
      title:    'banner_title',
      subtitle: 'banner_subtitle',
      image:    'banner_image',
      page:     'page_name',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  book_call: {
    collection: 'bookcalls',
    model: 'BookCall',
    order: 10,
    fields: {
      title:       'book_call_title',
      subtitle:    'book_call_subtitle',
      button_text: 'book_call_button_text',
      button_url:  'book_call_button_url',
      image:       'book_call_image',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  user_choice: {
    collection: 'userchoices',
    model: 'UserChoice',
    order: 10,
    fields: {
      title:       'user_choice_title',
      description: 'user_choice_description',
      button_text: 'user_choice_button_text',
      button_url:  'user_choice_button_url',
      image:       'user_choice_image',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  our_advantage: {
    collection: 'ouradvantages',
    model: 'OurAdvantage',
    order: 10,
    fields: {
      title:       'advantage_title',
      description: 'advantage_description',
      icon:        'advantage_icon',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  success_stories_project: {
    collection: 'successstoriesprojects',
    model: 'SuccessStoriesProject',
    order: 20,
    fields: {
      title:       'project_title',
      image:       'project_image',
      description: 'project_description',
      url:         'project_url',
    },
    statusField: 'status',
    foreignKeys: {
      service_item_id: 'explore_our_service_item',
      user_id:         'users',
    },
  },

  /* ──────────────────── FAQ / GROUP SERVICE FAQ ──────────────────────── */

  faqs: {
    collection: 'faqs',
    model: 'Faq',
    order: 30,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      marketing_house_item_id: 'marketing_house_items',
      user_id:                 'users',
    },
  },

  group_service_item_faqs: {
    collection: 'groupserviceitemfaqs',
    model: 'GroupServiceItemFaq',
    order: 35,
    fields: {},
    statusField: 'status',
    foreignKeys: {
      group_service_item_id: 'group_service_item',
      user_id:               'users',
    },
  },

  /* ────────────────────── PAGES / CMS ───────────────────────────────── */

  page: {
    collection: 'pages',
    model: 'Page',
    order: 20,
    fields: {
      title:            'page_title',
      slug:             'page_slug',
      content:          'page_content',
      meta_title:       'meta_title',
      meta_description: 'meta_description',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* ─────────────────────── CONTACT / FORMS ──────────────────────────── */

  contact_us: {
    collection: 'contactus',
    model: 'ContactUs',
    order: 50,
    fields: {},
    statusField: null,
    foreignKeys: {},
  },

  free_consultation_category: {
    collection: 'freeconsultationcategories',
    model: 'FreeConsultationCategory',
    order: 20,
    fields: {
      name: 'category_name',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  free_consultation_item: {
    collection: 'freeconsultationitems',
    model: 'FreeConsultationItem',
    order: 50,
    fields: {},
    statusField: null,
    foreignKeys: {
      consultation_category_id: 'free_consultation_category',
    },
  },

  /* ─────────────────── WHATSAPP / ADMIN POST ────────────────────────── */

  whatsapp_template: {
    collection: 'whatsapptemplates',
    model: 'WhatsappTemplate',
    order: 20,
    fields: {
      name: 'template_name',
      body: 'template_body',
      type: 'template_type',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  admin_post: {
    collection: 'adminposts',
    model: 'AdminPost',
    order: 20,
    fields: {
      title:   'post_title',
      content: 'post_content',
      image:   'post_image',
    },
    statusField: 'status',
    foreignKeys: { user_id: 'users' },
  },

  /* ─────────────────── HOME PAGE SECTIONS ───────────────────────────── */

  home_page_sections: {
    collection: 'homepagesections',
    model: 'HomePageSection',
    order: 20,
    fields: {
      category_name: 'section_name',
    },
    statusField: 'status',
    foreignKeys: {},
  },

  home_page_section_items: {
    collection: 'homepagesectionitems',
    model: 'HomePageSectionItem',
    order: 21,
    fields: {
      name:  'item_title',
      image: 'item_image',
      url:   'item_url',
    },
    statusField: 'status',
    foreignKeys: {
      home_page_section_id: 'home_page_sections',
    },
  },
};

/**
 * Normalize status value from any format to 0 or 1.
 * Handles: 'active'/'inactive', boolean, integer 0/1, string '0'/'1'.
 */
function normalizeStatus(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'active' || lower === '1' || lower === 'true') return 1;
    return 0;
  }
  return value === 1 ? 1 : 0;
}

module.exports = { TABLE_MAP, normalizeStatus };
