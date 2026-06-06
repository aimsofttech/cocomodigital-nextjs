# MySQL → MongoDB — Complete Table-to-Collection Mapping

## Connection Details

| | MySQL | MongoDB |
|---|---|---|
| Host | 127.0.0.1:3306 | localhost:27017 |
| Database | `cocma_digital_db` | `cocoma_digital_db` |
| User/Auth | cocma_digital_db / G8aMX7HRz4way7Be | .env MONGO_URI |

---

## System Tables (Skipped — Not Migrated)

| MySQL Table | Reason |
|---|---|
| `migrations` | Laravel internal — not needed |
| `password_resets` | Laravel internal — not needed |
| `personal_access_tokens` | Sanctum tokens — JWT replaces these |
| `failed_jobs` | Laravel queue — not needed |

---

## Full Table → Collection Mapping

| MySQL Table | MongoDB Collection | Mongoose Model | Notes |
|---|---|---|---|
| `users` | `users` | User | Passwords migrated as-is (bcrypt $2y$ → $2b$ compatible) |
| `top_banner` | `topbanners` | TopBanner | Field renames: headline→heading, subheading→sub_heading |
| `trusted_brands` / `brands` | `brands` | Brand | logo_image→brand_image |
| `explore_our_service_category` | `servicecategories` | ServiceCategory | — |
| `explore_our_service_item` | `serviceitems` | ServiceItem | — |
| `video` | `videos` | Video | thumbnail→video_thumbnail |
| `client` | `clients` | Client | client_image→client_img, order→display_order |
| `marketing_house_categories` | `marketinghousecategories` | MarketingHouseCategory | — |
| `marketing_house_items` | `marketinghouseitems` | MarketingHouseItem | title→marketing_house_title, poster_image→marketing_house_thumbnail |
| `marketing_house_images` | `marketinghouseimages` | MarketingHouseImage | — |
| `marketing_house_statics` | `marketinghousestatics` | MarketingHouseStatics | — |
| `marketing_house_performance` | `marketinghouseperformances` | MarketingHousePerformance | — |
| `marketing_house_pre_launch_activities` | `marketinghouseprelaunchactivities` | MarketingHousePreLaunchActivity | title→activity_title, image→activity_image |
| `marketing_house_idea_strategy_planning` | `marketinghouseideastrategyplannings` | MarketingHouseIdeaStrategyPlanning | title→idea_title |
| `marketing_house_other_activity_category` | `marketinghouseotheractiviticategories` | MarketingHouseOtherActivityCategory | — |
| `marketing_house_other_activity_item` | `marketinghouseotheractivtyitems` | MarketingHouseOtherActivityItem | title→item_title, image1→item_image |
| `marketing_house_content_created_categories` | `marketinghousecontentcreatedcategories` | MarketingHouseContentCreatedCategory | — |
| `marketing_house_content_created_items` | `marketinghousecontentcreateditems` | MarketingHouseContentCreatedItem | image→item_image, url→item_video_url |
| `marketing_house_content_created_item_carousels` | `marketinghousecontentcreateditemcarousels` | MarketingHouseContentCreatedItemCarousel | image→carousel_image |
| `marketing_house_community_program_category` | `marketinghousecommunityprogramcategories` | MarketingHouseCommunityProgramCategory | — |
| `marketing_house_community_program_category_item` | `marketinghousecommunityprogramcategoryitems` | MarketingHouseCommunityProgramCategoryItem | image→item_image, url→item_video_url |
| `marketing_house_project` | `marketinghouseprojects` | MarketingHouseProject | — |
| `marketing_form` | `marketingforms` | MarketingForm | — |
| `creative_house_category` | `creativehousecategories` | CreativeHouseCategory | — |
| `creative_house_item` | `creativehouseitems` | CreativeHouseItem | creative_house_upload_video_url→creative_house_video_url |
| `creative_house_approach` | `creativehouseapproaches` | CreativeHouseApproach | title→approach_title, image→approach_image |
| `creative_house_final_output` | `creativehousefinaloutputs` | CreativeHouseFinalOutput | title→output_title, image→output_image |
| `creative_house_project` | `creativehouseprojects` | CreativeHouseProject | — |
| `development_house_category` | `developmenthousecategories` | DevelopmentHouseCategory | — |
| `development_house_item` | `developmenthouseitems` | DevelopmentHouseItem | — |
| `group_top_banner` | `grouptopbanners` | GroupTopBanner | explore_our_service_category_id→service_category_id |
| `group_service_category` | `groupservicecategories` | GroupServiceCategory | explore_our_service_item_id→service_item_id |
| `group_service_item` | `groupserviceitems` | GroupServiceItem | group_service_slug→group_service_item_slug |
| `group_single_service_image` | `groupsingleserviceimages` | GroupSingleServiceImage | — |
| `group_single_service_recent_work` | `groupsingleservicerecentworks` | GroupSingleServiceRecentWork | title→recent_work_title, image→recent_work_image |
| `group_single_service_portfolio_category` | `groupsingleserviceportfoliocategories` | GroupSingleServicePortfolioCategory | — |
| `group_single_service_portfolio_item` | `groupsingleserviceportfolioitems` | GroupSingleServicePortfolioItem | title→portfolio_item_title, image→portfolio_item_image |
| `group_creator_platform` | `groupcreatorplatforms` | GroupCreatorPlatform | — |
| `group_success_stories` | `groupsuccessstories` | GroupSuccessStories | — |
| `monthly_performance_showcase_category` | `monthlyperformanceshowcasecategories` | MonthlyPerformanceShowcaseCategory | icon→mps_icon, name→mps_category_name |
| `monthly_performance_showcase_subcategory` | `monthlyperformanceshowcasesubcategories` | MonthlyPerformanceShowcaseSubcategory | name→mps_subcategory_name |
| `monthly_performance_showcase` | `monthlyperformanceshowcases` | MonthlyPerformanceShowcase | title→mps_title, image→mps_img |
| `social_work_category` | `socialworkcategories` | SocialWorkCategory | — |
| `social_work_item` | `socialworkitems` | SocialWorkItem | image→social_work_img, title→social_work_title |
| `blog_categories` | `blogcategories` | BlogCategory | blog_category_name→category_name |
| `blog_sub_categories` | `blogsubcategories` | BlogSubCategory | blog_sub_category_name→sub_category_name |
| `blog_items` | `blogitems` | BlogItem | main_image→blog_thumbnail, blog_description→blog_content |
| `job_categories` | `jobcategories` | JobCategory | name→category_name, slug→category_slug |
| `job_list` | `joblists` | JobList | job_experience→experience, job_salary→salary_range |
| `job_applicants` | `jobapplicants` | JobApplicant | job_id→job_list_id, first_name+last_name→applicant_name, phone_no→applicant_phone |
| `gallery` | `galleries` | Gallery | — |
| `gallery_video` | `galleryvideos` | GalleryVideo | thumbnail→video_thumbnail |
| `author_template` | `authortemplates` | AuthorTemplate | image→author_image, name→author_name |
| `banner_title_template` | `bannertitletemplates` | BannerTitleTemplate | title→banner_title, subtitle→banner_subtitle |
| `book_call` | `bookcalls` | BookCall | title→book_call_title |
| `user_choice` | `userchoices` | UserChoice | title→user_choice_title |
| `our_advantage` | `ouradvantages` | OurAdvantage | title→advantage_title, icon→advantage_icon |
| `success_stories_project` | `successstoriesprojects` | SuccessStoriesProject | — |
| `faqs` | `faqs` | Faq | — |
| `group_service_item_faqs` | `groupserviceitemfaqs` | GroupServiceItemFaq | — |
| `page` | `pages` | Page | title→page_title, content→page_content |
| `contact_us` | `contactus` | ContactUs | — |
| `free_consultation_category` | `freeconsultationcategories` | FreeConsultationCategory | name→category_name |
| `free_consultation_item` | `freeconsultationitems` | FreeConsultationItem | — |
| `whatsapp_template` | `whatsapptemplates` | WhatsappTemplate | name→template_name, body→template_body |
| `admin_post` | `adminposts` | AdminPost | title→post_title, content→post_content |
| `home_page_sections` | `homepagesections` | HomePageSection | category_name→section_name |
| `home_page_section_items` | `homepagesectionitems` | HomePageSectionItem | name→item_title, image→item_image |

---

## Status Field Normalization

All status fields are normalized to integer `0` (inactive) or `1` (active):

| MySQL value | MongoDB value |
|---|---|
| `'active'` | `1` |
| `'inactive'` | `0` |
| `'pending'` | `0` |
| `1` / `true` | `1` |
| `0` / `false` | `0` |

---

## ID Migration Strategy

MySQL uses auto-increment **integer** primary keys.  
MongoDB uses **ObjectId** primary keys.

**How it's handled:**
1. For each MySQL row, a new `mongoose.Types.ObjectId()` is generated
2. A mapping `mysqlTable → Map<mysqlIntId, mongoObjectId>` is maintained in memory
3. When processing foreign keys, the mapper looks up the new ObjectId for each MySQL integer ID
4. The original MySQL `id` field is **not stored** in MongoDB (replaced by `_id`)

---

## Password Migration

Laravel generates `$2y$` bcrypt hashes. Node.js `bcryptjs` generates `$2b$` hashes.

**bcryptjs is 100% compatible with Laravel's `$2y$` hashes** when calling `bcrypt.compare()`.

**No password resets are needed.** All users can log in immediately with their existing passwords.

---

## Running the Migration

```bash
cd C:\Users\Aimsoft\Desktop\cocoma-node-backend\database\mysql-migration

# Install dependencies
npm install

# Step 1: Dry run (preview only, no writes)
node migrate.js --dry-run

# Step 2: Full migration
node migrate.js

# Step 3: Verify results
node verify.js
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `ECONNREFUSED` MySQL | Start MySQL: `net start MySQL80` |
| `ECONNREFUSED` MongoDB | Start MongoDB: `net start MongoDB` |
| `ER_ACCESS_DENIED` | Check credentials in `config.js` |
| Count mismatch | Re-run `node migrate.js` (script drops & re-inserts) |
| `Duplicate key` on slug | Slug uniqueness constraint — duplicate slugs in MySQL will be skipped |
| Table not found in mapping | Script auto-migrates unknown tables as pass-through |
