import React from 'react';
import { UrgencyCategory, VisitStatus } from '../../types';

interface StatusBadgeProps {
  type: 'urgency' | 'status';
  value: UrgencyCategory | VisitStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '' }) => {
  if (type === 'urgency') {
    switch (value) {
      case 'CRITICAL':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 ${className}`}>
            ● CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 ${className}`}>
            ● HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
            ● MODERATE
          </span>
        );
      case 'LOW':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
            ● LOW
          </span>
        );
      case 'NEEDS_REVIEW':
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}>
            ● REVIEW
          </span>
        );
    }
  }

  // Visit Status
  switch (value) {
    case 'WAITING':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          Waiting
        </span>
      );
    case 'CALLED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          Called
        </span>
      );
    case 'IN_CONSULTATION':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 ${className}`}>
          In Consultation
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          Cancelled
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
