import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import Layout from '@/components/layout/Layout';
import AppLoader from '@/components/ui/AppLoader';

// Auth
const Login = lazy(() => import('@/pages/auth/Login'));

// Dashboard
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));

// Home
const TopBannerList = lazy(() => import('@/pages/home/TopBannerList'));
const TopBannerForm = lazy(() => import('@/pages/home/TopBannerForm'));
const BrandList = lazy(() => import('@/pages/home/BrandList'));
const BrandForm = lazy(() => import('@/pages/home/BrandForm'));
const ServiceDepartmentList = lazy(() => import('@/pages/home/ServiceDepartmentList'));
const ServiceDepartmentForm = lazy(() => import('@/pages/home/ServiceDepartmentForm'));
const ServiceItemList = lazy(() => import('@/pages/home/ServiceItemList'));
const ServiceItemForm = lazy(() => import('@/pages/home/ServiceItemForm'));
const VideoList = lazy(() => import('@/pages/home/VideoList'));
const VideoForm = lazy(() => import('@/pages/home/VideoForm'));
const ClientList = lazy(() => import('@/pages/home/ClientList'));
const ClientForm = lazy(() => import('@/pages/home/ClientForm'));

// Marketing House
const MarketingCategoryList = lazy(() => import('@/pages/marketingHouse/CategoryList'));
const MarketingCategoryForm = lazy(() => import('@/pages/marketingHouse/CategoryForm'));
const MarketingItemList = lazy(() => import('@/pages/marketingHouse/ItemList'));
const MarketingItemForm = lazy(() => import('@/pages/marketingHouse/ItemForm'));
const MarketingHighlightsList = lazy(() => import('@/pages/marketingHouse/HighlightsList'));
const MarketingImageList = lazy(() => import('@/pages/marketingHouse/ImageList'));
const MarketingImageForm = lazy(() => import('@/pages/marketingHouse/ImageForm'));
const MarketingPosterMediaList = lazy(() => import('@/pages/marketingHouse/PosterMediaList'));
const MarketingIdeaStrategyPlanningList = lazy(() => import('@/pages/marketingHouse/IdeaStrategyPlanningList'));
const MarketingPreLaunchActivityList = lazy(() => import('@/pages/marketingHouse/PreLaunchActivityList'));
const MarketingPerformanceModuleList = lazy(() => import('@/pages/marketingHouse/PerformanceModuleList'));
const MarketingOtherActivityCategoryModuleList = lazy(() => import('@/pages/marketingHouse/OtherActivityCategoryModuleList'));
const MarketingOtherActivityItemModuleList = lazy(() => import('@/pages/marketingHouse/OtherActivityItemModuleList'));
const MarketingContentCategoryModuleList = lazy(() => import('@/pages/marketingHouse/ContentCategoryModuleList'));
const MarketingContentItemModuleList = lazy(() => import('@/pages/marketingHouse/ContentItemModuleList'));
const MarketingCommunityProgramModuleList = lazy(() => import('@/pages/marketingHouse/CommunityProgramModuleList'));
const MarketingCommunityProgramItemModuleList = lazy(() => import('@/pages/marketingHouse/CommunityProgramItemModuleList'));
const MarketingFaqList = lazy(() => import('@/pages/marketingHouse/MarketingFaqList'));
const MarketingStaticsList = lazy(() => import('@/pages/marketingHouse/StaticsList'));
const MarketingStaticsForm = lazy(() => import('@/pages/marketingHouse/StaticsForm'));
const MarketingPerformanceList = lazy(() => import('@/pages/marketingHouse/PerformanceList'));
const MarketingPerformanceForm = lazy(() => import('@/pages/marketingHouse/PerformanceForm'));
const MarketingPreLaunchList = lazy(() => import('@/pages/marketingHouse/PreLaunchList'));
const MarketingPreLaunchForm = lazy(() => import('@/pages/marketingHouse/PreLaunchForm'));
const MarketingIdeaStrategyList = lazy(() => import('@/pages/marketingHouse/IdeaStrategyList'));
const MarketingIdeaStrategyForm = lazy(() => import('@/pages/marketingHouse/IdeaStrategyForm'));
const MarketingOtherActivityCategoryList = lazy(() => import('@/pages/marketingHouse/OtherActivityCategoryList'));
const MarketingOtherActivityCategoryForm = lazy(() => import('@/pages/marketingHouse/OtherActivityCategoryForm'));
const MarketingOtherActivityItemList = lazy(() => import('@/pages/marketingHouse/OtherActivityItemList'));
const MarketingOtherActivityItemForm = lazy(() => import('@/pages/marketingHouse/OtherActivityItemForm'));
const MarketingContentCategoryList = lazy(() => import('@/pages/marketingHouse/ContentCategoryList'));
const MarketingContentCategoryForm = lazy(() => import('@/pages/marketingHouse/ContentCategoryForm'));
const MarketingContentItemList = lazy(() => import('@/pages/marketingHouse/ContentItemList'));
const MarketingContentItemForm = lazy(() => import('@/pages/marketingHouse/ContentItemForm'));
const MarketingContentCarouselList = lazy(() => import('@/pages/marketingHouse/ContentCarouselList'));
const MarketingContentCarouselForm = lazy(() => import('@/pages/marketingHouse/ContentCarouselForm'));
const MarketingCommunityProgramList = lazy(() => import('@/pages/marketingHouse/CommunityProgramList'));
const MarketingCommunityProgramForm = lazy(() => import('@/pages/marketingHouse/CommunityProgramForm'));
const MarketingCommunityProgramItemList = lazy(() => import('@/pages/marketingHouse/CommunityProgramItemList'));
const MarketingCommunityProgramItemForm = lazy(() => import('@/pages/marketingHouse/CommunityProgramItemForm'));
const MarketingProjectList = lazy(() => import('@/pages/marketingHouse/ProjectList'));
const MarketingProjectForm = lazy(() => import('@/pages/marketingHouse/ProjectForm'));
const MarketingFormList = lazy(() => import('@/pages/marketingHouse/FormList'));
const MarketingWizard = lazy(() => import('@/pages/marketingHouse/Wizard'));

// Creative House
const CreativeCategoryList = lazy(() => import('@/pages/creativeHouse/CategoryList'));
const CreativeCategoryForm = lazy(() => import('@/pages/creativeHouse/CategoryForm'));
const CreativeItemList = lazy(() => import('@/pages/creativeHouse/ItemList'));
const CreativeItemForm = lazy(() => import('@/pages/creativeHouse/ItemForm'));
const CreativeApproachList = lazy(() => import('@/pages/creativeHouse/ApproachList'));
const CreativeApproachForm = lazy(() => import('@/pages/creativeHouse/ApproachForm'));
const CreativeFinalOutputList = lazy(() => import('@/pages/creativeHouse/FinalOutputList'));
const CreativeFinalOutputForm = lazy(() => import('@/pages/creativeHouse/FinalOutputForm'));
const CreativeProjectList = lazy(() => import('@/pages/creativeHouse/ProjectList'));
const CreativeProjectForm = lazy(() => import('@/pages/creativeHouse/ProjectForm'));
const CreativeWizard = lazy(() => import('@/pages/creativeHouse/Wizard'));

// Development House
const DevCategoryList = lazy(() => import('@/pages/developmentHouse/CategoryList'));
const DevCategoryForm = lazy(() => import('@/pages/developmentHouse/CategoryForm'));
const DevItemList = lazy(() => import('@/pages/developmentHouse/ItemList'));
const DevItemForm = lazy(() => import('@/pages/developmentHouse/ItemForm'));

// Group Service
const GroupTopBannerList = lazy(() => import('@/pages/groupService/TopBannerList'));
const GroupTopBannerForm = lazy(() => import('@/pages/groupService/TopBannerForm'));
const GroupServiceCategoryList = lazy(() => import('@/pages/groupService/ServiceCategoryList'));
const GroupServiceCategoryForm = lazy(() => import('@/pages/groupService/ServiceCategoryForm'));
const GroupServiceItemList = lazy(() => import('@/pages/groupService/ServiceItemList'));
const GroupServiceItemForm = lazy(() => import('@/pages/groupService/ServiceItemForm'));
const GroupSingleServiceImageList = lazy(() => import('@/pages/groupService/SingleServiceImageList'));
const GroupSingleServiceImageForm = lazy(() => import('@/pages/groupService/SingleServiceImageForm'));
const GroupRecentWorkList = lazy(() => import('@/pages/groupService/RecentWorkList'));
const GroupRecentWorkForm = lazy(() => import('@/pages/groupService/RecentWorkForm'));
const GroupPortfolioCategoryList = lazy(() => import('@/pages/groupService/PortfolioCategoryList'));
const GroupPortfolioCategoryForm = lazy(() => import('@/pages/groupService/PortfolioCategoryForm'));
const GroupPortfolioItemList = lazy(() => import('@/pages/groupService/PortfolioItemList'));
const GroupPortfolioItemForm = lazy(() => import('@/pages/groupService/PortfolioItemForm'));
const CreatorPlatformList = lazy(() => import('@/pages/groupService/CreatorPlatformList'));
const CreatorPlatformForm = lazy(() => import('@/pages/groupService/CreatorPlatformForm'));
const SuccessStoriesList = lazy(() => import('@/pages/groupService/SuccessStoriesList'));
const SuccessStoriesForm = lazy(() => import('@/pages/groupService/SuccessStoriesForm'));
const GroupServiceItemFaqList = lazy(() => import('@/pages/groupService/FaqList'));
const GroupServiceItemFaqForm = lazy(() => import('@/pages/groupService/FaqForm'));

// Blog
const BlogCategoryList = lazy(() => import('@/pages/blog/CategoryList'));
const BlogCategoryForm = lazy(() => import('@/pages/blog/CategoryForm'));
const BlogSubCategoryList = lazy(() => import('@/pages/blog/SubCategoryList'));
const BlogSubCategoryForm = lazy(() => import('@/pages/blog/SubCategoryForm'));
const BlogItemList = lazy(() => import('@/pages/blog/ItemList'));
const BlogItemForm = lazy(() => import('@/pages/blog/ItemForm'));

// Jobs
const JobCategoryList = lazy(() => import('@/pages/jobs/CategoryList'));
const JobCategoryForm = lazy(() => import('@/pages/jobs/CategoryForm'));
const JobListPage = lazy(() => import('@/pages/jobs/JobListPage'));
const JobListForm = lazy(() => import('@/pages/jobs/JobListForm'));
const JobApplicantList = lazy(() => import('@/pages/jobs/ApplicantList'));
const JobApplicantDetail = lazy(() => import('@/pages/jobs/ApplicantDetail'));

// Gallery
const GalleryImageList = lazy(() => import('@/pages/gallery/ImageList'));
const GalleryImageForm = lazy(() => import('@/pages/gallery/ImageForm'));
const GalleryVideoList = lazy(() => import('@/pages/gallery/VideoList'));
const GalleryVideoForm = lazy(() => import('@/pages/gallery/VideoForm'));

// Templates
const AuthorTemplateList = lazy(() => import('@/pages/templates/AuthorList'));
const AuthorTemplateForm = lazy(() => import('@/pages/templates/AuthorForm'));
const BannerTitleList = lazy(() => import('@/pages/templates/BannerTitleList'));
const BannerTitleForm = lazy(() => import('@/pages/templates/BannerTitleForm'));
const BookCallList = lazy(() => import('@/pages/templates/BookCallList'));
const BookCallForm = lazy(() => import('@/pages/templates/BookCallForm'));
const UserChoiceList = lazy(() => import('@/pages/templates/UserChoiceList'));
const UserChoiceForm = lazy(() => import('@/pages/templates/UserChoiceForm'));
const OurAdvantageList = lazy(() => import('@/pages/templates/OurAdvantageList'));
const OurAdvantageForm = lazy(() => import('@/pages/templates/OurAdvantageForm'));
const SuccessStoriesProjectList = lazy(() => import('@/pages/templates/SuccessStoriesProjectList'));
const SuccessStoriesProjectForm = lazy(() => import('@/pages/templates/SuccessStoriesProjectForm'));
const FaqList = lazy(() => import('@/pages/templates/FaqList'));
const FaqForm = lazy(() => import('@/pages/templates/FaqForm'));
const WhatsappTemplateList = lazy(() => import('@/pages/templates/WhatsappTemplateList'));
const WhatsappTemplateForm = lazy(() => import('@/pages/templates/WhatsappTemplateForm'));
const AdminPostList = lazy(() => import('@/pages/templates/AdminPostList'));
const AdminPostForm = lazy(() => import('@/pages/templates/AdminPostForm'));
const PageList = lazy(() => import('@/pages/templates/PageList'));
const PageForm = lazy(() => import('@/pages/templates/PageForm'));

// Contact
const ContactUsList = lazy(() => import('@/pages/contact/ContactUsList'));
const FreeConsultationList = lazy(() => import('@/pages/contact/FreeConsultationList'));

// Home Page Sections
const HomePageSectionList = lazy(() => import('@/pages/settings/HomePageSectionList'));
const HomePageSectionForm = lazy(() => import('@/pages/settings/HomePageSectionForm'));
const HomePageSectionItemList = lazy(() => import('@/pages/settings/HomePageSectionItemList'));
const HomePageSectionItemForm = lazy(() => import('@/pages/settings/HomePageSectionItemForm'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAppSelector((state) => state.auth);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAppSelector((state) => state.auth);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Listens for 401 session-expiry events from the Axios interceptor
  // and navigates to /login WITHOUT a full browser page refresh
  useEffect(() => {
    const handleAuthLogout = () => {
      dispatch(logout());
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [dispatch, navigate]);

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Home */}
          <Route path="home/top-banner" element={<TopBannerList />} />
          <Route path="home/top-banner/add" element={<TopBannerForm />} />
          <Route path="home/top-banner/edit/:id" element={<TopBannerForm />} />
          <Route path="home/brands" element={<BrandList />} />
          <Route path="home/brands/add" element={<BrandForm />} />
          <Route path="home/brands/edit/:id" element={<BrandForm />} />
          <Route path="home/service-department" element={<ServiceDepartmentList />} />
          <Route path="home/service-department/add" element={<ServiceDepartmentForm />} />
          <Route path="home/service-department/edit/:id" element={<ServiceDepartmentForm />} />
          <Route path="home/service-category" element={<ServiceItemList />} />
          <Route path="home/service-category/add" element={<ServiceItemForm />} />
          <Route path="home/service-category/edit/:id" element={<ServiceItemForm />} />
          <Route path="home/video" element={<VideoList />} />
          <Route path="home/video/add" element={<VideoForm />} />
          <Route path="home/video/edit/:id" element={<VideoForm />} />
          <Route path="home/client" element={<ClientList />} />
          <Route path="home/client/add" element={<ClientForm />} />
          <Route path="home/client/edit/:id" element={<ClientForm />} />

          {/* Marketing House */}
          <Route path="marketing/category" element={<MarketingCategoryList />} />
          <Route path="marketing/category/add" element={<MarketingCategoryForm />} />
          <Route path="marketing/category/edit/:id" element={<MarketingCategoryForm />} />
          <Route path="marketing/item" element={<MarketingItemList />} />
          <Route path="marketing/highlights" element={<MarketingHighlightsList />} />
          <Route path="marketing/poster-media" element={<MarketingPosterMediaList />} />
          <Route path="marketing/idea-strategy-planning" element={<MarketingIdeaStrategyPlanningList />} />
          <Route path="marketing/pre-launch-activity" element={<MarketingPreLaunchActivityList />} />
          <Route path="marketing/performance" element={<MarketingPerformanceModuleList />} />
          <Route path="marketing/other-activity-category" element={<MarketingOtherActivityCategoryModuleList />} />
          <Route path="marketing/other-activity-item" element={<MarketingOtherActivityItemModuleList />} />
          <Route path="marketing/content-category" element={<MarketingContentCategoryModuleList />} />
          <Route path="marketing/content-item" element={<MarketingContentItemModuleList />} />
          <Route path="marketing/community-program" element={<MarketingCommunityProgramModuleList />} />
          <Route path="marketing/community-program-item" element={<MarketingCommunityProgramItemModuleList />} />
          <Route path="marketing/faq" element={<MarketingFaqList />} />
          <Route path="marketing/item/add" element={<MarketingItemForm />} />
          <Route path="marketing/item/edit/:id" element={<MarketingItemForm />} />
          <Route path="marketing/item/:itemId/images" element={<MarketingImageList />} />
          <Route path="marketing/item/:itemId/images/add" element={<MarketingImageForm />} />
          <Route path="marketing/item/:itemId/images/edit/:id" element={<MarketingImageForm />} />
          <Route path="marketing/item/:itemId/statics" element={<MarketingStaticsList />} />
          <Route path="marketing/item/:itemId/statics/add" element={<MarketingStaticsForm />} />
          <Route path="marketing/item/:itemId/statics/edit/:id" element={<MarketingStaticsForm />} />
          <Route path="marketing/item/:itemId/performance" element={<MarketingPerformanceList />} />
          <Route path="marketing/item/:itemId/performance/add" element={<MarketingPerformanceForm />} />
          <Route path="marketing/item/:itemId/performance/edit/:id" element={<MarketingPerformanceForm />} />
          <Route path="marketing/item/:itemId/pre-launch" element={<MarketingPreLaunchList />} />
          <Route path="marketing/item/:itemId/pre-launch/add" element={<MarketingPreLaunchForm />} />
          <Route path="marketing/item/:itemId/pre-launch/edit/:id" element={<MarketingPreLaunchForm />} />
          <Route path="marketing/item/:itemId/idea-strategy" element={<MarketingIdeaStrategyList />} />
          <Route path="marketing/item/:itemId/idea-strategy/add" element={<MarketingIdeaStrategyForm />} />
          <Route path="marketing/item/:itemId/idea-strategy/edit/:id" element={<MarketingIdeaStrategyForm />} />
          <Route path="marketing/item/:itemId/other-activity-category" element={<MarketingOtherActivityCategoryList />} />
          <Route path="marketing/item/:itemId/other-activity-category/add" element={<MarketingOtherActivityCategoryForm />} />
          <Route path="marketing/item/:itemId/other-activity-category/edit/:id" element={<MarketingOtherActivityCategoryForm />} />
          <Route path="marketing/item/:itemId/other-activity-item" element={<MarketingOtherActivityItemList />} />
          <Route path="marketing/item/:itemId/other-activity-item/add" element={<MarketingOtherActivityItemForm />} />
          <Route path="marketing/item/:itemId/other-activity-item/edit/:id" element={<MarketingOtherActivityItemForm />} />
          <Route path="marketing/item/:itemId/content-category" element={<MarketingContentCategoryList />} />
          <Route path="marketing/item/:itemId/content-category/add" element={<MarketingContentCategoryForm />} />
          <Route path="marketing/item/:itemId/content-category/edit/:id" element={<MarketingContentCategoryForm />} />
          <Route path="marketing/item/:itemId/content-item" element={<MarketingContentItemList />} />
          <Route path="marketing/item/:itemId/content-item/add" element={<MarketingContentItemForm />} />
          <Route path="marketing/item/:itemId/content-item/edit/:id" element={<MarketingContentItemForm />} />
          <Route path="marketing/item/:itemId/content-carousel" element={<MarketingContentCarouselList />} />
          <Route path="marketing/item/:itemId/content-carousel/add" element={<MarketingContentCarouselForm />} />
          <Route path="marketing/item/:itemId/content-carousel/edit/:id" element={<MarketingContentCarouselForm />} />
          <Route path="marketing/item/:itemId/community-program" element={<MarketingCommunityProgramList />} />
          <Route path="marketing/item/:itemId/community-program/add" element={<MarketingCommunityProgramForm />} />
          <Route path="marketing/item/:itemId/community-program/edit/:id" element={<MarketingCommunityProgramForm />} />
          <Route path="marketing/item/:itemId/community-program-item" element={<MarketingCommunityProgramItemList />} />
          <Route path="marketing/item/:itemId/community-program-item/add" element={<MarketingCommunityProgramItemForm />} />
          <Route path="marketing/item/:itemId/community-program-item/edit/:id" element={<MarketingCommunityProgramItemForm />} />
          <Route path="marketing/project" element={<MarketingProjectList />} />
          <Route path="marketing/project/add" element={<MarketingProjectForm />} />
          <Route path="marketing/project/edit/:id" element={<MarketingProjectForm />} />
          <Route path="marketing/form-submissions" element={<MarketingFormList />} />
          <Route path="marketing/wizard" element={<MarketingWizard />} />

          {/* Creative House */}
          <Route path="creative/category" element={<CreativeCategoryList />} />
          <Route path="creative/category/add" element={<CreativeCategoryForm />} />
          <Route path="creative/category/edit/:id" element={<CreativeCategoryForm />} />
          <Route path="creative/item" element={<CreativeItemList />} />
          <Route path="creative/item/add" element={<CreativeItemForm />} />
          <Route path="creative/item/edit/:id" element={<CreativeItemForm />} />
          <Route path="creative/item/:itemId/approach" element={<CreativeApproachList />} />
          <Route path="creative/item/:itemId/approach/add" element={<CreativeApproachForm />} />
          <Route path="creative/item/:itemId/approach/edit/:id" element={<CreativeApproachForm />} />
          <Route path="creative/item/:itemId/final-output" element={<CreativeFinalOutputList />} />
          <Route path="creative/item/:itemId/final-output/add" element={<CreativeFinalOutputForm />} />
          <Route path="creative/item/:itemId/final-output/edit/:id" element={<CreativeFinalOutputForm />} />
          <Route path="creative/project" element={<CreativeProjectList />} />
          <Route path="creative/project/add" element={<CreativeProjectForm />} />
          <Route path="creative/project/edit/:id" element={<CreativeProjectForm />} />
          <Route path="creative/wizard" element={<CreativeWizard />} />

          {/* Development House */}
          <Route path="development/category" element={<DevCategoryList />} />
          <Route path="development/category/add" element={<DevCategoryForm />} />
          <Route path="development/category/edit/:id" element={<DevCategoryForm />} />
          <Route path="development/item" element={<DevItemList />} />
          <Route path="development/item/add" element={<DevItemForm />} />
          <Route path="development/item/edit/:id" element={<DevItemForm />} />

          {/* Group Service */}
          <Route path="group-service/top-banner" element={<GroupTopBannerList />} />
          <Route path="group-service/top-banner/add" element={<GroupTopBannerForm />} />
          <Route path="group-service/top-banner/edit/:id" element={<GroupTopBannerForm />} />
          <Route path="group-service/category" element={<GroupServiceCategoryList />} />
          <Route path="group-service/category/add" element={<GroupServiceCategoryForm />} />
          <Route path="group-service/category/edit/:id" element={<GroupServiceCategoryForm />} />
          <Route path="group-service/item" element={<GroupServiceItemList />} />
          <Route path="group-service/item/add" element={<GroupServiceItemForm />} />
          <Route path="group-service/item/edit/:id" element={<GroupServiceItemForm />} />
          <Route path="group-service/item/:itemId/images" element={<GroupSingleServiceImageList />} />
          <Route path="group-service/item/:itemId/images/add" element={<GroupSingleServiceImageForm />} />
          <Route path="group-service/item/:itemId/images/edit/:id" element={<GroupSingleServiceImageForm />} />
          <Route path="group-service/item/:itemId/recent-work" element={<GroupRecentWorkList />} />
          <Route path="group-service/item/:itemId/recent-work/add" element={<GroupRecentWorkForm />} />
          <Route path="group-service/item/:itemId/recent-work/edit/:id" element={<GroupRecentWorkForm />} />
          <Route path="group-service/item/:itemId/portfolio-category" element={<GroupPortfolioCategoryList />} />
          <Route path="group-service/item/:itemId/portfolio-category/add" element={<GroupPortfolioCategoryForm />} />
          <Route path="group-service/item/:itemId/portfolio-category/edit/:id" element={<GroupPortfolioCategoryForm />} />
          <Route path="group-service/portfolio-item" element={<GroupPortfolioItemList />} />
          <Route path="group-service/portfolio-item/add" element={<GroupPortfolioItemForm />} />
          <Route path="group-service/portfolio-item/edit/:id" element={<GroupPortfolioItemForm />} />
          <Route path="group-service/creator-platform" element={<CreatorPlatformList />} />
          <Route path="group-service/creator-platform/add" element={<CreatorPlatformForm />} />
          <Route path="group-service/creator-platform/edit/:id" element={<CreatorPlatformForm />} />
          <Route path="group-service/success-stories" element={<SuccessStoriesList />} />
          <Route path="group-service/success-stories/add" element={<SuccessStoriesForm />} />
          <Route path="group-service/success-stories/edit/:id" element={<SuccessStoriesForm />} />
          <Route path="group-service/faq" element={<GroupServiceItemFaqList />} />
          <Route path="group-service/faq/add" element={<GroupServiceItemFaqForm />} />
          <Route path="group-service/faq/edit/:id" element={<GroupServiceItemFaqForm />} />

          {/* Blog */}
          <Route path="blog/category" element={<BlogCategoryList />} />
          <Route path="blog/category/add" element={<BlogCategoryForm />} />
          <Route path="blog/category/edit/:id" element={<BlogCategoryForm />} />
          <Route path="blog/sub-category" element={<BlogSubCategoryList />} />
          <Route path="blog/sub-category/add" element={<BlogSubCategoryForm />} />
          <Route path="blog/sub-category/edit/:id" element={<BlogSubCategoryForm />} />
          <Route path="blog/item" element={<BlogItemList />} />
          <Route path="blog/item/add" element={<BlogItemForm />} />
          <Route path="blog/item/edit/:id" element={<BlogItemForm />} />

          {/* Jobs */}
          <Route path="jobs/category" element={<JobCategoryList />} />
          <Route path="jobs/category/add" element={<JobCategoryForm />} />
          <Route path="jobs/category/edit/:id" element={<JobCategoryForm />} />
          <Route path="jobs/list" element={<JobListPage />} />
          <Route path="jobs/list/add" element={<JobListForm />} />
          <Route path="jobs/list/edit/:id" element={<JobListForm />} />
          <Route path="jobs/applicants" element={<JobApplicantList />} />
          <Route path="jobs/applicants/:id" element={<JobApplicantDetail />} />

          {/* Gallery */}
          <Route path="gallery/images" element={<GalleryImageList />} />
          <Route path="gallery/images/add" element={<GalleryImageForm />} />
          <Route path="gallery/images/edit/:id" element={<GalleryImageForm />} />
          <Route path="gallery/videos" element={<GalleryVideoList />} />
          <Route path="gallery/videos/add" element={<GalleryVideoForm />} />
          <Route path="gallery/videos/edit/:id" element={<GalleryVideoForm />} />

          {/* Templates */}
          <Route path="templates/author" element={<AuthorTemplateList />} />
          <Route path="templates/author/add" element={<AuthorTemplateForm />} />
          <Route path="templates/author/edit/:id" element={<AuthorTemplateForm />} />
          <Route path="templates/banner-title" element={<BannerTitleList />} />
          <Route path="templates/banner-title/add" element={<BannerTitleForm />} />
          <Route path="templates/banner-title/edit/:id" element={<BannerTitleForm />} />
          <Route path="templates/book-call" element={<BookCallList />} />
          <Route path="templates/book-call/add" element={<BookCallForm />} />
          <Route path="templates/book-call/edit/:id" element={<BookCallForm />} />
          <Route path="templates/user-choice" element={<UserChoiceList />} />
          <Route path="templates/user-choice/add" element={<UserChoiceForm />} />
          <Route path="templates/user-choice/edit/:id" element={<UserChoiceForm />} />
          <Route path="templates/our-advantage" element={<OurAdvantageList />} />
          <Route path="templates/our-advantage/add" element={<OurAdvantageForm />} />
          <Route path="templates/our-advantage/edit/:id" element={<OurAdvantageForm />} />
          <Route path="templates/success-stories-project" element={<SuccessStoriesProjectList />} />
          <Route path="templates/success-stories-project/add" element={<SuccessStoriesProjectForm />} />
          <Route path="templates/success-stories-project/edit/:id" element={<SuccessStoriesProjectForm />} />
          <Route path="templates/faq" element={<FaqList />} />
          <Route path="templates/faq/add" element={<FaqForm />} />
          <Route path="templates/faq/edit/:id" element={<FaqForm />} />
          <Route path="templates/whatsapp" element={<WhatsappTemplateList />} />
          <Route path="templates/whatsapp/add" element={<WhatsappTemplateForm />} />
          <Route path="templates/whatsapp/edit/:id" element={<WhatsappTemplateForm />} />
          <Route path="templates/admin-post" element={<AdminPostList />} />
          <Route path="templates/admin-post/add" element={<AdminPostForm />} />
          <Route path="templates/admin-post/edit/:id" element={<AdminPostForm />} />
          <Route path="templates/page" element={<PageList />} />
          <Route path="templates/page/add" element={<PageForm />} />
          <Route path="templates/page/edit/:id" element={<PageForm />} />

          {/* Contact */}
          <Route path="contact/contact-us" element={<ContactUsList />} />
          <Route path="contact/free-consultation" element={<FreeConsultationList />} />

          {/* Settings */}
          <Route path="settings/home-sections" element={<HomePageSectionList />} />
          <Route path="settings/home-sections/add" element={<HomePageSectionForm />} />
          <Route path="settings/home-sections/edit/:id" element={<HomePageSectionForm />} />
          <Route path="settings/home-section-items" element={<HomePageSectionItemList />} />
          <Route path="settings/home-section-items/add" element={<HomePageSectionItemForm />} />
          <Route path="settings/home-section-items/edit/:id" element={<HomePageSectionItemForm />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
