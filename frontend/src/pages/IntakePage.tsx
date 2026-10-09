import React from 'react';
import { UserPlus, Sparkles } from 'lucide-react';

export const IntakePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Registration & Triage Intake</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Record patient demographics, chief complaints, and baseline vital observations for preliminary scoring.
        </p>
      </div>

      {/* Intake Form Container (Foundation Placeholder) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-700" />
            Patient Demographics & Department
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Required for identification and ticket generation.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Aarav Sharma"
              disabled
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
            <select
              disabled
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed"
            >
              <option>Emergency Department (ER)</option>
              <option>General Medicine</option>
              <option>Pediatrics</option>
            </select>
          </div>
        </div>

        <div className="border-b border-slate-100 pt-2 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Symptoms & Chief Complaint</h3>
          <p className="text-xs text-slate-500 mt-0.5">Enter direct patient statements and reported timeline.</p>
        </div>

        <div>
          <textarea
            rows={3}
            disabled
            placeholder="e.g. Acute severe substernal chest pain radiating to left arm for 45 minutes..."
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-500 cursor-not-allowed"
          ></textarea>
        </div>

        {/* Milestone Notice */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900">
            <div className="font-semibold mb-0.5">Milestone 1 Foundation Active</div>
            <p className="text-teal-700 leading-relaxed">
              Interactive patient registration and deterministic triage evaluation will be connected in <strong>Milestone 2 & 3</strong> once the backend schema and scoring rules are linked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
