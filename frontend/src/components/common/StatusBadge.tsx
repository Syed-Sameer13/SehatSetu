import React from 'react';
import { UrgencyCategory, VisitStatus } from '../../types';
import { useApp } from '../../context/AppContext';

interface StatusBadgeProps {
  type: 'urgency' | 'status';
  value: UrgencyCategory | VisitStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '' }) => {
  const { t } = useApp();

  if (type === 'urgency') {
    switch (value) {
      case 'CRITICAL':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 ${className}`}>
            ● {t('urgency_critical')}
          </span>
        );
      case 'HIGH':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 ${className}`}>
            ● {t('urgency_high')}
          </span>
        );
      case 'MODERATE':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
            ● {t('urgency_moderate')}
          </span>
        );
      case 'LOW':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
            ● {t('urgency_low')}
          </span>
        );
      case 'NEEDS_REVIEW':
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}>
            ● {t('urgency_needs_review')}
          </span>
        );
    }
  }

  // Visit Status
  switch (value) {
    case 'WAITING':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          {t('status_waiting')}
        </span>
      );
    case 'CALLED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          {t('status_called')}
        </span>
      );
    case 'IN_CONSULTATION':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 ${className}`}>
          {t('status_in_consultation')}
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          {t('status_completed')}
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          {t('status_cancelled')}
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ${className}`}>
          {value}
        </span>
      );
  }
};
