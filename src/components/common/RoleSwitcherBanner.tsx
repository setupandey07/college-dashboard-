import React, { useState } from 'react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ChevronUp, ChevronDown, Check, RotateCcw, Eye, Sparkles } from 'lucide-react';

export const RoleSwitcherBanner: React.FC = () => {
  const { currentRole, setRole, returnToAdmin, currentUser, isDevRoleSwitcherActive } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);

  // Strictly for authentic Admin users only
  if (!isDevRoleSwitcherActive) return null;

  const roles: { role: UserRole; label: string; icon: string }[] = [
    { role: 'admin', label: 'Admin (Dean)', icon: '🏛️' },
    { role: 'hod', label: 'HOD (CSE)', icon: '🎓' },
    { role: 'faculty', label: 'Faculty', icon: '📚' },
    { role: 'lab_assistant', label: 'Lab Assistant', icon: '🔬' },
    { role: 'student', label: 'Student', icon: '🎒' }
  ];

  const currentRoleObj = roles.find(r => r.role === currentRole) || roles[0];
  const isVisitingOtherRole = currentRole !== 'admin';

  if (isMinimized) {
    return (
      <div className="bg-[#0B1120] text-slate-300 px-3 py-1 border-b border-indigo-950/60 flex items-center justify-between text-[11px] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-bold text-amber-400 text-[10px] tracking-wide uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            Admin Role Switcher
          </span>
          <span className="text-slate-400 text-xs">
            Viewing as <strong className="text-white">{currentRoleObj.label}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isVisitingOtherRole && (
            <button
              onClick={returnToAdmin}
              className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] flex items-center gap-1 transition-all"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Return to Admin
            </button>
          )}
          <button
            onClick={() => setIsMinimized(false)}
            className="text-slate-400 hover:text-white text-[10px] font-medium flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-slate-800"
          >
            Expand <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-colors duration-200 border-b text-[11px] px-3 sm:px-4 py-1.5 ${
      isVisitingOtherRole
        ? 'bg-[#0f172a] border-amber-500/40 text-slate-200'
        : 'bg-[#0B1120] border-slate-800 text-slate-300'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Role Context & Persona Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
            <ShieldCheck className="w-3 h-3 text-[#818CF8]" />
            Admin Control
          </span>

          {isVisitingOtherRole ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-[10px]">
                <Eye className="w-3 h-3" />
                Role Simulation: {currentRoleObj.label} (Testing Mode)
              </span>
              <span className="text-slate-300 text-[11px] hidden md:inline">
                Authenticated User: <strong className="text-white font-medium">{currentUser.name}</strong> (Administrator) • User records strictly isolated
              </span>
            </div>
          ) : (
            <span className="text-slate-400 hidden sm:inline text-xs">
              Logged in as <strong className="text-white font-medium">{currentUser.name}</strong> (Administrator)
            </span>
          )}
        </div>

        {/* Right: Switcher Buttons + Return to Admin */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Return to Admin Button when viewing another role */}
          {isVisitingOtherRole && (
            <button
              onClick={returnToAdmin}
              className="mr-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
              title="Return to Dean / Admin Dashboard"
            >
              <RotateCcw className="w-3 h-3" />
              Return to Admin
            </button>
          )}

          {/* Role Choice Pills */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded border border-slate-700/60">
            {roles.map(r => {
              const active = currentRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => setRole(r.role)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
                    active
                      ? 'bg-[#4F46E5] text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`Switch to ${r.label} to experience their view and make changes`}
                >
                  <span className="text-[10px]">{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          {/* Minimize bar */}
          <button
            onClick={() => setIsMinimized(true)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 ml-1"
            title="Minimize Bar"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
