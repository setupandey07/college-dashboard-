import React, { useState } from 'react';
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  BookOpen,
  Plus,
  Users,
  ChevronRight
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { WorkloadItem } from '../../types';

export const WorkloadModule: React.FC = () => {
  const { currentRole } = useAuth();
  const { workloads, subjects, users, departments } = useAcademicData();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Derive real faculty list from users collection
  const facultyUsers = users.filter(u => u.role === 'faculty' || u.role === 'hod');

  // 2. Dynamically calculate workload for each real faculty member from their assigned subjects
  const computedWorkloads: WorkloadItem[] = facultyUsers.map(fac => {
    // Check if there is an explicit workload record in Firestore
    const existingRecord = workloads.find(w => w.facultyId === fac.id);

    // Find all subjects assigned to this faculty
    const assignedSubs = subjects.filter(
      s => s.facultyId === fac.id ||
           (s.facultyName && fac.name && (
             s.facultyName.toLowerCase().trim() === fac.name.toLowerCase().trim() ||
             s.facultyName.toLowerCase().includes(fac.name.toLowerCase())
           ))
    );

    // Calculate weekly teaching hours from assigned subjects
    const lectureSubs = assignedSubs.filter(s => s.type === 'theory');
    const labSubs = assignedSubs.filter(s => s.type === 'lab');
    const integratedSubs = assignedSubs.filter(s => s.type === 'integrated');

    // Theory course = credits or ~3-4 hours/wk; Lab = 3 hours/wk; Integrated = 4 hours/wk
    const lectureHours = lectureSubs.reduce((sum, s) => sum + (s.credits ? Math.max(3, s.credits) : 3), 0);
    const labHours = labSubs.reduce((sum, s) => sum + (s.credits ? Math.max(2, s.credits) : 3), 0) +
                     integratedSubs.reduce((sum, s) => sum + 2, 0);
    const tutorialHours = assignedSubs.length > 0 ? 2 : 0; // standard mentoring slot

    const calculatedWeeklyHours = lectureHours + labHours + tutorialHours;
    const currentWeeklyHours = existingRecord?.currentWeeklyHours !== undefined
      ? Math.max(existingRecord.currentWeeklyHours, calculatedWeeklyHours)
      : calculatedWeeklyHours;

    const targetWeeklyHours = existingRecord?.targetWeeklyHours || 16;
    const status: WorkloadItem['status'] =
      currentWeeklyHours > 18 ? 'overload' :
      currentWeeklyHours >= 12 ? 'optimal' : 'optimal';

    const subjectsAssignedList: WorkloadItem['subjectsAssigned'] = assignedSubs.map(s => ({
      code: s.code,
      name: s.name,
      semester: s.semester,
      section: 'A',
      type: s.type === 'lab' ? 'lab' : 'lecture',
      hours: s.type === 'lab' ? 3 : (s.credits ? Math.max(3, s.credits) : 3)
    }));

    return {
      facultyId: fac.id,
      facultyName: fac.name,
      designation: fac.designation || (fac.role === 'hod' ? 'Professor & HOD' : 'Assistant Professor'),
      department: fac.department || fac.departmentCode || 'Computer Science & Engineering',
      targetWeeklyHours,
      currentWeeklyHours,
      lectureHours,
      labHours,
      tutorialHours,
      status,
      subjectsAssigned: subjectsAssignedList.length > 0 ? subjectsAssignedList : (existingRecord?.subjectsAssigned || [])
    };
  });

  // Include any extra workload items that might exist in Firestore but not in current users
  workloads.forEach(w => {
    if (!computedWorkloads.some(cw => cw.facultyId === w.facultyId)) {
      computedWorkloads.push(w);
    }
  });

  const filteredWorkloads = computedWorkloads.filter(w => {
    const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
    const matchesSearch =
      w.facultyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const avgHours = computedWorkloads.length > 0
    ? (computedWorkloads.reduce((acc, w) => acc + w.currentWeeklyHours, 0) / computedWorkloads.length).toFixed(1)
    : '0.0';

  const overloadedCount = computedWorkloads.filter(w => w.status === 'overload').length;
  const optimalCount = computedWorkloads.filter(w => w.status === 'optimal').length;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <Briefcase className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Faculty Workload Distribution & Credit Allocations</h1>
            <p className="text-[11px] text-slate-500">
              AICTE regulatory compliance monitoring (16–18 hours/week maximum statutory teaching ceiling)
            </p>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-md bg-slate-50 border border-[#E2E8F0] text-xs">
            <span className="text-slate-500">Institutional Average: </span>
            <strong className="text-slate-900 font-bold">{avgHours} hrs/week</strong>
          </div>
          <div className="px-3 py-1 rounded-md bg-slate-50 border border-[#E2E8F0] text-xs">
            <span className="text-slate-500">Faculty Tracked: </span>
            <strong className="text-[#4F46E5] font-bold">{computedWorkloads.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by faculty name or department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          {['all', 'optimal', 'overload'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st} {st === 'all' ? `(${computedWorkloads.length})` : st === 'optimal' ? `(${optimalCount})` : `(${overloadedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty Workload Empty State */}
      {computedWorkloads.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            0 Faculty Workload Records
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
            No teaching faculty members are currently registered in the database. As soon as faculty accounts are established in the User Directory and subjects are assigned, their weekly contact hours, lecture/lab splits, and AICTE compliance status will be calculated automatically.
          </p>
        </div>
      ) : filteredWorkloads.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 text-center text-slate-500">
          <p className="font-semibold text-slate-700">No faculty records matching filter criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or search query.</p>
        </div>
      ) : (
        /* Faculty Workload Cards Grid */
        <div className="space-y-3.5">
          {filteredWorkloads.map(w => {
            const isOverload = w.status === 'overload';
            const pct = w.targetWeeklyHours > 0
              ? Math.min(100, Math.round((w.currentWeeklyHours / w.targetWeeklyHours) * 100))
              : 0;

            return (
              <div
                key={w.facultyId}
                className={`bg-white rounded-lg border p-4 shadow-2xs transition-all ${
                  isOverload ? 'border-amber-300 bg-amber-50/20' : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold text-[#0F172A]">{w.facultyName}</h2>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {w.designation}
                      </span>
                      <span className="text-xs font-bold text-slate-700">({w.department})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Target AICTE Load: {w.targetWeeklyHours} hrs/wk • Allocated: <strong className="text-slate-800">{w.currentWeeklyHours} Contact Hours</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span
                        className={`text-base font-bold font-mono ${
                          isOverload ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {w.currentWeeklyHours} hrs
                      </span>
                      <p className="text-[10px] text-slate-400">Weekly teaching load</p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isOverload
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverload ? 'bg-[#F59E0B]' : 'bg-[#4F46E5]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Breakdown */}
                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                    Lecture Hours: <strong className="text-slate-900">{w.lectureHours} hrs</strong>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    Laboratory Hours: <strong className="text-slate-900">{w.labHours} hrs</strong>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    Tutorial / Mentoring: <strong className="text-slate-900">{w.tutorialHours} hrs</strong>
                  </span>
                </div>

                {/* Assigned Subjects Grid */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Allocated Course Modules ({w.subjectsAssigned.length})
                  </h4>
                  {w.subjectsAssigned.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No course modules currently allocated to this faculty member.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {w.subjectsAssigned.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span className="font-mono text-[10px]">{sub.code}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-700 bg-slate-200 px-1 py-0.2 rounded">
                              {sub.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 truncate mt-0.5 font-medium">{sub.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Sem {sub.semester} - {sub.section} • {sub.hours} hrs/wk
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
