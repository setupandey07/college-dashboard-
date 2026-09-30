import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  BookOpenCheck
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';

export const ReportsModule: React.FC = () => {
  const { departments, users, students, subjects, attendanceSessions } = useAcademicData();
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const simulateDownload = (reportName: string) => {
    setDownloadNotice(`Generated and downloaded ${reportName} (PDF/CSV)!`);
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  // Helper: compute real faculty count for a department
  const getDeptFacultyCount = (deptCode: string, deptName: string) =>
    users.filter(
      u =>
        (u.role === 'faculty' || u.role === 'hod') &&
        (u.departmentCode?.toLowerCase() === deptCode.toLowerCase() ||
          u.department?.toLowerCase() === deptName.toLowerCase())
    ).length;

  // Helper: compute real student count for a department
  const getDeptStudentCount = (deptCode: string, deptName: string) => {
    const ids = new Set<string>();
    users
      .filter(
        u =>
          u.role === 'student' &&
          (u.departmentCode?.toLowerCase() === deptCode.toLowerCase() ||
            u.department?.toLowerCase() === deptName.toLowerCase())
      )
      .forEach(u => ids.add(u.id || u.email));
    students
      .filter(
        s =>
          s.departmentName?.toLowerCase() === deptName.toLowerCase() ||
          s.departmentId?.toLowerCase().includes(deptCode.toLowerCase())
      )
      .forEach(s => ids.add(s.userId || s.id || s.email));
    return ids.size;
  };

  // Helper: compute real avg attendance for a department from sessions
  const getDeptAvgAttendance = (deptCode: string, deptName: string) => {
    const deptSubjects = subjects.filter(
      s =>
        s.department?.toLowerCase() === deptName.toLowerCase() ||
        s.department?.toLowerCase() === deptCode.toLowerCase()
    );
    const deptSessions = attendanceSessions.filter(sess =>
      deptSubjects.some(s => s.id === sess.subjectId || s.code === sess.subjectCode)
    );
    if (deptSessions.length === 0) return 0;
    return Math.round(
      deptSessions.reduce(
        (acc, s) => acc + (s.totalStudents > 0 ? (s.presentCount / s.totalStudents) * 100 : 0),
        0
      ) / deptSessions.length
    );
  };

  // Helper: compute real syllabus coverage for a department
  const getDeptSyllabusCoverage = (deptCode: string, deptName: string) => {
    const deptSubjects = subjects.filter(
      s =>
        s.department?.toLowerCase() === deptName.toLowerCase() ||
        s.department?.toLowerCase() === deptCode.toLowerCase()
    );
    if (deptSubjects.length === 0) return 0;
    return Math.round(
      deptSubjects.reduce(
        (acc, s) =>
          acc + (s.totalHoursPlanned > 0 ? (s.hoursConducted / s.totalHoursPlanned) * 100 : 0),
        0
      ) / deptSubjects.length
    );
  };

  const reports = [
    {
      id: 'rep-naac',
      title: 'NAAC Criterion II — Teaching-Learning & Evaluation Comprehensive Dossier',
      category: 'Accreditation',
      desc: 'Contains student-faculty ratios, syllabus coverage timelines, continuous internal assessment rigor, and mentor-mentee interaction logs for NAAC Peer Team.',
      format: 'PDF Audit Dossier (42 Pages)',
      updated: '2026-09-25'
    },
    {
      id: 'rep-nba',
      title: 'NBA Outcome-Based Education (OBE) Course Outcome (CO-PO) Attainment Audit',
      category: 'NBA Tier-I',
      desc: 'Direct and indirect course outcome calculation matrix mapped against Program Educational Objectives (PEOs) for all UG engineering programs.',
      format: 'Spreadsheet Matrix (.xlsx)',
      updated: '2026-09-22'
    },
    {
      id: 'rep-att',
      title: 'Attendance Shortage Official Gazette (<75% Non-Eligible Student Roster)',
      category: 'Regulatory',
      desc: 'Institutional roll of students below statutory 75% attendance threshold with breakdown of medical leaves, ODs, and condonation eligibility.',
      format: 'CSV / PDF Gazette',
      updated: '2026-09-27'
    },
    {
      id: 'rep-syl',
      title: 'Syllabus Adherence & Contact Hours Reconciliation Report (Week 10 Audit)',
      category: 'Academic Audit',
      desc: 'Weekly variance analysis of planned versus conducted theory lectures and practical lab hours across all academic departments.',
      format: 'PDF Summary',
      updated: '2026-09-26'
    }
  ];

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <FileSpreadsheet className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Accreditation Dossiers & Statutory Audits</h1>
            <p className="text-[11px] text-slate-500">
              NAAC, NBA, and AICTE compliance documentation with export capabilities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {departments.length > 0 ? 'Accreditation Audit Ready' : 'Pending Department Setup'}
          </span>
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(rep => (
          <div
            key={rep.id}
            className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between text-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {rep.category}
                </span>
                <span className="text-[10px] text-slate-400">Audited: {rep.updated}</span>
              </div>

              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug">{rep.title}</h2>
              <p className="text-slate-600 mt-1.5 leading-relaxed text-[11px]">{rep.desc}</p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">{rep.format}</span>
              <button
                onClick={() => simulateDownload(rep.title)}
                className="px-3 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Institutional Department Audit Summary */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs p-4">
        <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <BookOpenCheck className="w-4 h-4 text-[#4F46E5]" />
          Accreditation Metric Summary by Academic Department
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 text-center">Faculty</th>
                <th className="py-2.5 px-3 text-center">Students</th>
                <th className="py-2.5 px-3 text-center">SFR Ratio</th>
                <th className="py-2.5 px-3">Avg Attendance</th>
                <th className="py-2.5 px-3">Syllabus Covered</th>
                <th className="py-2.5 px-3 text-center">Outcome Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No academic departments established yet. Accreditation dossiers and SFR metrics will populate as departments, faculty, and student records are registered.
                  </td>
                </tr>
              ) : (
                departments.map(dept => {
                  const realFacultyCount = getDeptFacultyCount(dept.code, dept.name);
                  const realStudentCount = getDeptStudentCount(dept.code, dept.name);
                  const sfr = realFacultyCount > 0 ? (realStudentCount / realFacultyCount).toFixed(1) : '0.0';
                  const realAttendance = getDeptAvgAttendance(dept.code, dept.name);
                  const realSyllabus = getDeptSyllabusCoverage(dept.code, dept.name);
                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {dept.code} - {dept.name}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{realFacultyCount}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{realStudentCount}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[#0F172A]">
                        {realFacultyCount > 0 ? `1:${sfr}` : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{realAttendance}%</td>
                      <td className="py-2.5 px-3 font-semibold text-[#4F46E5]">{realSyllabus}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold border ${
                          realFacultyCount > 0 && realStudentCount > 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {realFacultyCount > 0 && realStudentCount > 0 ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

