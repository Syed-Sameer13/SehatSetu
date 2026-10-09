import React from 'react';
import { Bell, Search, Hospital } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      {/* Search / Context */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient by UHID, Name or Phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right Controls & Hospital Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
          <Hospital className="w-3.5 h-3.5 text-teal-700" />
          <span className="font-medium text-slate-700">Civil Hospital • Ward A</span>
        </div>

        <button
          aria-label="Notifications"
          className="relative p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-600 rounded-full"></span>
        </button>
      </div>
    </header>
  );
};
