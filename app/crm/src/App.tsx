import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { forceLogout } from '@/features/auth/authSlice';
import Layout from '@/components/layout/Layout';
import { Spinner } from '@/components/ui';

const Login = lazy(() => import('@/pages/auth/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const LeadsList = lazy(() => import('@/pages/leads/LeadsList'));
const LeadDetail = lazy(() => import('@/pages/leads/LeadDetail'));
const ContactsList = lazy(() => import('@/pages/contacts/ContactsList'));
const ContactDetail = lazy(() => import('@/pages/contacts/ContactDetail'));
const CompaniesList = lazy(() => import('@/pages/companies/CompaniesList'));
const DealsBoard = lazy(() => import('@/pages/deals/DealsBoard'));
const CallsPage = lazy(() => import('@/pages/calls/CallsPage'));
const TasksPage = lazy(() => import('@/pages/tasks/TasksPage'));
const FollowUpsPage = lazy(() => import('@/pages/followups/FollowUpsPage'));
const InboxPage = lazy(() => import('@/pages/inbox/InboxPage'));
const TemplatesPage = lazy(() => import('@/pages/templates/TemplatesPage'));
const AutomationsPage = lazy(() => import('@/pages/automations/AutomationsPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));

const App = () => {
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Axios interceptor fires this on a 401 — mirror of the admin panel pattern.
  useEffect(() => {
    const onLogout = () => { dispatch(forceLogout()); navigate('/login'); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [dispatch, navigate]);

  if (!token) {
    return (
      <Suspense fallback={<Spinner className="min-h-screen" />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<LeadsList />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/contacts" element={<ContactsList />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/companies" element={<CompaniesList />} />
          <Route path="/deals" element={<DealsBoard />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/followups" element={<FollowUpsPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default App;
