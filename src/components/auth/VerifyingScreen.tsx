import React from 'react';
import { GraduationCap, ShieldCheck, Loader2 } from 'lucide-react';

interface VerifyingScreenProps {
  message?: string;
  subMessage?: string;
}

export const VerifyingScreen: React.FC<VerifyingScreenProps> = ({
  message = 'Verifying your AcademicCore account...',
  subMessage = 'Validating institutional credentials and resolving authoritative role permissions...'
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-8 text-center animate-in fade-in duration-200">
        {/* Institutional Icon */}
        <div className="w-14 h-14 mx-auto rounded-xl bg-[#0F172A] text-white flex items-center justify-center mb-5 shadow-sm">
          <GraduationCap className="w-7 h-7 text-[#818CF8]" />
        </div>

        {/* Institution Brand */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-bold text-lg text-[#0F172A]">
              Academic<span className="text-[#4F46E5]">Core</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-[#4F46E5] border border-indigo-100">
              NIT AP
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
            National Institute of Technology Andhra Pradesh
          </p>
        </div>

        {/* Spinner */}
        <div className="flex justify-center my-6">
          <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
        </div>

        {/* Verification Message */}
        <h2 className="text-sm font-bold text-slate-900 mb-1.5">{message}</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {subMessage}
        </p>

        {/* Security badge */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero-Trust Institutional Identity Verification Gate</span>
        </div>
      </div>
    </div>
  );
};
