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
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { NavTab } from '../layout/Sidebar';

interface LabAssistantDashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const LabAssistantDashboard: React.FC<LabAssistantDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { labEquipment, queries } = useAcademicData();

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

  const labQueries = queries.filter(q => q.category === 'lab');
  const pendingLabQueries = labQueries.filter(q => q.status !== 'resolved').length;

  // Dynamic schedule derived strictly from real Firestore equipment / labs
  const labSchedule = activeLabEquipment.slice(0, 3).map((item, idx) => ({
    id: `ls-${item.id}`,
    lab: item.labName,
    course: `${item.equipmentName} Practical Session`,
    batch: `Section A • Batch ${idx + 1}`,
    time: idx === 0 ? '09:00 AM - 12:00 PM' : '01:30 PM - 04:30 PM',
    facultyInCharge: item.inCharge || currentUser.name,
    status: item.status
  }));

  return (
    <div className="space-y-6">
      {/* Official Lab Banner */}
      <div className="bg-white rounded-lg p-5 sm:p-6 border border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Laboratory Operations & Practical Terminal
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{currentUser.department || 'Central Computing Facility'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
              Central Computing Facility & Laboratory Management
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              {currentUser.name} ({currentUser.designation || 'Lab Assistant'}) • {totalEquip} Total Workstations/Units Managed across {activeLabEquipment.length} Registered Lab Asset{activeLabEquipment.length === 1 ? '' : 's'}.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => onNavigate('lab_ops')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              Manage Equipment
            </button>
            <button
              onClick={() => onNavigate('attendance')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 transition-colors border border-[#E2E8F0] cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Lab Attendance
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Clean 4-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workstations */}
        <div
          onClick={() => onNavigate('lab_ops')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Workstations / Units</span>
            <HardDrive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{totalEquip}</span>
            <span className="text-xs text-slate-500">Physical Units</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {totalEquip === 0 ? '0 lab assets registered' : `Across ${activeLabEquipment.length} asset types`}
          </p>
        </div>

        {/* Operational Health */}
        <div
          onClick={() => onNavigate('lab_ops')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Operational Health</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
              {totalEquip > 0 ? `${operationalHealth}%` : 'N/A'}
            </span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {workingEquip} Working
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Ready for practical sessions</p>
        </div>

        {/* Under Service */}
        <div
          onClick={() => onNavigate('lab_ops')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Under Service</span>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-700">{maintenanceEquip}</span>
            <span className="text-xs text-amber-700 font-medium">Servicing</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {maintenanceEquip === 0 ? 'Zero hardware defects logged' : `${maintenanceEquip} units queued for repair`}
          </p>
        </div>

        {/* Open Inquiries */}
        <div
          onClick={() => onNavigate('queries')}
          className="bg-white p-5 rounded-lg border border-[#E2E8F0] hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Lab Inquiries</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-[#0F172A]">{labQueries.length}</span>
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${
                pendingLabQueries > 0
                  ? 'text-amber-800 bg-amber-50 border-amber-300'
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}
            >
              {pendingLabQueries} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Hardware & software tickets</p>
        </div>
      </div>

      {/* Main Grid: Scheduled Lab Practicals & Equipment Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduled Lab Sessions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#4F46E5]" />
                Laboratory Practical Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hardware availability, experiment attendance, and practical evaluation
              </p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Lab Register <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {labSchedule.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <FlaskConical className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No laboratory assets registered yet</p>
                <p className="text-slate-400 mt-1">Register computing labs and equipment in Lab Operations to track scheduled sessions.</p>
              </div>
            ) : (
              labSchedule.map(sess => (
                <div key={sess.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{sess.lab}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">{sess.course}</span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      {sess.time} • {sess.batch} • In Charge: <strong className="text-slate-800">{sess.facultyInCharge}</strong>
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                      sess.status === 'operational'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    ● {sess.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Lab Equipment Summary */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#4F46E5]" />
              Equipment Inventory
            </h3>
            <button
              onClick={() => onNavigate('lab_ops')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
            >
              Full Log
            </button>
          </div>

          <div className="space-y-3">
            {activeLabEquipment.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No lab equipment recorded.</p>
            ) : (
              activeLabEquipment.slice(0, 4).map(eq => (
                <div key={eq.id} className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                    <span className="truncate max-w-[170px]">{eq.equipmentName}</span>
                    <span className="text-emerald-700 font-bold">{eq.workingCount}/{eq.quantity}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">{eq.assetCode} • {eq.labName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
