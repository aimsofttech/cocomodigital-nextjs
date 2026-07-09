import api from './api';

const BASE = '/admin/api';

// Generic CRUD service factory
export const createCrudService = (endpoint: string) => ({
  getAll: (params?: Record<string, any>) =>
    api.get(`${BASE}/${endpoint}`, { params }),
  getOne: (id: string) =>
    api.get(`${BASE}/${endpoint}/${id}`),
  create: (data: FormData | Record<string, any>) =>
    api.post(`${BASE}/${endpoint}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
  update: (id: string, data: FormData | Record<string, any>) =>
    api.put(`${BASE}/${endpoint}/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
  delete: (id: string) =>
    api.delete(`${BASE}/${endpoint}/${id}`),
  // Bulk CSV/XLSX export (download) and create-only import. Available on every
  // module built from createCrudController on the API side.
  exportCsv: (params?: Record<string, any>) =>
    api.get(`${BASE}/${endpoint}/export/csv`, { params, responseType: 'blob' }),
  importCsv: (data: FormData) =>
    api.post(`${BASE}/${endpoint}/import/csv`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
});

// Specific services
export const dashboardApi = { getStats: () => api.get(`${BASE}/dashboard`) };

export const topBannerApi = createCrudService('top-banner');
export const brandApi = createCrudService('brands');
export const serviceCategoryApi = createCrudService('service-department');
export const growthStatApi = createCrudService('growth-stats');
export const serviceItemApi = createCrudService('service-category');
export const videoApi = createCrudService('video');
export const clientApi = createCrudService('client');

export const marketingHouseCategoryApi = createCrudService('marketing-house/category');
export const marketingHouseItemApi = {
  ...createCrudService('marketing-house/item'),
  bulkUpload: (data: FormData) =>
    api.post(`${BASE}/marketing-house/item/bulk-upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const marketingHouseImageApi = createCrudService('marketing-house/image');
export const marketingHouseStaticsApi = createCrudService('marketing-house/statics');
export const marketingHousePerformanceApi = createCrudService('marketing-house/performance');
export const marketingHouseIdeaStrategyApi = createCrudService('marketing-house/idea-strategy');
export const marketingHouseOtherActivityCategoryApi = createCrudService('marketing-house/other-activity-category');
export const marketingHouseOtherActivityItemApi = createCrudService('marketing-house/other-activity-item');
export const marketingHouseContentCategoryApi = createCrudService('marketing-house/content-category');
export const marketingHouseContentItemApi = {
  ...createCrudService('marketing-house/content-item'),
  bulkUpload: (data: FormData) =>
    api.post(`${BASE}/marketing-house/content-item/bulk-upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const marketingHouseContentCarouselApi = createCrudService('marketing-house/content-carousel');
export const marketingHouseCommunityProgramApi = createCrudService('marketing-house/community-program');
export const marketingHouseCommunityProgramItemApi = {
  ...createCrudService('marketing-house/community-program-item'),
  bulkUpload: (data: FormData) =>
    api.post(`${BASE}/marketing-house/community-program-item/bulk-upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const marketingHouseProjectApi = createCrudService('marketing-house/project');
export const marketingHouseFaqApi = createCrudService('marketing-house/faq');

// Bulk upload — create many complete Marketing Campaigns records (item + all related
// sections) from a single CSV/XLSX file. `validate` is a dry run; `importBulk`
// writes; `downloadTemplate` returns a sample CSV blob.
export const marketingHouseBulkUploadApi = {
  downloadTemplate: () =>
    api.get(`${BASE}/marketing-house/bulk-upload/template`, { responseType: 'blob' }),
  validate: (data: FormData) =>
    api.post(`${BASE}/marketing-house/bulk-upload/validate`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importBulk: (data: FormData) =>
    api.post(`${BASE}/marketing-house/bulk-upload/import`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
export const marketingFormApi = {
  getAll: (params?: Record<string, any>) => api.get(`${BASE}/marketing-house/form`, { params }),
  markRead: (id: string) => api.put(`${BASE}/marketing-house/form/${id}/mark-read`),
  delete: (id: string) => api.delete(`${BASE}/marketing-house/form/${id}`),
};

export const creativeHouseCategoryApi = createCrudService('creative-house/category');
export const creativeHouseItemApi = {
  ...createCrudService('creative-house/item'),
  bulkUpload: (data: FormData) =>
    api.post(`${BASE}/creative-house/item/bulk-upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const creativeHouseApproachApi = createCrudService('creative-house/approach');
export const creativeHouseFinalOutputApi = createCrudService('creative-house/final-output');
export const creativeHouseProjectApi = createCrudService('creative-house/project');

export const devHouseCategoryApi = createCrudService('development-house/category');
export const devHouseItemApi = createCrudService('development-house/item');

export const groupTopBannerApi = createCrudService('group-service/top-banner');
export const groupServiceCategoryApi = createCrudService('group-service/category');
export const groupServiceItemApi = {
  ...createCrudService('group-service/item'),
  getByCategory: (categoryId: string) => api.get(`${BASE}/group-service/item/service-items/${categoryId}`),
};
export const groupSingleServiceImageApi = createCrudService('group-service/single-service-image');
export const groupRecentWorkApi = createCrudService('group-service/recent-work');
export const groupPortfolioCategoryApi = createCrudService('group-service/portfolio-category');
export const groupPortfolioItemApi = createCrudService('group-service/portfolio-item');
export const creatorPlatformApi = createCrudService('creator-platform');
export const successStoriesApi = createCrudService('success-stories');
export const successStoriesProjectApi = createCrudService('success-stories-project');
export const groupServiceItemFaqApi = createCrudService('group-service-item-faq');

export const monthlyPerformanceCategoryApi = createCrudService('monthly-performance/category');
export const monthlyPerformanceSubcategoryApi = createCrudService('monthly-performance/subcategory');
export const monthlyPerformanceItemApi = createCrudService('monthly-performance/item');
export const socialWorkCategoryApi = createCrudService('social-work/category');
export const socialWorkItemApi = createCrudService('social-work/item');

export const blogCategoryApi = createCrudService('blog/category');
export const blogSubCategoryApi = createCrudService('blog/sub-category');
export const blogItemApi = createCrudService('blog/item');

export const jobCategoryApi = createCrudService('job/category');
export const jobListApi = {
  ...createCrudService('job/list'),
  bulkUpload: (data: FormData) =>
    api.post(`${BASE}/job/list/bulk-upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const jobApplicantApi = {
  getAll: (params?: Record<string, any>) => api.get(`${BASE}/job/applicant`, { params }),
  getAllApplications: (params?: Record<string, any>) => api.get(`${BASE}/job/applicant/all`, { params }),
  getOne: (id: string) => api.get(`${BASE}/job/applicant/${id}`),
  updateStatus: (id: string, status: string) => api.put(`${BASE}/job/applicant/${id}/status`, { applicationStatus: status }),
  bulkDelete: (ids: string[]) => api.post(`${BASE}/job/applicant/bulk-delete`, { ids }),
  remove: (id: string) => api.delete(`${BASE}/job/applicant/${id}`),
};

export const galleryImageApi = createCrudService('gallery/image');
export const galleryVideoApi = createCrudService('gallery/video');

export const authorTemplateApi = createCrudService('template/author');
export const bannerTitleTemplateApi = createCrudService('template/banner-title');
export const bookCallApi = createCrudService('template/book-call');
export const userChoiceApi = createCrudService('template/user-choice');
export const ourAdvantageApi = createCrudService('template/our-advantage');
export const faqApi = createCrudService('faq');
export const whatsappTemplateApi = createCrudService('whatsapp-template');
export const adminPostApi = createCrudService('admin-post');
export const pageApi = createCrudService('page');

export const contactUsApi = {
  getAll: (params?: Record<string, any>) => api.get(`${BASE}/contact-us`, { params }),
  getOne: (id: string) => api.get(`${BASE}/contact-us/${id}`),
  delete: (id: string) => api.delete(`${BASE}/contact-us/${id}`),
};
export const freeConsultationApi = {
  getCategories: () => api.get(`${BASE}/free-consultation/categories`),
  getSubmissions: (params?: Record<string, any>) => api.get(`${BASE}/free-consultation/submissions`, { params }),
  createCategory: (data: Record<string, any>) => api.post(`${BASE}/free-consultation/categories`, data),
  updateCategory: (id: string, data: Record<string, any>) => api.put(`${BASE}/free-consultation/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`${BASE}/free-consultation/categories/${id}`),
  deleteSubmission: (id: string) => api.delete(`${BASE}/free-consultation/submissions/${id}`),
};

export const homePageSectionApi = createCrudService('home-page-section');
export const homePageSectionItemApi = createCrudService('home-page-section-item');

export const meetingApi = {
  getAll: (params?: Record<string, any>) => api.get(`${BASE}/meetings`, { params }),
  getStats: () => api.get(`${BASE}/meetings/stats`),
  getOne: (id: string) => api.get(`${BASE}/meetings/${id}`),
  confirm: (id: string) => api.put(`${BASE}/meetings/${id}/confirm`),
  reject: (id: string) => api.put(`${BASE}/meetings/${id}/reject`),
  reschedule: (id: string, data: { meetingDate: string; meetingTime: string }) =>
    api.put(`${BASE}/meetings/${id}/reschedule`, data),
  getAssignees: () => api.get(`${BASE}/meetings/assignees`),
  assign: (id: string, data: { name: string; email: string }) =>
    api.put(`${BASE}/meetings/${id}/assign`, data),
  checkAvailability: (params: { date: string; timezone?: string; excludeId?: string }) =>
    api.get(`${BASE}/meetings/availability`, { params }),
  updateStatus: (id: string, status: string) => api.put(`${BASE}/meetings/${id}/status`, { status }),
  delete: (id: string) => api.delete(`${BASE}/meetings/${id}`),
};
