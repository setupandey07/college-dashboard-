import { GoogleGenAI } from '@google/genai';
import { UserRole } from '../../types';
import { ScopedAcademicContext, AiIntelligenceResponse } from './types';
import { detectAcademicIntent } from './intentRouter';
import {
  calculateStudentAttendance,
  calculateMissedSyllabus,
  calculateStudentMarksPerformance,
  calculateFacultyRisk,
  calculateHodDepartmentHealth,
  calculateAdminInstitutionHealth
} from './academicAnalytics';
import {
  formatStudentAttendanceResponse,
  formatMissedSyllabusResponse,
  formatStudentMarksResponse,
  formatFacultyRiskResponse,
  formatHodHealthResponse,
  formatAdminSummaryResponse
} from './formatters';

// Initialize Gemini SDK with runtime env var if available
const apiKey =
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  '';

let aiInstance: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiInstance = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Gemini initialization skipped:', err);
  }
}

const SAFETY_REFUSAL_RESPONSE = `I'm here to help with your studies, academics, career, and student support. Let's keep the conversation focused on that. 🙂

Would you like to:
- 💡 **Check your attendance status & recovery requirements**
- 📚 **Review missed syllabus topics & study recovery plan**
- 🎯 **Analyze your assessment scores & performance trends**
- 🚀 **Prepare for engineering exams, numericals, or career goals**`;

/**
 * Master Academic Intelligence Dispatcher
 */
export async function queryAcademicIntelligence(
  query: string,
  context: ScopedAcademicContext,
  history: Array<{ sender: 'user' | 'ai'; text: string }> = []
): Promise<AiIntelligenceResponse> {
  const role = context.role;
  const intent = detectAcademicIntent(query, role);

  // 1. Safety Guardrail
  if (intent === 'safety_violation') {
    return {
      text: SAFETY_REFUSAL_RESPONSE,
      intent: 'safety_violation',
      suggestedFollowUps: getRoleSuggestedFollowUps(role),
      hasRealData: true
    };
  }

  // 2. Compute Scoped Deterministic Analytics according to detected intent
  let responseText = '';
  let calculatedMetrics: Record<string, any> | undefined;

  switch (intent) {
    case 'student_attendance':
    case 'student_attendance_recovery': {
      const attCalc = calculateStudentAttendance(context);
      responseText = formatStudentAttendanceResponse(attCalc, intent === 'student_attendance_recovery');
      calculatedMetrics = attCalc;
      break;
    }

    case 'student_missed_syllabus': {
      const missedCalc = calculateMissedSyllabus(context);
      responseText = formatMissedSyllabusResponse(missedCalc);
      calculatedMetrics = missedCalc;
      break;
    }

    case 'student_marks': {
      const marksCalc = calculateStudentMarksPerformance(context);
      responseText = formatStudentMarksResponse(marksCalc);
      calculatedMetrics = marksCalc;
      break;
    }

    case 'student_study_plan':
    case 'student_focus_areas': {
      const attCalc = calculateStudentAttendance(context);
      const marksCalc = calculateStudentMarksPerformance(context);
      const missedCalc = calculateMissedSyllabus(context);

      const weakSubj = marksCalc.needsAttentionSubjects.concat(marksCalc.criticalSubjects);
      const targetSub = weakSubj.length > 0 ? weakSubj[0].subject : 'Core Engineering Subjects';

      responseText = `### Goal
Raise academic performance and ensure 100% exam eligibility before semester finals.

### Available Time
7-Day Structured Cadence (2 to 2.5 hours per evening).

### Priority Topics
1. **${targetSub}**: Focus on high-weightage derivations and numerical assignments.
2. **Attendance Maintenance**: Attend all scheduled classes tomorrow to preserve $\\ge 75\\%$.
${missedCalc.identifiedTopics.length > 0 ? `3. **Missed Topics Catch-Up**: Review ${missedCalc.identifiedTopics[0].topicTitle}.` : '3. **Formula Revision**: Consolidate formula sheet across evaluated units.'}

### Daily Plan
- **Days 1–2**: Solve past 3 years' question paper problems for ${targetSub}.
- **Days 3–4**: Complete laboratory assignments and verify viva formulas.
- **Days 5–6**: Self-timed mock test for Unit 2 and Unit 3.
- **Day 7**: Comprehensive formula revision and restful mental preparation.

### Revision
- Keep a 2-page handwritten formula summary sheet for rapid morning review.`;
      calculatedMetrics = { attCalc, marksCalc, missedCalc };
      break;
    }

    case 'faculty_student_risk':
    case 'faculty_attendance_issues': {
      const riskCalc = calculateFacultyRisk(context);
      responseText = formatFacultyRiskResponse(riskCalc);
      calculatedMetrics = riskCalc;
      break;
    }

    case 'faculty_mentees': {
      const mentees = context.faculty?.mentees || [];
      if (mentees.length === 0) {
        responseText = `### Mentee Summary
You currently have no students assigned under your direct faculty mentorship program.`;
      } else {
        const rows = mentees.map(m =>
          `- **${m.name}** (${m.regId || 'USN'}): ${m.department} • ${m.currentAcademicYear || 'Undergraduate'}`
        ).join('\n');

        responseText = `### Mentee Program Summary
- **Total Mentees Assigned**: ${mentees.length} students

### Mentee Roster
${rows}

### Guidance
Review attendance records for your mentees bi-weekly to prevent exam shortage issues.`;
      }
      break;
    }

    case 'faculty_class_performance':
    case 'faculty_syllabus_coverage': {
      const subs = context.faculty?.assignedSubjects || [];
      if (subs.length === 0) {
        responseText = `### Class & Syllabus Performance
No active subjects are currently assigned to your faculty profile.`;
      } else {
        const rows = subs.map(s => {
          const planned = s.totalHoursPlanned || 45;
          const conducted = s.hoursConducted || 0;
          const pct = planned > 0 ? Math.round((conducted / planned) * 100) : 0;
          return `- **${s.name}** (${s.code}): ${conducted}/${planned} hours conducted (**${pct}% syllabus pacing**)`;
        }).join('\n');

        responseText = `### Assigned Class Pacing & Syllabus Coverage
${rows}

### Pacing Benchmark
Standard institutional guideline prescribes completion of at least 70% of course units by Week 10.`;
      }
      break;
    }

    case 'hod_department_summary': {
      const hodCalc = calculateHodDepartmentHealth(context);
      responseText = formatHodHealthResponse(hodCalc);
      calculatedMetrics = hodCalc;
      break;
    }

    case 'hod_students_at_risk':
    case 'hod_attendance_risk':
    case 'hod_academic_risk': {
      const hodCalc = calculateHodDepartmentHealth(context);
      const riskStudents = (context.hod?.studentAttendanceSummaries || [])
        .filter(s => s.percentage < context.threshold)
        .slice(0, 8);

      const rows = riskStudents.map(s =>
        `- **${s.studentName || s.studentId}** (${s.subjectName}): **${s.percentage}% attendance** (${s.attendedClasses}/${s.totalClasses} classes)`
      ).join('\n');

      responseText = `### Department Student Risk Roster (${context.hod?.departmentCode || 'DEPT'})
- **Total Students Below ${context.threshold}% Threshold**: ${hodCalc.highRiskCount}

### Critical Attendance Cases
${rows || '- All department students are currently maintaining attendance above the regulatory threshold.'}

### Department Interventions
- Issue official deficiency notices to guardians.
- Convene class teacher counseling sessions.`;
      calculatedMetrics = { hodCalc, riskStudents };
      break;
    }

    case 'hod_queries_grievances': {
      const qList = context.hod?.queries || [];
      const openQ = qList.filter(q => q.status !== 'resolved');
      const grievances = openQ.filter(q => q.category === 'exam' || q.priority === 'high');

      const rows = openQ.slice(0, 5).map(q =>
        `- **[${q.priority.toUpperCase()}]** ${q.title} *(from ${q.studentName || 'Student'}, ${q.createdAt ? q.createdAt.slice(0, 10) : 'Recent'})*`
      ).join('\n');

      responseText = `### Department Queries & Grievances (${context.hod?.departmentCode || 'DEPT'})
- **Total Inquiries Logged**: ${qList.length}
- **Active Open Tickets**: ${openQ.length}
- **High-Priority Grievances**: ${grievances.length}

### Recent Pending Tickets
${rows || '- No unresolved student queries or grievances pending in the department queue.'}

### SLA Recommendation
University guidelines require all academic evaluation discrepancies to receive timestamped replies within 48 hours.`;
      break;
    }

    case 'admin_institution_summary':
    case 'admin_department_comparison':
    case 'admin_attendance_trends':
    case 'admin_academic_trends':
    case 'admin_mentor_program':
    case 'admin_student_concerns': {
      const adminCalc = calculateAdminInstitutionHealth(context);
      responseText = formatAdminSummaryResponse(adminCalc);
      calculatedMetrics = adminCalc;
      break;
    }

    case 'concept':
    case 'numerical':
    case 'coding':
    case 'career':
    case 'general':
    default: {
      // 3. If Gemini is available, pass the query along with user context
      if (aiInstance) {
        try {
          const dept = context.user.departmentCode || context.user.department || 'Engineering';
          const recentHistory = history.slice(-6).map(m => `${m.sender === 'user' ? 'User' : 'AcademicCore AI'}: ${m.text}`).join('\n\n');

          const prompt = `You are AcademicCore AI, a professional academic and engineering intelligence system.
User Role: ${role.toUpperCase()}
Department: ${dept}
Query: ${query}

Previous context:
${recentHistory}

Provide a direct, accurate, engaging answer. For concepts, use clear analogies and step-by-step technical depth. For numericals, use Given -> Formula -> Substitution -> Result. Never repeat boilerplate greetings.`;

          const result = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
          });

          if (result.text && result.text.trim()) {
            responseText = result.text.trim();
          }
        } catch (err) {
          console.warn('Gemini call error in fallback, using local response generator:', err);
        }
      }

      // If Gemini did not populate responseText, use structured educational fallback
      if (!responseText) {
        responseText = generateAcademicEngineeringFallback(query, intent, context);
      }
      break;
    }
  }

  return {
    text: responseText,
    intent,
    suggestedFollowUps: getRoleSuggestedFollowUps(role, intent),
    calculatedMetrics,
    hasRealData: true
  };
}

/**
 * Suggest contextual follow-up quick prompts based on role and intent
 */
export function getRoleSuggestedFollowUps(role: UserRole, intent?: string): string[] {
  if (role === 'student') {
    if (intent === 'student_attendance' || intent === 'student_attendance_recovery') {
      return [
        'How many classes can I safely miss? 🛡️',
        'What syllabus did I miss? 📚',
        'Make me a 7-day recovery plan 📅',
        'Check my marks and performance 🎯'
      ];
    }
    if (intent === 'student_missed_syllabus') {
      return [
        'Make me a 7-day study recovery plan 📅',
        'What should I prioritize for next exam? 📌',
        'Check my attendance numbers 📊'
      ];
    }
    return [
      'My Attendance status 📊',
      'What syllabus did I miss? 📚',
      'My Marks & performance 🎯',
      'How to reach 75% attendance? ⚡',
      'Explain DC Machine 💡'
    ];
  }

  if (role === 'faculty') {
    return [
      'Students with attendance shortage ⚠️',
      'Show my mentee summary 👥',
      'Assigned class syllabus progress 📚',
      'Students with weak test scores 📉'
    ];
  }

  if (role === 'hod') {
    return [
      'Department health summary 🏥',
      'Students with attendance deficit ⚠️',
      'Major student queries & grievances 📋',
      'Lagging syllabus subjects ⏳'
    ];
  }

  // Admin
  return [
    'Institution-wide attendance summary 📊',
    'Department performance comparison 🏛️',
    'Student query & grievance trends 📋',
    'Active faculty & student counts 👥'
  ];
}

/**
 * Local Engineering Concept / Numerical Fallback
 */
function generateAcademicEngineeringFallback(
  query: string,
  intent: string,
  context: ScopedAcademicContext
): string {
  const lower = query.toLowerCase();

  if (lower.includes('dc machine') || lower.includes('dc motor')) {
    return `### DC Machine Working Principle & Analysis
- **Core Principle**: Electromechanical conversion based on Lorentz Force Law ($\\vec{F} = I(\\vec{L} \\times \\vec{B})$).
- **Back EMF Equation**:
  $$E_b = \\frac{P \\Phi Z N}{60 A}$$
  - $P$ = Number of poles, $\\Phi$ = Flux per pole (Wb), $Z$ = Total armature conductors, $N$ = Speed (RPM), $A$ = Parallel paths.
- **Voltage Balance**: $V = E_b + I_a R_a$.
- **Starting Requirement**: At start ($N = 0 \\Rightarrow E_b = 0$), starter current would be dangerously high ($V/R_a$). Always use an external starter resistance!`;
  }

  if (lower.includes('transformer')) {
    return `### Transformer Working Principle & Transformation Ratio
- **Core Principle**: Mutual electromagnetic induction between primary and secondary coils sharing a high-permeability silicon steel core.
- **EMF Equation**:
  $$E = 4.44 \\cdot f \\cdot N \\cdot \\Phi_m$$
- **Transformation Ratio**:
  $$\\frac{V_2}{V_1} = \\frac{N_2}{N_1} = \\frac{I_1}{I_2} = K$$
- **Maximum Efficiency**: Occurs when variable copper losses ($I^2 R$) equal constant core iron losses ($W_{cu} = W_i$).`;
  }

  if (lower.includes('kirchhoff') || lower.includes('kcl') || lower.includes('kvl')) {
    return `### Kirchhoff's Circuit Laws
1. **Kirchhoff's Current Law (KCL)**:
   $$\\sum I = 0 \\quad \\text{(at any node)}$$
   *Rooted in the Law of Conservation of Electric Charge.*
2. **Kirchhoff's Voltage Law (KVL)**:
   $$\\sum V = 0 \\quad \\text{(in any closed circuit loop)}$$
   *Rooted in the Law of Conservation of Energy.*`;
  }

  return `### AcademicCore Academic Intelligence
- **Active Role**: **${context.role.toUpperCase()}**
- **Department**: **${context.user.department || context.user.departmentCode || 'Engineering'}**
- **Status**: Live database records synchronized.

Please choose a specific inquiry regarding your attendance, marks, missed syllabus, class risk, or departmental analytics!`;
}
