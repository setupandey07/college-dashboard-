import React from 'react';
import {
  FlaskConical,
  HardDrive,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Cpu,
  ChevronRight,
  Send,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';
import { filterQueriesForUser } from '../../lib/queryPrivacy';
import {
  CampusHeroIllustration,
  SmartTechBooksIllustration,
  AcademicExcellenceIllustration
} from '../common/AcademicIllustrations';
import { MetricValueSkeleton } from '../common/LoadingSkeleton';

interface LabAssistantDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const LabAssistantDashboard: React.FC<LabAssistantDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { labEquipment, queries, loadingState, errorState } = useAcademicData();

  const myLabEquipment = labEquipment.filter(
    e => (e.inCharge && currentUser.name && (
           e.inCharge.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           currentUser.name.toLowerCase().includes(e.inCharge.toLowerCase())
         ))
  );

  const activeLabEquipment = myLabEquipment.length > 0 ? myLabEquipment : labEquipment;

  const totalEquip = activeLabEquipment.reduce((acc, e) => acc + (e.quantity || 0), 0);
  const workingEquip = activeLabEquipment.reduce((acc, e) => acc + (e.workingCount || 0), 0);
  const maintenanceEquip = activeLabEquipment.reduce((acc, e) => acc + (e.maintenanceCount || 0), 0);
  const operationalHealth = totalEquip > 0 ? Math.round((workingEquip / totalEquip) * 100) : 0;

  const labQueries = filterQueriesForUser(queries, currentUser, 'lab_assistant');
  const pendingLabQueries = labQueries.filter(q => q.status !== 'resolved').length;

  const labSchedule = activeLabEquipment.slice(0, 3).map((item, idx) => ({
    id: `ls-${item.id}`,
    lab: item.labName,
    course: `${item.equipmentName} Practical Session`,
    batch: `Section A • Batch ${idx + 1}`,
    time: idx === 0 ? '09:00 AM - 12:00 PM' : '01:30 PM - 04:30 PM',
    facultyInCharge: item.inCharge || currentUser.name,
    status: item.status
  }));

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userDisplayName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Lab In-Charge';

  return (
    <div className="space-y-6">
      {/* 1. Official Lab Operations Banner */}
      <div className="bg-gradient-to-r from-[#EBF5EF] via-[#EDF6F1] to-[#E5F2EA] border border-[#DCEBE2] rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="z-10 max-w-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">👋</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14382C] tracking-tight">
              {getTimeGreeting()}, {userDisplayName}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-bold text-[#1B8B67] bg-[#E0F3E8] px-2.5 py-0.5 rounded-full border border-[#C6E4D2]">
              {currentUser.department || 'Central Computing Facility'}
            </span>
            <span className="text-xs text-[#527568] font-medium">•</span>
            <span className="text-xs text-[#527568] font-medium">Laboratory Operations & Assets</span>
          </div>
          <p className="text-[#4D6D61] text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Managing {totalEquip} workstations/assets across {activeLabEquipment.length} laboratories. Practical readiness currently at {operationalHealth}%.
          </p>
        </div>

        {/* Right Tagline & Illustration */}
        <div className="relative flex items-center justify-end gap-6 shrink-0 z-10">
          <div className="hidden lg:block text-right">
            <span className="font-serif italic text-lg text-[#2E7D60] font-bold block leading-none">
              Precision
            </span>
            <span className="font-serif italic text-xl text-[#1E5D47] font-extrabold block leading-tight">
              Safety
            </span>
            <span className="font-serif italic text-2xl text-[#164837] font-black block leading-none">
              Uptime
            </span>
          </div>
          <div className="w-44 sm:w-56 h-28 sm:h-32 flex items-center justify-center">
            <CampusHeroIllustration className="w-full h-full object-contain drop-shadow-sm" />
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Row (4 cards matching Admin quality) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Workstations */}
        <div
          onClick={() => onNavigate('lab_ops')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Total Workstations</p>
              <MetricValueSkeleton
                isLoading={loadingState.workloads}
                error={errorState.workloads}
                value={totalEquip}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {activeLabEquipment.length} Registered Assets
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 2: Operational Health */}
        <div
          onClick={() => onNavigate('lab_ops')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Operational Health</p>
              <MetricValueSkeleton
                isLoading={loadingState.workloads}
                error={errorState.workloads}
                value={totalEquip > 0 ? operationalHealth : 0}
                unit="%"
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {workingEquip} Working Units
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 3: Under Service */}
        <div
          onClick={() => onNavigate('lab_ops')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Under Service</p>
              <MetricValueSkeleton
                isLoading={loadingState.workloads}
                error={errorState.workloads}
                value={maintenanceEquip}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {maintenanceEquip === 0 ? 'Zero Defects' : 'Repair in progress'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Card 4: Open Inquiries */}
        <div
          onClick={() => onNavigate('queries')}
          className="bg-white rounded-2xl p-5 border border-[#D9E6DE] hover:border-[#1B8B67] hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#527568]">Lab Inquiries</p>
              <MetricValueSkeleton
                isLoading={loadingState.queries}
                error={errorState.queries}
                value={labQueries.length}
              />
              <p className="text-[11px] font-medium text-[#719184] mt-1">
                {pendingLabQueries} Pending
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8AA79A] group-hover:text-[#1B8B67] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* 3. Main Body: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Scheduled Practical Sessions */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#1B8B67]" />
                <h2 className="text-sm font-bold text-[#14382C]">Laboratory Practical Schedule</h2>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Lab Register
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {labSchedule.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#6F8B7F]">
                  <p className="font-semibold text-[#14382C]">No laboratory assets registered yet.</p>
                  <p className="mt-1">Add laboratories in Lab Operations to track scheduled sessions.</p>
                </div>
              ) : (
                labSchedule.map(sess => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl border border-[#D9E6DE] bg-[#F9FCFA] hover:border-[#1B8B67] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#14382C] text-sm">{sess.lab}</span>
                        <span className="text-[#8AA79A]">•</span>
                        <span className="text-[#527568] font-medium">{sess.course}</span>
                      </div>
                      <p className="text-[#527568] mt-1 text-[11px]">
                        {sess.time} • {sess.batch} • In Charge: <strong className="text-[#14382C]">{sess.facultyInCharge}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sess.status === 'operational'
                            ? 'bg-[#EAF5EF] text-[#166E52] border border-[#CDE5D7]'
                            : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                        }`}
                      >
                        ● {sess.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* B. Safety & Operations Banner */}
          <div className="bg-gradient-to-r from-[#EBF5EF] to-[#DEF0E5] border border-[#CBE2D4] rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1B8B67] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#14382C]">
                  Central Hardware & Equipment Audit Log
                </h3>
                <p className="text-xs text-[#3D6052] font-medium mt-0.5">
                  Statutory safety audits • Maintenance scheduling • Preventive calibration
                </p>
                <button
                  onClick={() => onNavigate('lab_ops')}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1B8B67] hover:bg-[#167557] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Open Equipment Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="w-32 h-20 shrink-0 hidden sm:flex items-center justify-center">
              <SmartTechBooksIllustration className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* A. Lab Excellence */}
          <div className="bg-[#F0F8F4] border border-[#D5EADB] rounded-2xl p-5 text-center relative overflow-hidden shadow-xs">
            <div className="w-24 h-20 mx-auto flex items-center justify-center mb-2">
              <AcademicExcellenceIllustration className="w-full h-full object-contain" />
            </div>
            <h3 className="text-sm font-bold text-[#14382C]">Laboratory Excellence</h3>
            <p className="text-xs text-[#527568] mt-0.5">
              Empowering experiential engineering.
            </p>
          </div>

          {/* B. Lab Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#1B8B67]" />
              Lab Actions
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('lab_ops')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1B8B67] to-[#167557] hover:from-[#167557] hover:to-[#125D45] text-white flex items-center justify-between font-bold text-xs shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className="w-4 h-4 text-emerald-200" />
                  <span>Manage Lab Assets</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('attendance')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4 text-[#1B8B67]" />
                  <span>Lab Attendance Register</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('queries')}
                className="w-full py-2.5 px-4 rounded-xl border border-[#D9E6DE] bg-white hover:bg-[#F4F8F6] text-[#14382C] flex items-center justify-between font-semibold text-xs transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#1B8B67]" />
                  <span>Resolve Lab Incidents</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8AA79A] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* C. Equipment Inventory Snapshot */}
          <div className="bg-white rounded-2xl border border-[#D9E6DE] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAF0EC]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#1B8B67]" />
                <h3 className="text-xs font-bold text-[#14382C] uppercase tracking-wider">
                  Equipment Inventory
                </h3>
              </div>
              <button
                onClick={() => onNavigate('lab_ops')}
                className="text-xs text-[#1B8B67] hover:underline font-bold cursor-pointer"
              >
                Full Log
              </button>
            </div>

            <div className="space-y-3 mt-3">
              {activeLabEquipment.length === 0 ? (
                <p className="text-xs text-[#6F8B7F] italic text-center py-4">No lab equipment recorded.</p>
              ) : (
                activeLabEquipment.slice(0, 4).map(eq => (
                  <div key={eq.id} className="p-3 rounded-xl bg-[#F9FCFA] border border-[#D9E6DE] text-xs">
                    <div className="flex items-center justify-between font-bold text-[#14382C] mb-1">
                      <span className="truncate max-w-[170px]">{eq.equipmentName}</span>
                      <span className="text-[#1B8B67] font-bold">{eq.workingCount}/{eq.quantity}</span>
                    </div>
                    <p className="text-[11px] text-[#527568] font-mono">{eq.assetCode} • {eq.labName}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Institutional Footer Bar */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#527568] pt-6 pb-2 border-t border-[#D9E6DE] mt-8 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#14382C]">AcademicCore</span>
          <span>v1.0</span>
          <span>|</span>
          <span>Central Computing & Lab Facility • National Institute of Technology</span>
        </div>
        <div className="italic text-[#3D6052] flex items-center gap-1">
          <span>"Good education is the foundation of a better tomorrow."</span>
          <span>🌱</span>
        </div>
      </footer>
    </div>
  );
};
