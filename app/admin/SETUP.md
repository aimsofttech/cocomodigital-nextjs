# Cocoma Digital — React Admin Panel

## Prerequisites
- Node.js 18+
- The Node.js backend running on port 5000

## Quick Start

### 1. Install Dependencies
```bash
cd cocoma-react-admin
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```
Edit `.env`:
```
VITE_API_URL=http://localhost:5000
```
For production, set to your deployed API URL.

### 3. Start Development Server
```bash
npm run dev
```
App runs on http://localhost:3000

### 4. Build for Production
```bash
npm run build
```
Output in `dist/` folder.

## Login
Use the admin credentials you created with the backend seeder:
- Email: admin@cocoma.com (or your configured email)
- Password: Admin@123456 (or your configured password)

## Project Structure
```
src/
├── app/
│   ├── store.ts           # Redux store
│   └── hooks.ts           # Typed Redux hooks
├── features/
│   └── auth/
│       └── authSlice.ts   # Authentication state
├── components/
│   ├── layout/
│   │   ├── Layout.tsx     # Main layout wrapper
│   │   ├── Sidebar.tsx    # Navigation sidebar
│   │   └── Header.tsx     # Top header bar
│   └── ui/
│       ├── DataTable.tsx  # Reusable data table with pagination
│       ├── Modal.tsx      # Dialog modal
│       ├── ConfirmDialog.tsx # Delete confirmation
│       ├── ImageUpload.tsx  # Image upload with preview
│       ├── PageHeader.tsx   # Page title + breadcrumbs
│       ├── CrudListPage.tsx # Generic CRUD list page
│       └── StatusBadge.tsx  # Active/Inactive badge
├── pages/
│   ├── auth/Login.tsx           # Login page (COMPLETE)
│   ├── dashboard/Dashboard.tsx  # Dashboard (COMPLETE)
│   ├── home/
│   │   ├── TopBannerList.tsx    # COMPLETE
│   │   ├── TopBannerForm.tsx    # COMPLETE
│   │   ├── BrandList.tsx        # COMPLETE
│   │   ├── BrandForm.tsx        # COMPLETE
│   │   └── ...                  # Other home pages
│   ├── marketingHouse/
│   │   ├── CategoryList.tsx     # COMPLETE
│   │   ├── ItemList.tsx         # COMPLETE
│   │   ├── ItemForm.tsx         # COMPLETE (with category dropdown, YouTube)
│   │   ├── FormList.tsx         # COMPLETE (read-only form submissions)
│   │   └── ...                  # Other marketing pages (stub)
│   ├── creativeHouse/           # Creative house pages
│   ├── developmentHouse/        # Dev house pages
│   ├── groupService/            # Group service pages
│   ├── blog/
│   │   ├── ItemForm.tsx         # COMPLETE (full blog editor)
│   │   └── ...
│   ├── jobs/
│   │   ├── ApplicantList.tsx    # COMPLETE
│   │   ├── ApplicantDetail.tsx  # COMPLETE (with status update)
│   │   └── ...
│   ├── gallery/                 # Gallery pages
│   ├── templates/               # Template pages
│   ├── contact/
│   │   ├── ContactUsList.tsx    # COMPLETE (with view modal)
│   │   └── FreeConsultationList.tsx
│   └── settings/                # Settings pages
├── services/
│   ├── api.ts             # Axios instance with JWT interceptor
│   └── adminApi.ts        # All API service functions
├── hooks/
│   └── useCrud.ts         # Generic CRUD hook
├── types/
│   └── index.ts           # TypeScript interfaces for all models
└── utils/
```

## Completing the Stub Pages
Most CRUD pages are generated as stubs. To complete a stub:

### List Page Example
```tsx
// Replace the placeholder service with the real API service:
import { brandApi } from '@/services/adminApi';

const { data, loading, submitting, pagination, remove, setSearch, setPage } = useCrud(brandApi);

// Define columns matching your data model:
const columns = [
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'status', label: 'Status', render: (row: any) => <StatusBadge status={row.status} /> },
];
```

### Form Page Example
```tsx
// Load existing data in useEffect, submit via API:
useEffect(() => {
  if (isEdit && id) {
    brandApi.getOne(id).then(({ data }) => reset(data.data));
  }
}, [id]);

const onSubmit = async (formData: any) => {
  const fd = new FormData();
  // ...append fields
  if (isEdit) await brandApi.update(id, fd);
  else await brandApi.create(fd);
};
```

## Available API Services (src/services/adminApi.ts)
All services expose: `getAll(params)`, `getOne(id)`, `create(data)`, `update(id, data)`, `delete(id)`

- `topBannerApi` - Top banners
- `brandApi` - Brands
- `serviceCategoryApi` - Service categories
- `serviceItemApi` - Service items
- `videoApi` - Videos
- `clientApi` - Clients
- `marketingHouseCategoryApi` - Marketing categories
- `marketingHouseItemApi` + `bulkUpload()` - Marketing items
- `marketingHouseImageApi` - Marketing images
- `marketingHouseStaticsApi` - Statistics
- `marketingHousePerformanceApi` - Performance data
- `marketingHousePreLaunchApi` - Pre-launch activities
- `marketingHouseIdeaStrategyApi` - Idea strategy
- `marketingHouseOtherActivityCategoryApi` - Other activity categories
- `marketingHouseOtherActivityItemApi` - Other activity items
- `marketingHouseContentCategoryApi` - Content categories
- `marketingHouseContentItemApi` + `bulkUpload()` - Content items
- `marketingHouseContentCarouselApi` - Content carousels
- `marketingHouseCommunityProgramApi` - Community programs
- `marketingHouseCommunityProgramItemApi` + `bulkUpload()` - Community items
- `marketingHouseProjectApi` - Marketing projects
- `marketingFormApi` - Form submissions (read-only)
- `creativeHouseCategoryApi` - Creative categories
- `creativeHouseItemApi` + `bulkUpload()` - Creative items
- `creativeHouseApproachApi` - Creative approaches
- `creativeHouseFinalOutputApi` - Final outputs
- `creativeHouseProjectApi` - Creative projects
- `devHouseCategoryApi` - Dev house categories
- `devHouseItemApi` - Dev house items
- `groupTopBannerApi` - Group top banners
- `groupServiceCategoryApi` - Group service categories
- `groupServiceItemApi` + `getByCategory()` - Group service items
- `groupSingleServiceImageApi` - Single service images
- `groupRecentWorkApi` - Recent work
- `groupPortfolioCategoryApi` - Portfolio categories
- `groupPortfolioItemApi` - Portfolio items
- `creatorPlatformApi` - Creator platforms
- `successStoriesApi` - Success stories
- `successStoriesProjectApi` - Success story projects
- `groupServiceItemFaqApi` - Group service FAQs
- `monthlyPerformanceCategoryApi` - MPS categories
- `monthlyPerformanceSubcategoryApi` - MPS subcategories
- `monthlyPerformanceItemApi` - MPS items
- `socialWorkCategoryApi` - Social work categories
- `socialWorkItemApi` - Social work items
- `blogCategoryApi` - Blog categories
- `blogSubCategoryApi` - Blog sub categories
- `blogItemApi` - Blog posts
- `jobCategoryApi` - Job categories
- `jobListApi` + `bulkUpload()` - Job listings
- `jobApplicantApi` - Applicants (with status update, bulk delete)
- `galleryImageApi` - Gallery images
- `galleryVideoApi` - Gallery videos
- `authorTemplateApi` - Author templates
- `bannerTitleTemplateApi` - Banner titles
- `bookCallApi` - Book call CTAs
- `userChoiceApi` - User choices (Hire Us)
- `ourAdvantageApi` - Our advantages
- `faqApi` - FAQs
- `whatsappTemplateApi` - WhatsApp templates
- `adminPostApi` - Admin posts
- `pageApi` - CMS pages
- `contactUsApi` - Contact submissions
- `freeConsultationApi` - Free consultation
- `homePageSectionApi` - Home page sections
- `homePageSectionItemApi` - Section items

## Deployment
```bash
npm run build
# Serve the dist/ folder via Nginx or any static host
```

Nginx config example:
```nginx
location / {
  root /var/www/cocoma-admin/dist;
  try_files $uri /index.html;
}
location /admin/api/ { proxy_pass http://localhost:5000; }
location /api/ { proxy_pass http://localhost:5000; }
```
