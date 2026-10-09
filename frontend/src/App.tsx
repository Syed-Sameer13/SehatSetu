import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider } from './context/AppContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { IntakePage } from './pages/IntakePage';
import { QueuePage } from './pages/QueuePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditPage } from './pages/AuditPage';
import { PatientTrackerPage } from './pages/PatientTrackerPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/LoginPage';
import { useApp } from './context/AppContext';

// Configure TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

// Staff Route Guard: redirects patients to their Live Tracker
const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authType } = useApp();
  if (authType === 'PATIENT') {
    return <Navigate to="/tracker" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Standalone Authentication Page */}
            <Route path="/login" element={<LoginPage />} />

            {/* Dashboard Application Shell */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<OverviewPage />} />
              <Route
                path="intake"
                element={
                  <StaffRoute>
                    <IntakePage />
                  </StaffRoute>
                }
              />
              <Route
                path="queue"
                element={
                  <StaffRoute>
                    <QueuePage />
                  </StaffRoute>
                }
              />
              <Route path="tracker" element={<PatientTrackerPage />} />
              <Route path="track" element={<PatientTrackerPage />} />
              <Route
                path="analytics"
                element={
                  <StaffRoute>
                    <AnalyticsPage />
                  </StaffRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <StaffRoute>
                    <AuditPage />
                  </StaffRoute>
                }
              />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
};

export default App;
