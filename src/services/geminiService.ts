import { GoogleGenAI } from '@google/genai';

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

export async function askAcademicCopilot(prompt: string, role: string): Promise<string> {
  if (aiInstance) {
    try {
      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are the AcademicCore AI Copilot for a college academic management system.
The active user has the role of "${role}".
Respond concisely, professionally, and formatted with clean bullet points or steps when appropriate.

User prompt: ${prompt}`
      });
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini API call error, falling back to local academic response:', err);
    }
  }

  // Graceful intelligent academic fallback
  const lower = prompt.toLowerCase();
  if (lower.includes('attendance') || lower.includes('shortage')) {
    return `### Attendance & Shortage Management Advisory
- **Statutory Threshold**: University and AICTE norms prescribe a minimum 75% aggregate attendance for exam eligibility.
- **Remedial Action**: For students between 65% and 74%, schedule 4 additional tutorial/remedial contact hours.
- **Official Documentation**: Verify medical certificates and official duty (OD) slips submitted within 7 days of absence.
- **Advisory Dispatch**: Issue formal SMS and email alerts to guardians once attendance dips below 75%.`;
  }

  if (lower.includes('syllabus') || lower.includes('unit')) {
    return `### Course Syllabus & Contact Hours Advisory
- **Lecture Hour Allocation**: Standard 4-credit course requires 45-50 planned lecture contact hours across 5 units.
- **Pacing Benchmark**: By Week 10 of 14, at least 70% of topics (Units I through IV) should be completed.
- **Remedial Catch-Up**: Conduct zero-hour problem-solving sessions or blended video modules for lagging units.
- **NAAC Audit Alignment**: Ensure course outcome (CO) mapping for every topic is logged in the lesson plan register.`;
  }

  if (lower.includes('cia') || lower.includes('mark') || lower.includes('grade')) {
    return `### Continuous Internal Assessment (CIA) Best Practices
- **Assessment Rigor**: CIA-1 and CIA-2 should test Bloom's Taxonomy Levels L1 (Remember) through L4 (Analyze).
- **Transparency**: Answer scripts must be distributed to students within 5 working days of exam completion.
- **Re-evaluation SLA**: Address student evaluation discrepancies within 48 hours via the AcademicCore Queries portal.`;
  }

  return `### AcademicCore Intelligent Assistance
- **Role Perspective**: Operating under **${role.toUpperCase()}** privileges.
- **Workflow Recommendation**: Maintain up-to-date daily session logs, monitor low-attendance warning triggers, and ensure all student grievances receive timestamped replies.
- **Accreditation Readiness**: Keep continuous internal assessment marks and syllabus progress logs in synchronization for automated NAAC/NBA dossier generation.`;
}
