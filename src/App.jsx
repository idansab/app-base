import { Toaster } from "@/components/ui/Toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { AccessibilityProvider } from '@/lib/AccessibilityContext';
import AccessibilityMenu from '@/components/AccessibilityMenu';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
const Favorites = lazy(() => import('@/pages/Favorites'));
const Trips = lazy(() => import('@/pages/Trips'));
const Surprise = lazy(() => import('@/pages/Surprise'));
const Contribute = lazy(() => import('@/pages/Contribute'));
const Admin = lazy(() => import('@/pages/Admin'));
const AdminLogin = lazy(() => import('@/pages/AdminLogin'));
const Studio = lazy(() => import('@/pages/Studio'));
const CommunityChat = lazy(() => import('@/pages/CommunityChat'));
import Login from '@/pages/Login';
import Register from '@/pages/Register';
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Settings = lazy(() => import('@/pages/Settings'));
const About = lazy(() => import('@/pages/About'));
const PlaceDetail = lazy(() => import('@/pages/PlaceDetail'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const AccessibilityStatement = lazy(() => import('@/pages/AccessibilityStatement'));
const CookiePolicy = lazy(() => import('@/pages/CookiePolicy'));

const AuthenticatedApp = () => {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
        </div>
      }
    >
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/place/:id" element={<PlaceDetail />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/surprise" element={<Surprise />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/accessibility" element={<AccessibilityStatement />} />
        <Route path="/cookies" element={<CookiePolicy />} />
      </Route>

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/contribute" element={<Contribute />} />
          <Route path="/community-chat" element={<CommunityChat />} />
          <Route path="/studio" element={<Studio />} />
        </Route>
      </Route>

      <Route element={<AdminProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
              <AccessibilityMenu />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
