import React from 'react';
import {
  GraduationCap,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const {
    signInWithGoogle,
    simulateIdentityVerification,
    authState,
    authError,
    clearAuthError
  } = useAuth();

  const isBusy = authState === 'SIGNING_IN' || authState === 'VERIFYING_PROFILE';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Ministry / Institutional Header Strip */}
      <div className="bg-[#0F172A] border-b border-slate-800 text-slate-300 py-1.5 px-4 text-[11px]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">राष्ट्रीय प्रौद्योगिकी संस्थान आंध्र प्रदेश</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">National Institute of Technology Andhra Pradesh</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="font-medium">Academic Portal 2025–26</span>
          </div>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {/* Institution Brand Banner */}
            <div className="p-6 text-center border-b border-[#E2E8F0] bg-[#FAFAFA]">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#0F172A] text-white flex items-center justify-center mb-3 shadow-xs">
                <GraduationCap className="w-6 h-6 text-[#818CF8]" />
              </div>

              <div className="flex items-center justify-center gap-2">
                <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
                  Academic<span className="text-[#4F46E5]">Core</span>
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-[#4F46E5] border border-indigo-200/60 uppercase">
                  NIT AP
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-1">
                College Academic Management & Monitoring System
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official Institutional Single Sign-On Portal
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Institutional Authorization Error Card */}
              {authError && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-red-950">{authError.title}</p>
                      <p className="text-[11px] text-red-800 leading-relaxed font-normal">
                        {authError.message}
                      </p>
                      {authError.email && (
                        <p className="text-[10px] font-mono text-red-700 bg-red-100/70 px-2 py-0.5 rounded inline-block mt-1">
                          Account: {authError.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-red-200/70 flex items-center justify-between">
                    <button
                      onClick={() => signInWithGoogle()}
                      disabled={isBusy}
                      className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <ArrowRight className="w-3 h-3" /> Try Again
                    </button>
                    <button
                      onClick={clearAuthError}
                      className="text-[11px] font-semibold text-red-700 hover:text-red-900 flex items-center gap-1 underline"
                    >
                      <RefreshCw className="w-3 h-3" /> Dismiss Notice
                    </button>
                  </div>
                </div>
              )}

              {/* Informational Guidance Callout */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <Lock className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>Institutional Domain Requirements</span>
                </div>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-600 text-[11px] leading-relaxed">
                  <li>
                    <strong className="text-slate-800">Students:</strong> Must sign in with official domain:{' '}
                    <code className="bg-white px-1.5 py-0.2 rounded border border-slate-200 text-indigo-700 font-mono text-[10px]">
                      @student.nitandhra.ac.in
                    </code>
                  </li>
                  <li>
                    <strong className="text-slate-800">Faculty & Administration:</strong> Sign in with your registered institutional account.
                  </li>
                  <li>
                    <strong className="text-slate-800">Development Admin:</strong> Authorized administrator identity ({' '}
                    <code className="text-slate-700 font-mono text-[10px]">startup5077 / pkr02042006@gmail.com</code>) supported.
                  </li>
                </ul>
              </div>

              {/* Primary Google Login Button */}
              <div>
                <button
                  onClick={() => signInWithGoogle()}
                  disabled={isBusy}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-3 border shadow-xs ${
                    isBusy
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-50 border-[#CBD5E1] text-[#0F172A] hover:border-slate-400 active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  {/* Official Google 'G' SVG Logo */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>
                    {isBusy ? 'Authenticating with Google...' : 'Continue with Google'}
                  </span>
                </button>
              </div>

              {/* Development & Testing Verification Simulator */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#4F46E5]" />
                    Testing & Evaluation Profiles
                  </span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Test Mode
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => simulateIdentityVerification('525199@student.nitandhra.ac.in', 'stu-525199', 'Aarav Patel')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-white text-left transition-all group disabled:opacity-50 cursor-pointer"
                    title="Case 1: Test New Student Profile Setup"
                  >
                    <span className="text-[10px] font-bold text-indigo-700 block group-hover:text-indigo-900">
                      🎓 Student
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      Setup & Portal View
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => simulateIdentityVerification('prof.kiran.eee@nitandhra.ac.in', 'fac-kiran-eee', 'Prof. Kiran Kumar (EEE)')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-white text-left transition-all group disabled:opacity-50 cursor-pointer"
                    title="Case 2: Test New Faculty (EEE) Onboarding & Subject Selection"
                  >
                    <span className="text-[10px] font-bold text-emerald-700 block group-hover:text-emerald-900">
                      📚 New Faculty (EEE)
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      Onboarding & Subjects
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => simulateIdentityVerification('suresh.lab@nitandhra.ac.in', 'lab-suresh', 'Suresh Babu (Lab In-Charge)')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-teal-400 bg-slate-50 hover:bg-white text-left transition-all group disabled:opacity-50 cursor-pointer"
                    title="Case 3: Test New Lab Assistant Onboarding & Subject Selection"
                  >
                    <span className="text-[10px] font-bold text-teal-700 block group-hover:text-teal-900">
                      🔬 Lab Assistant
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      Lab Onboarding
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => simulateIdentityVerification('pkr02042006@gmail.com', 'u-admin-1', 'Principal & Academic Dean')}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-white text-left transition-all group disabled:opacity-50 cursor-pointer"
                    title="Case 4: Test Administrator Access & Allocations"
                  >
                    <span className="text-[10px] font-bold text-amber-700 block group-hover:text-amber-900">
                      🏛️ Administrator
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      Global Mgmt & Allocations
                    </span>
                  </button>
                </div>
              </div>

              {/* Institutional Single Sign-On Security Note */}
              <div className="pt-1 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Single Sign-On (SSO) verified via Google & Firebase Identity</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
            <p>Protected Academic Portal • Ministry of Education (MoE)</p>
            <p className="text-[10px] text-slate-400">
              National Institute of Technology Andhra Pradesh • All Rights Reserved
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Legal / Compliance Strip */}
      <div className="border-t border-slate-200 bg-white py-2 px-4 text-center text-[10px] text-slate-500">
        Unauthorized access is strictly prohibited under the Information Technology Act. All sessions are logged and audited.
      </div>
    </div>
  );
};
