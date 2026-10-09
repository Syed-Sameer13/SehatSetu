import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { checkBackendHealth } from '../../services/healthService';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export const HealthBanner: React.FC = () => {
  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ['backend-health'],
    queryFn: checkBackendHealth,
    retry: 2,
    refetchInterval: 30000, // check every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 animate-pulse text-slate-400" />
          <span>Verifying backend API connectivity...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Backend API disconnected (`http://localhost:8000/api/v1`). Start the FastAPI server to enable live operations.</span>
        </div>
        <button
          onClick={() => refetch()}
          className="font-medium underline hover:text-amber-900 cursor-pointer"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-teal-50/70 border-b border-teal-100 px-4 py-1.5 flex items-center justify-between text-xs text-teal-800">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
        <span>Connected to <strong>{data.service}</strong> (v{data.version}) • Environment: <code>{data.environment}</code></span>
      </div>
      <span className="text-teal-600 font-mono text-[11px]">System Ready</span>
    </div>
  );
};
