export interface BaseModel {
  _id: string;
  createdAt: string;
  updatedAt: string;
  status: number;
  display_order?: number;
  user_id?: string;
  /** URL-friendly identifier, auto-generated from the name/title if left blank. */
  slug?: string;
}

/** A single media object stored in S3 (returned by the upload APIs). */
export interface UploadedMedia {
  url: string;
  key: string;
  originalName?: string;
  size?: number;
  mimetype?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
  pagination?: Pagination;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
}

export interface TopBanner extends BaseModel {
  heading: string;
  subHeading?: string;
  buttonText?: string;
  buttonUrl?: string;
  videoThumbnail?: string;
  videoUrl?: string;
  country: string;
  bookCallTemplateId?: string;
}

export interface Brand extends BaseModel {
  name: string;
  image?: string;
  websiteUrl?: string;
}

export interface ServiceCategory extends BaseModel {
  name: string;
  icon?: string;
}

export interface ServiceItem extends BaseModel {
  serviceCategoryId: string | ServiceCategory;
  title: string;
  image?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface Video extends BaseModel {
  thumbnail?: string;
  url?: string;
}

export interface Client extends BaseModel {
  title: string;
  image?: string;
  description?: string;
  authorTemplateId?: string;
  bookCallTemplateId?: string;
}

export interface MarketingHouseCategory extends BaseModel {
  name: string;
  icon?: string;
}

export interface MarketingHouseItem extends BaseModel {
  marketing_house_category_id: string | MarketingHouseCategory;
  marketing_house_title: string;
  marketing_house_slug?: string;
  marketing_house_thumbnail?: string;
  marketing_house_video_url?: string;
  marketing_house_youtube_id?: string;
  marketing_house_description?: string;
  marketing_house_description2?: string;
}

export interface MarketingHouseImage extends BaseModel {
  marketing_house_item_id: string | MarketingHouseItem;
  image?: string;
  image_title?: string;
}

export interface MarketingHouseStatics extends BaseModel {
  marketing_house_item_id: string | MarketingHouseItem;
  statics_title?: string;
  statics_value?: string;
  statics_description?: string;
}

export interface CreativeHouseCategory extends BaseModel {
  creative_house_category_name: string;
}

export interface CreativeHouseItem extends BaseModel {
  creative_house_category_id: string | CreativeHouseCategory;
  creative_house_title: string;
  creative_house_slug?: string;
  creative_house_thumbnail?: string;
  creative_house_video_url?: string;
  creative_house_youtube_id?: string;
  creative_house_description?: string;
}

export interface BlogCategory extends BaseModel {
  category_name: string;
  category_slug?: string;
}

export interface BlogSubCategory extends BaseModel {
  blog_category_id: string | BlogCategory;
  sub_category_name: string;
  sub_category_slug?: string;
}

export interface BlogItem extends BaseModel {
  blog_category_id: string | BlogCategory;
  blog_sub_category_id?: string | BlogSubCategory;
  author_template_id?: string | AuthorTemplate;
  blog_title: string;
  blog_slug?: string;
  blog_thumbnail?: string;
  blog_content?: string;
  blog_meta_title?: string;
  blog_meta_description?: string;
  read_time?: string;
  published_at?: string;
}

export interface JobCategory extends BaseModel {
  category_name: string;
  category_slug?: string;
}

export interface JobList extends BaseModel {
  job_category_id?: string | JobCategory;
  job_title: string;
  job_slug?: string;
  job_description?: string;
  job_requirements?: string;
  job_type?: string;
  job_location?: string;
  state?: string;
  country?: string;
  experience?: string;
  salary_range?: string;
  no_of_openings?: number;
  application_deadline?: string;
}

export interface JobApplicant extends BaseModel {
  jobListId: string | JobList;
  name: string;
  email: string;
  phone?: string;
  resume?: string;
  coverLetter?: string;
  state?: string;
  country?: string;
  experience?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCtc?: string;
  annualCtc?: string;
  noticePeriodDays?: string;
  jobPrefrence?: string;
  workType?: string;
  applicationStatus: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
  isRead: number;
}

export interface GroupServiceCategory extends BaseModel {
  service_item_id?: string | ServiceItem;
  group_service_category_name: string;
}

export interface GroupServiceItem extends BaseModel {
  group_service_category_id: string | GroupServiceCategory;
  group_service_item_title: string;
  group_service_item_slug?: string;
  group_service_item_thumbnail?: string;
  group_service_item_description?: string;
}

export interface AuthorTemplate extends BaseModel {
  author_name: string;
  author_image?: string;
  author_designation?: string;
  author_bio?: string;
}

export interface BookCall extends BaseModel {
  book_call_title: string;
  book_call_subtitle?: string;
  book_call_button_text?: string;
  book_call_button_url?: string;
  book_call_image?: string;
}

export interface BannerTitleTemplate extends BaseModel {
  banner_title: string;
  banner_subtitle?: string;
  banner_image?: string;
  page_name?: string;
}

export interface UserChoice extends BaseModel {
  user_choice_title: string;
  user_choice_description?: string;
  user_choice_button_text?: string;
  user_choice_button_url?: string;
  user_choice_image?: string;
}

export interface OurAdvantage extends BaseModel {
  advantage_title: string;
  advantage_description?: string;
  advantage_icon?: string;
}

export interface Faq extends BaseModel {
  marketing_house_item_id?: string;
  slug?: string;
  question: string;
  answer: string;
}

export interface GroupServiceItemFaq extends BaseModel {
  group_service_item_id?: string;
  slug?: string;
  question: string;
  answer: string;
}

export interface ContactUs {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  is_read: number;
  createdAt: string;
}

export interface Gallery extends BaseModel {
  image: string;
  image_title?: string;
  image_description?: string;
}

export interface GalleryVideo extends BaseModel {
  video_thumbnail?: string;
  video_url: string;
  video_youtube_id?: string;
  video_title?: string;
}

export interface Page extends BaseModel {
  page_title: string;
  page_slug?: string;
  page_content?: string;
  meta_title?: string;
  meta_description?: string;
}

export interface HomePageSection extends BaseModel {
  name: string;
}

export interface HomePageSectionItem extends BaseModel {
  home_page_section_id: string | HomePageSection;
  item_title?: string;
  item_description?: string;
  item_image?: string;
  item_url?: string;
  item_button_text?: string;
}

export interface DashboardStats {
  totalBanner: { total: number; active: number; inactive: number };
  totalBrand: { total: number; active: number; inactive: number };
  totalServiceDept: { total: number; active: number; inactive: number };
  totalServiceCat: { total: number; active: number; inactive: number };
  totalVideo: { total: number; active: number; inactive: number };
  totalClient: { total: number; active: number; inactive: number };
  totalMarketingCategory: { total: number; active: number; inactive: number };
  totalMarketingItem: { total: number; active: number; inactive: number };
  totalCreativeCategory: { total: number; active: number; inactive: number };
  totalCreativeItem: { total: number; active: number; inactive: number };
  totalHireUs: { total: number; active: number; inactive: number };
  totalAuthor: { total: number; active: number; inactive: number };
  totalBookCall: { total: number; active: number; inactive: number };
  totalOurAdvantage: { total: number; active: number; inactive: number };
  totalCommonBanner: { total: number; active: number; inactive: number };
  totalConsultation: { total: number; active: number; inactive: number };
  totalBlogCategory: { total: number; active: number; inactive: number };
  totalBlogItem: { total: number; active: number; inactive: number };
  totalJobList: { total: number; active: number; inactive: number };
  totalApplicants: { total: number; active: number; inactive: number };
  totalContacts: { total: number; active: number; inactive: number };
}
