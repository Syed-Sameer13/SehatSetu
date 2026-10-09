import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { HealthBanner } from '../common/HealthBanner';
import { SMSAlertToast } from '../common/SMSAlertToast';
import { useRealtimeSubscription } from '../../hooks/useRealtimeQueue';

export const DashboardLayout: React.FC = () => {
  useRealtimeSubscription();
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <HealthBanner />
        <TopNavbar />
        <SMSAlertToast />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
