# Cocoma Digital — Node.js Backend API

## Prerequisites
- Node.js 18+
- MongoDB 6+
- AWS S3 bucket (cocomadigitalmediabucket, eu-west-1)

## Quick Start

### 1. Install Dependencies
```bash
cd cocoma-node-backend
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```
Edit `.env` with your values:
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/cocoma_digital_db
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-west-1
AWS_BUCKET_NAME=cocomadigitalmediabucket
AWS_URL=https://cocomadigitalmediabucket.s3.eu-west-1.amazonaws.com
ADMIN_EMAIL=admin@cocoma.com
ADMIN_PASSWORD=Admin@123456
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Seed Admin User
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```
Server runs on http://localhost:5000

## Project Structure
```
src/
├── server.js              # Entry point
├── config/
│   └── db.js              # MongoDB connection
├── models/                # 30+ Mongoose models
├── controllers/
│   ├── admin/             # Admin CRUD controllers (50+)
│   └── api/               # Public API controllers (10+)
├── routes/
│   ├── admin/             # Admin routes (50+ modules)
│   └── api/               # Public API routes
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── errorHandler.js    # Global error handler
├── utils/
│   ├── s3Upload.js        # AWS S3 helpers
│   ├── helpers.js         # Utilities (slug, pagination, etc.)
│   └── logger.js          # Winston logger
└── database/
    └── seed.js            # Database seeder
```

## API Authentication
- Admin routes use JWT Bearer token
- Login: `POST /admin/api/auth/login`
- Include header: `Authorization: Bearer <token>`

## Admin API Endpoints (Base: /admin/api)
```
POST   /auth/login
POST   /auth/logout
GET    /auth/me
POST   /auth/change-password

GET    /dashboard

GET/POST/PUT/DELETE  /top-banner
GET/POST/PUT/DELETE  /brands
GET/POST/PUT/DELETE  /service-category
GET/POST/PUT/DELETE  /service-item
GET/POST/PUT/DELETE  /video
GET/POST/PUT/DELETE  /client

GET/POST/PUT/DELETE  /marketing-house/category
GET/POST/PUT/DELETE  /marketing-house/item
GET/POST/PUT/DELETE  /marketing-house/image
GET/POST/PUT/DELETE  /marketing-house/statics
GET/POST/PUT/DELETE  /marketing-house/performance
GET/POST/PUT/DELETE  /marketing-house/pre-launch
GET/POST/PUT/DELETE  /marketing-house/idea-strategy
GET/POST/PUT/DELETE  /marketing-house/other-activity-category
GET/POST/PUT/DELETE  /marketing-house/other-activity-item
GET/POST/PUT/DELETE  /marketing-house/content-category
GET/POST/PUT/DELETE  /marketing-house/content-item
GET/POST/PUT/DELETE  /marketing-house/content-carousel
GET/POST/PUT/DELETE  /marketing-house/community-program
GET/POST/PUT/DELETE  /marketing-house/community-program-item
GET/POST/PUT/DELETE  /marketing-house/project
GET              /marketing-house/form
POST /marketing-house/wizard/step1..step7

GET/POST/PUT/DELETE  /creative-house/category
GET/POST/PUT/DELETE  /creative-house/item
GET/POST/PUT/DELETE  /creative-house/approach
GET/POST/PUT/DELETE  /creative-house/final-output
GET/POST/PUT/DELETE  /creative-house/project
POST /creative-house/wizard/step1..step3

GET/POST/PUT/DELETE  /development-house/category
GET/POST/PUT/DELETE  /development-house/item

GET/POST/PUT/DELETE  /group-service/top-banner
GET/POST/PUT/DELETE  /group-service/category
GET/POST/PUT/DELETE  /group-service/item
GET/POST/PUT/DELETE  /group-service/single-service-image
GET/POST/PUT/DELETE  /group-service/recent-work
GET/POST/PUT/DELETE  /group-service/portfolio-category
GET/POST/PUT/DELETE  /group-service/portfolio-item
GET/POST/PUT/DELETE  /creator-platform
GET/POST/PUT/DELETE  /success-stories
GET/POST/PUT/DELETE  /success-stories-project

GET/POST/PUT/DELETE  /blog/category
GET/POST/PUT/DELETE  /blog/sub-category
GET/POST/PUT/DELETE  /blog/item

GET/POST/PUT/DELETE  /job/category
GET/POST/PUT/DELETE  /job/list
GET              /job/applicant
GET              /job/applicant/all
GET              /job/applicant/:id

GET/POST/PUT/DELETE  /gallery/image
GET/POST/PUT/DELETE  /gallery/video

GET/POST/PUT/DELETE  /template/author
GET/POST/PUT/DELETE  /template/banner-title
GET/POST/PUT/DELETE  /template/book-call
GET/POST/PUT/DELETE  /template/user-choice
GET/POST/PUT/DELETE  /template/our-advantage
GET/POST/PUT/DELETE  /faq
GET/POST/PUT/DELETE  /group-service-item-faq
GET/POST/PUT/DELETE  /whatsapp-template
GET/POST/PUT/DELETE  /admin-post
GET/POST/PUT/DELETE  /page
GET              /contact-us
GET              /free-consultation/submissions
GET/POST/PUT/DELETE  /free-consultation/categories
GET/POST/PUT/DELETE  /home-page-section
GET/POST/PUT/DELETE  /home-page-section-item
```

## Public API Endpoints (Base: /api)
```
GET  /home
GET  /home/client
GET  /home/monthly-performance-showcase

GET  /service/service-home-priority
GET  /service/group-service/:service_slug
GET  /service/single-service/:group_service_slug
GET  /service/portfolio-items

GET  /creative
GET  /creative/filter-data
GET  /creative/items
GET  /creative/single/:creative_house_slug

GET  /marketing
GET  /marketing/filter-data
GET  /marketing/items
GET  /marketing/single/:marketing_house_slug
GET  /marketing/other-activity-items
GET  /marketing/continuity-program-items
GET  /marketing/content-created-carousels
GET  /marketing/content-created-items
POST /marketing/form

GET  /blog
GET  /blog/categories
GET  /blog/items
GET  /blog/items/:id
GET  /blog/detail/:blog_item_slug

GET  /job
GET  /job/list
GET  /job/detail/:job_slug
POST /job/applicants
GET  /job/applicants/:id

GET  /client/view-all
GET  /client/detail/:client_slug

POST /contact
POST /contact/free-consultation

GET  /common
GET  /common/brands
GET  /common/hire-us
GET  /common/author
GET  /common/banner-title
GET  /common/book-call
GET  /common/our-advantage
GET  /common/content-creator-platform
GET  /common/success-stories
GET  /common/categories
GET  /common/success-stories-view-all

GET  /home-page-sections
GET  /faqs
GET  /faqs/:slug
GET  /group-service/faqs/:slug
GET  /job-categories
```

## Query Parameters (all list endpoints)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term
- `status` - Filter by status (0 or 1)
- Parent ID field for nested resources (e.g., `marketing_house_item_id`)

## File Uploads
All image/file fields use AWS S3. Send as `multipart/form-data`.
File fields by module are documented in individual controller files.

## Deployment
1. Set `NODE_ENV=production` in `.env`
2. Run `npm start`
3. Use PM2 for process management: `pm2 start src/server.js --name cocoma-api`
