import {
  AttendanceCalculationResult,
  MissedSyllabusResult,
  MarksPerformanceResult,
  FacultyRiskSummaryResult,
  HodDepartmentHealthResult,
  AdminInstitutionHealthResult
} from './academicAnalytics';

/**
 * 1. Formatter for Student Attendance Questions
 */
export function formatStudentAttendanceResponse(
  calc: AttendanceCalculationResult,
  isRecoveryQuery: boolean = false
): string {
  if (!calc.hasData) {
    return `### Current Status
No official attendance records have been registered for your profile yet.

### Recommendation
Please confirm that your student registration (USN / ID) and class enrollment are complete.`;
  }

  const {
    currentPct,
    attended,
    conducted,
    absent,
    threshold,
    isEligible,
    classesNeededForThreshold,
    safeClassesToMiss,
    whatIfMissTwoClassesPct,
    lowestAttendanceSubject,
    atRiskSubjects
  } = calc;

  let needBlock = '';
  let actionBlock = '';

  if (isEligible) {
    needBlock = `### What You Need
- **Statutory Threshold**: ${threshold}% minimum required for exam eligibility.
- **Your Standing**: Currently **Eligible** (${currentPct}%).
- **Buffer / Margin**: You can safely miss up to **${safeClassesToMiss}** more classes while maintaining $\\ge${threshold}\\%$.
- **What-if Scenario**: If you miss the next 2 classes, your attendance will become **${whatIfMissTwoClassesPct}%**.`;

    actionBlock = `### Action
- Maintain your current routine and avoid consecutive unexcused absences.
${atRiskSubjects.length > 0 ? `- Note: Even though aggregate is fine, **${atRiskSubjects.map(s => s.subjectName).join(', ')}** is below ${threshold}%. Focus on these subjects!` : '- All individual subjects are currently in good standing.'}`;
  } else {
    needBlock = `### What You Need
- **Statutory Threshold**: ${threshold}% required for semester exam eligibility.
- **Deficit**: You are currently **${(threshold - currentPct).toFixed(1)}% below** the required threshold.
- **Classes Needed**: You must attend **${classesNeededForThreshold} consecutive future classes** without absence to reach ${threshold}%.
- **What-if Scenario**: If you miss 2 more classes, your attendance will drop further to **${whatIfMissTwoClassesPct}%**.`;

    actionBlock = `### Action
- Attend every single scheduled lecture and lab session starting tomorrow.
- Prioritize: **${lowestAttendanceSubject ? `${lowestAttendanceSubject.subjectName} (${lowestAttendanceSubject.percentage}%)` : 'your lowest subjects'}**.
- If any absences were due to medical or approved duty reasons, submit formal documentation to your HOD immediately for attendance credit.`;
  }

  return `### Current Status
- **Attendance**: **${currentPct}%** (${isEligible ? '🟢 Safe' : '🔴 Shortage Warning'})
- **Attended**: ${attended} classes
- **Absent**: ${absent} classes
- **Total Conducted**: ${conducted} classes

${needBlock}

${actionBlock}`;
}

/**
 * 2. Formatter for Student Missed-Syllabus Intelligence
 */
export function formatMissedSyllabusResponse(missed: MissedSyllabusResult): string {
  if (missed.missedSessionCount === 0) {
    return `### Classes Missed
Great news! You have **0 recorded absences** across your enrolled subjects.

### Status
Your attendance record is clean, and you have not missed any recorded syllabus lectures! Keep up the consistent record! 🌟`;
  }

  const sessionList = missed.missedSessions.slice(0, 5).map(s =>
    `- **${s.date}** (${s.slot}): ${s.subjectCode} — ${s.subjectName}${s.topicCovered ? ` *(Topic: ${s.topicCovered})*` : ''}`
  ).join('\n');

  let topicsBlock = '';
  if (missed.hasCoverageData) {
    topicsBlock = missed.identifiedTopics.slice(0, 5).map(t =>
      `- [${t.priority} Priority] **${t.subjectCode}**: ${t.topicTitle}`
    ).join('\n');
  } else {
    topicsBlock = `*Your timetable/coverage data is incomplete, so I can't reliably identify all exact missed topic titles. However, the sessions missed above are confirmed from your attendance ledger.*`;
  }

  const planBlock = missed.recoveryPlan.map(p =>
    `- **${p.day}**: ${p.task}`
  ).join('\n');

  return `### Classes Missed
You have missed **${missed.missedSessionCount} class sessions** across **${missed.missedSubjectsCount} subjects**:
${sessionList}
${missed.missedSessions.length > 5 ? `*(...and ${missed.missedSessions.length - 5} more sessions)*\n` : ''}
### Topics Likely Missed
${topicsBlock}

### Priority
1. **Core Conceptual Topics**: Complete lecture notes from classroom peers for the high-priority subjects above.
2. **Formula & Derivations**: Write out formulas from the missed sessions into your revision binder.
3. **Tutorial Problems**: Solve at least 2 numerical problems per missed topic before the next CIA.

### Recovery Plan
${planBlock || '- Schedule 45 minutes daily for the next 5 days to review lecture notes for the missed subjects.'}`;
}

/**
 * 3. Formatter for Student Academic Performance & Marks
 */
export function formatStudentMarksResponse(perf: MarksPerformanceResult): string {
  if (!perf.hasData) {
    return `### Overall Performance
No assessment scores (Minor 1, Minor 2, Mid Sem) have been officially published in the system yet.

### Recommendation
Keep monitoring your Marks tab as faculty submit evaluation rosters following CIA tests.`;
  }

  const strongList = perf.strongSubjects.length > 0
    ? perf.strongSubjects.map(s => `- **${s.subject}**: ${s.score}%`).join('\n')
    : `- No subjects currently $\\ge 75\\%$. Room for significant growth!`;

  const needsList = perf.needsAttentionSubjects.length > 0
    ? perf.needsAttentionSubjects.map(s => `- **${s.subject}**: ${s.score}% (Borderline)`).join('\n')
    : `- None in the borderline range.`;

  const critList = perf.criticalSubjects.length > 0
    ? perf.criticalSubjects.map(s => `- ⚠️ **${s.subject}**: ${s.score}% (High Risk)`).join('\n')
    : `- Zero critical subjects. You are passing all evaluated courses!`;

  return `### Overall Performance
- **Cumulative Assessment Average**: **${perf.overallAverage}%**
- **Performance State**: **${perf.trend}**

### Strong Subjects
${strongList}

### Needs Attention
${needsList}

### Critical Areas
${critList}

### Trend
${perf.trend === 'Improving' ? '📈 Upward momentum across recent assessments.' : perf.trend === 'Declining' ? '📉 Recent assessment scores show a slight dip. Action required before end-sems.' : '➡️ Steady performance across evaluation cycles.'}

### Recommended Focus
- Schedule dedicated revision for your lowest-scoring subjects.
- Review question paper solutions with your course faculty during tutorial hours.
- Practice solving previous year question papers under exam-timed conditions.`;
}

/**
 * 4. Formatter for Faculty Student Risk Summary
 */
export function formatFacultyRiskResponse(risk: FacultyRiskSummaryResult): string {
  if (!risk.hasData || risk.totalStudents === 0) {
    return `### Class Attendance & Academic Standing
No students are currently enrolled in your assigned classrooms or subjects.`;
  }

  if (risk.atRiskCount === 0) {
    return `### Class Attendance & Academic Standing
- **Total Students in Scope**: ${risk.totalStudents}
- **At-Risk Count**: **0 students**

### Summary
All assigned students are currently maintaining healthy attendance ($\\ge 75\\%$) and passing assessment marks!`;
  }

  const studentRows = risk.highRiskStudents.slice(0, 6).map(s =>
    `- **${s.name}** (${s.usn})
  - Attendance: **${s.attendancePct}%** | Marks Avg: **${s.marksAvg}%**
  - Triggers: ${s.reasons.join(', ')}`
  ).join('\n');

  return `### Class Attendance & Academic Standing
- **Total Students in Scope**: ${risk.totalStudents}
- **Students Requiring Attention**: **${risk.atRiskCount}**
- **Attendance Deficit Cases**: ${risk.attendanceRiskCount}
- **Academic Score Deficit Cases**: ${risk.academicRiskCount}

### Students Needing Immediate Attention
${studentRows}
${risk.highRiskStudents.length > 6 ? `*(...and ${risk.highRiskStudents.length - 6} more students)*\n` : ''}
### Recommended Intervention
1. **Parental / Advisory Dispatch**: Issue shortage warnings for students below 75% attendance.
2. **Remedial Tutorials**: Schedule 2 problem-solving sessions for lagging topics.
3. **Internal Review**: Confirm whether medical/OD slips are pending approval in the portal.`;
}

/**
 * 5. Formatter for HOD Department Health (Strict Department Scope)
 */
export function formatHodHealthResponse(hod: HodDepartmentHealthResult): string {
  if (!hod.hasData) {
    return `### Department Summary
Department data is currently being populated for **${hod.departmentCode}**.`;
  }

  const laggingList = hod.laggingSubjects.length > 0
    ? hod.laggingSubjects.map(s => `- **${s.name}** (${s.code}): ${s.coveragePct}% syllabus completed`).join('\n')
    : `- All departmental subjects are progressing on schedule.`;

  return `### Department Summary
- **Department**: **${hod.departmentName} (${hod.departmentCode})**
- **Student Enrollment**: ${hod.studentCount} active students
- **Faculty Strength**: ${hod.facultyCount} faculty members
- **Department Aggregate Attendance**: **${hod.avgAttendancePct}%**

### Key Findings
- **Students with Attendance Shortage**: **${hod.highRiskCount} students** below institutional 75% threshold.
- **Open Inquiries & Tickets**: **${hod.openQueriesCount}** pending in department portal.
- **Priority Academic Grievances**: **${hod.unresolvedGrievancesCount}** high-priority items.

### Subjects / Areas Needing Attention
${laggingList}

### Trend
${hod.avgAttendancePct >= 75 ? '🟢 Department operations are operating within university accreditation standards.' : '⚠️ Aggregate attendance is below university threshold. Remedial actions needed.'}

### Recommended Action
1. Instruct class teachers of sections with attendance $<75\\%$ to counsel students.
2. Direct course coordinators of lagging subjects to schedule zero-hour catch-up sessions.
3. Resolve the ${hod.openQueriesCount} pending student tickets before the end of the week.`;
}

/**
 * 6. Formatter for Admin Institutional Summary
 */
export function formatAdminSummaryResponse(admin: AdminInstitutionHealthResult): string {
  if (!admin.hasData || admin.totalDepartments === 0) {
    return `### Institutional Summary
Institutional academic data is currently syncing from the database.`;
  }

  const deptRows = admin.deptComparisons.map(d =>
    `- **${d.name} (${d.code})**: ${d.studentCount} Students, ${d.facultyCount} Faculty | Attendance: **${d.avgAttendance}%** | Syllabus: **${d.syllabusCompletion}%**`
  ).join('\n');

  return `### Institutional Summary
- **Academic Departments**: ${admin.totalDepartments} active branches
- **Total Student Body**: ${admin.totalStudents} enrolled students
- **Total Teaching Staff**: ${admin.totalFaculty} faculty members
- **Campus Unresolved Inquiries**: ${admin.totalOpenQueries} open tickets

### Department Comparison
${deptRows}

### Key Findings
- Campus academic monitoring is live with real-time Firestore synchronization.
- NAAC / NBA audit metric indicators are continuously computed across all departments.

### Recommended Action
- Review departments with lower aggregate attendance for university eligibility compliance.
- Ensure all department mentors log regular student interaction notes.`;
}
