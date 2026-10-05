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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  intent?: 'concept' | 'numerical' | 'coding' | 'exam' | 'career' | 'motivation' | 'quiz' | 'general';
  suggestedFollowUps?: string[];
}

export interface StudentAcademicContext {
  studentName?: string;
  departmentCode?: string;
  departmentName?: string;
  academicYear?: string | number;
  section?: string;
  enrolledSubjects?: string[];
  currentRole?: string;
}

// Prohibited content keywords for safety
const PROHIBITED_REGEX = /\b(porn|pornography|erotic|sex|sexy|sexual|nude|nudity|nsfw|xxx|strip|fetish|orgasm|incest|rape|pedophile|masturbat|horny|kill\s+yourself|suicide\s+method|hate\s+speech|slur|f\*\*k|bitch|bastard|asshole)\b/i;

// Safety Refusal Message
const SAFETY_REFUSAL_RESPONSE = `I'm here to help with your studies, engineering, career, and academic goals. Let's keep our conversation focused on that. 🙂

Would you like to:
- 💡 **Explain a core concept** from your engineering subjects
- 🔢 **Solve a tricky numerical** or derivation
- 🎯 **Prepare for upcoming exams & CIA tests**
- 🚀 **Explore engineering career paths & placement prep**`;

/**
 * Detect user intent based on the query text
 */
export function detectUserIntent(query: string): 'safety_violation' | 'concept' | 'numerical' | 'coding' | 'exam' | 'career' | 'motivation' | 'quiz' | 'quick_fact' | 'general' {
  if (PROHIBITED_REGEX.test(query)) {
    return 'safety_violation';
  }

  const lower = query.toLowerCase().trim();

  // Quiz intent
  if (/\b(quiz\s+me|test\s+me|quiz|ask\s+me\s+questions)\b/.test(lower)) {
    return 'quiz';
  }

  // Concept intent: "explain", "teach me", "what is", "how does ... work", "derivation", "principle of"
  if (
    /^(explain|teach\s+me|what\s+is|what\s+are|how\s+does|how\s+do|principle\s+of|working\s+of|concept\s+of|derivation\s+of)/.test(lower) ||
    lower.includes('explain') ||
    lower.includes('teach me') ||
    lower.includes('working principle') ||
    lower.includes('how it works')
  ) {
    return 'concept';
  }

  // Numerical / calculation intent
  if (
    /\b(numerical|calculate|solve|find\s+the\s+value|formula\s+for|substitution|step\s+by\s+step\s+solution)\b/.test(lower) ||
    /(\d+\s*[\+\-\*\/]\s*\d+)/.test(lower)
  ) {
    return 'numerical';
  }

  // Coding intent
  if (
    /\b(code|program|python|c\+\+|java|javascript|algorithm|function|debug|pointer|array|linked\s+list|recursion\s+code|sql\s+query)\b/.test(lower)
  ) {
    return 'coding';
  }

  // Exam prep intent
  if (
    /\b(exam|preparation|important\s+questions|pass\s+the\s+exam|cia|internal|viva|syllabus\s+coverage|score\s+good\s+marks)\b/.test(lower)
  ) {
    return 'exam';
  }

  // Career intent
  if (
    /\b(career|placement|internship|resume|interview|gate|higher\s+studies|job|salary|which\s+skill|roadmap)\b/.test(lower)
  ) {
    return 'career';
  }

  // Motivation / Study planning
  if (
    /\b(demotivated|tired|give\s+up|stress|study\s+plan|timetable|time\s+management|how\s+to\s+focus|backlog|backlogs)\b/.test(lower)
  ) {
    return 'motivation';
  }

  // Quick facts
  if (/^(who|when|where|name|define|unit\s+of|si\s+unit)/.test(lower)) {
    return 'quick_fact';
  }

  return 'general';
}

/**
 * Build rich system prompt enforcing the 12-step concept pattern, intent detection,
 * student context awareness, and engineering-companion personality.
 */
function buildSystemPrompt(context: StudentAcademicContext): string {
  const dept = context.departmentCode || context.departmentName || 'Engineering';
  const year = context.academicYear ? `${context.academicYear}` : 'Undergraduate';
  const subjects = context.enrolledSubjects && context.enrolledSubjects.length > 0
    ? context.enrolledSubjects.join(', ')
    : 'Core & Departmental Engineering Subjects';

  return `You are the "AI Study Companion" — a friendly, smart, encouraging, and professional personal study partner designed specifically for engineering students.
Your tone is: Friendly + Motivational + Clear + Professional + Slightly Cute.
Use small amounts of helpful emojis (👋, 💡, ⚡, 🎯, 🚀, ✨, 📌) but never overuse them.
Avoid robotic boilerplate, generic customer-support phrases, and excessive policy disclaimers.

STUDENT ACADEMIC CONTEXT:
- Student Name: ${context.studentName || 'Student'}
- Department / Branch: ${dept}
- Academic Year: ${year}
- Enrolled / Relevant Subjects: ${subjects}
When giving practical examples, prioritize relevant ${dept} applications where natural, but always welcome any legitimate engineering or science question!

CORE BEHAVIOR RULES:

1. FIXED CONCEPT-TEACHING MODE:
When the student asks to explain or teach any engineering concept (e.g. "Explain DC Machine", "Teach me Transformer", "What is recursion?", "Explain Kirchhoff's law", "Teach me semiconductor", etc.), you MUST automatically use this structured 12-step learning pattern:
### 1. What?
Explain the concept in very simple, jargon-free language.
### 2. Why?
Explain why the concept exists and what real-world problem it solves.
### 3. Build Intuition (Analogy)
Provide a vivid, relatable real-life analogy that makes the idea click instantly.
### 4. How Does It Work?
Step-by-step breakdown from zero assumptions.
### 5. Visualize
Provide an ASCII schematic diagram, flow representation, or text-based block diagram.
### 6. Simple Example
One relatable practical engineering example.
### 7. Technical Understanding
Categorize technical depth clearly:
- **Must Know**: Essential core theory every engineer must master.
- **Good to Know**: Valuable nuance and operational traits.
- **Advanced**: In-depth industrial or higher-level consideration.
### 8. Formula / Rules
Define every mathematical variable FIRST before showing the equation, along with conditions and SI units!
### 9. Solved Example
Solve one representative standard problem step-by-step (Given → Formula → Substitution → Result).
### 10. Common Mistakes
Explain 2-3 specific traps or errors students frequently make in exams/labs.
### 11. Quick Revision
Summarize in 5–8 high-yield bullet points.
### 12. Check My Understanding
Provide 5 progressive questions (Level 1: Basic → Level 5: Application/Challenging).
CRITICAL: Do NOT reveal the answers immediately! Encourage the student to try them.

2. OTHER QUESTION TYPES:
- Numerical: Structure strictly as Given → Formula → Substitution → Step-by-Step Calculation → Final Answer (with units) → Engineering Takeaway.
- Coding: Concept → Logic / Algorithm → Example → Clean Code (with comments) → Step-by-step explanation → Common bugs / edge cases → Practice prompt.
- Exam Preparation: High-Yield Topics → Priority Order → Conceptual Summary → Typical Exam Questions → 5-Day Revision Strategy.
- Career / Placement: Current Profile → Core vs Tech Paths → Required Skills Roadmap → Project Ideas → Interview & Resume Advice.
- Motivation / Time Management: Practical, supportive, and actionable advice tailored to an engineering student's workload.
- Quick Factual: Give a crisp, direct answer in the first 2 sentences, followed by brief technical context.

3. STRICT CONTENT BOUNDARIES:
- For sexual, erotic, abusive, hateful, or degrading content, respond ONLY with:
"I'm here to help with your studies, engineering, career, and academic goals. Let's keep our conversation focused on that. 🙂"
followed by a polite redirect to an academic topic.
- For harmless off-topic questions, answer briefly in 1-2 friendly sentences and naturally steer back to their engineering studies.

4. ENGAGEMENT & CONVERSATION MEMORY:
- At the end of every substantive answer, offer 2-3 interactive next steps (e.g. "Want me to quiz you on this?", "Want a numerical problem on this?", "Want to see viva/interview questions?").
- Retain awareness of earlier conversation topics (e.g. if previous topic was DC Machine and student asks "what about the armature?", know they refer to the DC Machine armature).`;
}

/**
 * Ask the AI Study Companion
 */
export async function askStudyCompanion(
  query: string,
  context: StudentAcademicContext,
  history: ChatMessage[] = []
): Promise<{ text: string; intent: string; suggestedFollowUps: string[] }> {
  const intent = detectUserIntent(query);

  // Safety Boundary Guardrail
  if (intent === 'safety_violation') {
    return {
      text: SAFETY_REFUSAL_RESPONSE,
      intent: 'safety_violation',
      suggestedFollowUps: [
        'Explain DC Machine',
        'Teach me Kirchhoff\'s Laws',
        'How to prepare for campus placements?',
        'Give me a 5-day study plan'
      ]
    };
  }

  // 1. If Gemini AI instance is configured, try live AI generation
  if (aiInstance) {
    try {
      const systemPrompt = buildSystemPrompt(context);

      // Build context history window (last 6 messages)
      const recentHistory = history.slice(-6).map(m => `${m.sender === 'user' ? 'Student' : 'AI Companion'}: ${m.text}`).join('\n\n');

      const fullPrompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${recentHistory}\n\nCurrent Student Query: ${query}`;

      const response = await aiInstance.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt
      });

      if (response.text && response.text.trim()) {
        const text = response.text.trim();
        return {
          text,
          intent,
          suggestedFollowUps: generateFollowUps(query, intent, context)
        };
      }
    } catch (err) {
      console.warn('Gemini AI call failed, gracefully switching to local engineering study engine:', err);
    }
  }

  // 2. Intelligent Built-in Engineering Knowledge Engine (Fallback & Instant Offline Mode)
  const localResponse = generateLocalEngineeringResponse(query, intent, context, history);
  return {
    text: localResponse.text,
    intent,
    suggestedFollowUps: localResponse.suggestedFollowUps
  };
}

/**
 * Generate contextual follow-up options
 */
function generateFollowUps(
  query: string,
  intent: string,
  _context: StudentAcademicContext
): string[] {
  if (intent === 'concept') {
    return [
      'Want me to quiz you on this concept? 🎯',
      'Show me a representative numerical on this 🔢',
      'What are common viva/interview questions on this? 🎙️',
      'Give me a quick 1-minute revision summary ⚡'
    ];
  }

  if (intent === 'numerical') {
    return [
      'Give me another practice problem to solve 📝',
      'Explain the underlying concept behind this formula 💡',
      'What if the input values are doubled? 🔍'
    ];
  }

  if (intent === 'coding') {
    return [
      'What is the time and space complexity? ⏱️',
      'Show an optimized approach for this 🚀',
      'Give me 3 edge-case tests to check 🧪'
    ];
  }

  if (intent === 'exam') {
    return [
      'Give me the 5 highest-weightage derivations 📌',
      'Create a 3-day rapid revision timetable 📅',
      'Quiz me on the most important definitions 🎯'
    ];
  }

  if (intent === 'career') {
    return [
      'What top 3 projects should I build for my resume? 🛠️',
      'How to prepare for technical interview rounds? 💼',
      'Core engineering vs Software: what is right for me? ⚖️'
    ];
  }

  return [
    'Explain a core concept from my branch 💡',
    'Solve an engineering numerical with me 🔢',
    'Help me plan my study schedule for this week 📅'
  ];
}

/**
 * Rich Local Engineering Knowledge Engine
 * Implements the 12-step concept pattern, numericals, coding, exam prep, and conversation memory!
 */
function generateLocalEngineeringResponse(
  query: string,
  intent: string,
  context: StudentAcademicContext,
  history: ChatMessage[]
): { text: string; suggestedFollowUps: string[] } {
  const lower = query.toLowerCase().trim();
  const dept = (context.departmentCode || context.departmentName || 'Engineering').toUpperCase();

  // Check multi-turn memory: if query refers to previous subject
  const lastUserMessage = [...history].reverse().find(m => m.sender === 'user');
  const isArmatureFollowup = lower.includes('armature') || (lastUserMessage?.text.toLowerCase().includes('dc machine') && lower.includes('part'));

  // 1. Follow-up Memory: Armature in DC Machine
  if (isArmatureFollowup) {
    return {
      text: `### Deep Dive: The Armature in a DC Machine ⚡

Hey! Let's zoom into the **Armature** from our DC Machine discussion.

#### What is the Armature?
The armature is the **heart of the machine** — it is the rotating coil system where the actual energy conversion occurs (electromechanical conversion).

#### Key Components of the Armature:
1. **Armature Core**: Made of high-permeability, low-hysteresis silicon steel stampings (0.35mm to 0.5mm thick). 
   - *Why laminated?* To drastically reduce **Eddy Current Losses** ($P_e \\propto f^2 B_m^2 t^2$).
2. **Armature Windings**: Insulated copper conductors fitted into slots. Configured as:
   - **Lap Winding**: $A = P$ (number of parallel paths equals poles) → High Current, Low Voltage applications.
   - **Wave Winding**: $A = 2$ (always 2 parallel paths) → High Voltage, Low Current applications.
3. **Commutator**: Segmented copper ring that acts as a mechanical inverter/rectifier, reversing current direction in each coil as it passes magnetic neutral axis.

#### Critical Formula & Variables:
- Generated Back EMF:
  $$E_b = \\frac{P \\Phi Z N}{60 A}$$
  - $P$ = Number of poles
  - $\\Phi$ = Magnetic flux per pole (Webers, Wb)
  - $Z$ = Total number of active armature conductors
  - $N$ = Armature speed in RPM
  - $A$ = Number of parallel paths ($P$ for lap, $2$ for wave)

#### Common Student Trap:
Students often forget that **in a DC motor, $E_b$ acts as a governor**. If load increases, speed drops slightly, $E_b$ decreases, allowing higher armature current $I_a = (V - E_b)/R_a$ to produce more torque!

Want to see a numerical calculating armature current and torque, or check the commutator action next?`,
      suggestedFollowUps: [
        'Calculate armature current numerical 🔢',
        'Explain Commutator action in detail 💡',
        'Quiz me on DC Machine armature 🎯'
      ]
    };
  }

  // 2. DC Machine (Full 12-Step Teaching Pattern)
  if (lower.includes('dc machine') || lower.includes('dc motor') || lower.includes('dc generator')) {
    return {
      text: `### 1. What?
A **DC Machine** is an electromechanical energy converter that works on direct current. If you supply electrical energy and get mechanical rotation, it is a **DC Motor**. If you provide mechanical rotation and get electrical DC output, it is a **DC Generator**. Both use the exact same fundamental physical architecture!

---

### 2. Why?
Before AC power and modern variable frequency drives took over, DC machines were the undisputed kings of **precise speed and torque control** (e.g. electric trains, elevators, rolling mills, cranes). Even today, BLDC motors (their modern brushless cousins) power electric vehicles, drones, and computer cooling fans because of their high starting torque and linear control characteristics.

---

### 3. Build Intuition (Analogy)
Imagine a children's swing. To keep the swing moving in one direction continuously, you must push it at just the right instant in the direction of motion. If you pushed in reverse, it would halt.
In a DC machine, the magnetic field is the push. But as the coil rotates 180°, the push would oppose rotation! The **commutator** acts like a smart switcher that automatically flips the electrical connections every half-turn so the push is ALWAYS in the forward direction.

---

### 4. How Does It Work?
1. **Magnetic Field Creation**: Stator field poles create a uniform magnetic flux ($\\Phi$) from North to South.
2. **Current Flow in Armature**: External DC voltage pushes current ($I$) through the carbon brushes and commutator into the armature coil.
3. **Lorentz Force**: According to Faraday & Lorentz:
   $$\\vec{F} = I (\\vec{L} \\times \\vec{B})$$
   One side of the loop experiences a force upwards, while the opposite side experiences a force downwards.
4. **Continuous Rotation**: The two opposite forces create a mechanical torque (couple) that spins the shaft continuously.

---

### 5. Visualize (Schematic Diagram)
\`\`\`
      [ NORTH POLE ]
          |  |  |  |  (Magnetic Flux B --->)
       +-----------+
       |   Coil    | ===> Shaft Rotation (Torque T)
       +-----------+
       [   [===]   ]  Commutator Split Rings
           /   \\
        [+]     [-]   Carbon Brushes connected to DC Supply
          |  |  |  |
      [ SOUTH POLE ]
\`\`\`

---

### 6. Simple Example
Consider the starter motor of an automobile. It draws a heavy DC surge (150A–200A) from the 12V lead-acid battery to generate massive initial breakaway torque ($T \\propto I_a$) to crank the heavy internal combustion engine from rest.

---

### 7. Technical Understanding
- **Must Know**:
  - Faraday's Law of Electromagnetic Induction.
  - Fleming's Left Hand Rule (for Motors: Thrust, Field, Current - Father, Mother, Child).
  - Fleming's Right Hand Rule (for Generators).
- **Good to Know**:
  - Armature reaction (cross-magnetization and demagnetization) weakens main field flux at heavy loads.
  - Interpoles and compensating windings neutralize armature reaction under the pole shoes.
- **Advanced**:
  - Ward-Leonard method of speed control for four-quadrant regenerative operation.

---

### 8. Formula / Rules
*All variables defined before formula:*
- $V$ = Applied Terminal Voltage (Volts, V)
- $E_b$ = Back EMF generated in armature (Volts, V)
- $I_a$ = Armature Current (Amperes, A)
- $R_a$ = Armature Winding Resistance (Ohms, $\\Omega$)
- $\\Phi$ = Flux per pole (Webers, Wb)
- $N$ = Rotational Speed (RPM)
- $Z$ = Total number of armature conductors
- $P$ = Number of poles, $A$ = Number of parallel paths

1. **Voltage Equation of DC Motor**:
   $$V = E_b + I_a R_a$$
2. **Back EMF Equation**:
   $$E_b = \\frac{P \\Phi Z N}{60 A}$$
3. **Speed Relationship**:
   $$N \\propto \\frac{E_b}{\\Phi} = \\frac{V - I_a R_a}{\\Phi}$$
4. **Electromagnetic Torque**:
   $$T = \\frac{1}{2\\pi} \\cdot \\left(\\frac{P}{A}\\right) \\cdot \\Phi \\cdot Z \\cdot I_a \\quad \\Rightarrow \\quad T \\propto \\Phi I_a$$

---

### 9. Solved Example
**Problem**: A 220V DC shunt motor has an armature resistance $R_a = 0.5\\ \\Omega$. At full load, it draws an armature current of $20\\text{ A}$ while running at $1000\\text{ RPM}$. Calculate the back EMF generated.
- **Given**:
  - Terminal Voltage $V = 220\\text{ V}$
  - Armature Resistance $R_a = 0.5\\ \\Omega$
  - Armature Current $I_a = 20\\text{ A}$
- **Formula**:
  $$E_b = V - I_a R_a$$
- **Substitution**:
  $$E_b = 220 - (20 \\times 0.5) = 220 - 10$$
- **Final Result**:
  $$E_b = 210\\text{ Volts}$$
- **Concept Takeaway**: The back EMF ($210\\text{V}$) opposes the supply voltage ($220\\text{V}$), limiting the current to just $20\\text{A}$. If the motor were stalled ($N = 0 \\Rightarrow E_b = 0$), the current would skyrocket to $220 / 0.5 = 440\\text{A}$, burning out the coils!

---

### 10. Common Mistakes
1. ❌ **Forgetting Starter Requirement**: Assuming you can start a large DC motor directly across the line. (At $N=0$, $E_b=0$, resulting in destructive starter current; always use a 3-point or 4-point starter!).
2. ❌ **Confusing Motor and Generator Back EMF**: Writing $V = E_b - I_a R_a$ for a motor instead of $V = E_b + I_a R_a$.
3. ❌ **Losing Field in Shunt Motor**: If field circuit breaks ($\\Phi \\to 0$), speed $N \\propto 1/\\Phi \\to \\infty$, causing dangerous runaway overspeed!

---

### 11. Quick Revision (Key Points)
1. DC machine operates via interaction of stator magnetic field and rotor armature conductors.
2. Commutator + brushes convert alternating induced EMF inside rotor to unidirectional DC output.
3. Back EMF ($E_b$) acts as a self-regulating electrical governor.
4. Torque is directly proportional to flux and armature current ($T \\propto \\Phi I_a$).
5. Speed can be controlled via armature resistance control (below base speed) or field flux weakening (above base speed).

---

### 12. Check My Understanding (Progressive Quiz)
*Try these 5 questions on paper first — do NOT check answers yet!*
1. **Level 1 (Easy)**: What rule determines the direction of force on a current-carrying conductor in a motor?
2. **Level 2 (Basic)**: Why must a DC motor never be started without an external starter resistance?
3. **Level 3 (Application)**: What happens to the speed of a DC shunt motor if its field winding opens while running on load?
4. **Level 4 (Analysis)**: Why are armature stampings laminated rather than cast as a solid iron cylinder?
5. **Level 5 (Challenging)**: For high-voltage, low-current DC generators, which winding is preferred: Lap or Wave, and why?

Ready to check your answers or want a numerical problem next? 🚀`,
      suggestedFollowUps: [
        'Check my answers for the 5 quiz questions 🎯',
        'Solve another numerical on DC Motor speed control 🔢',
        'Explain the Transformer next 💡'
      ]
    };
  }

  // 3. Transformer (Full 12-Step Teaching Pattern)
  if (lower.includes('transformer')) {
    return {
      text: `### 1. What?
A **Transformer** is a static electrical machine that transfers electrical energy from one AC circuit to another at the **exact same frequency**, while stepping the voltage up or down via magnetic induction. Because it has zero moving parts, its efficiency is unmatched (often > 97–99%)!

---

### 2. Why?
Power stations generate electricity at medium voltage (11kV), but transporting high current over long distances causes massive $I^2 R$ transmission heat loss.
By stepping voltage up to 400kV or 765kV using transformers, current drops drastically ($I = P/V$). Near your city and home, transformers step voltage back down to 415V / 230V for safe consumption.

---

### 3. Build Intuition (Analogy)
Think of a transformer like a **gearbox in a car or bicycle**.
- Low Gear (Step-down): Wheels spin slower (lower speed/voltage), but give massive torque (high current) to climb hills.
- High Gear (Step-up): High rotational speed (high voltage), but less torque (lower current).
In both cases, total input power equals output power (minus tiny frictional/core losses).

---

### 4. How Does It Work?
1. Alternating AC voltage applied to primary coil creates an alternating magnetizing current.
2. This produces a dynamic time-varying magnetic flux ($\\Phi = \\Phi_m \\sin \\omega t$) in the closed ferromagnetic core.
3. The common core links this alternating flux with the secondary winding.
4. By Faraday's Law, alternating EMF is induced in the secondary winding ($e_2 = -N_2 \\frac{d\\Phi}{dt}$).

---

### 5. Visualize (ASCII Core Diagram)
\`\`\`
       PRIMARY COIL (N1)             SECONDARY COIL (N2)
            | |                             | |
         +--[#]--+=======================+--[#]--+
   V1 ~  |  [#]  |   FERROMAGNETIC CORE  |  [#]  |  ~ V2
  Input  |  [#]  |   (Silicon Steel)     |  [#]  |  Output (Load)
         +--[#]--+=======================+--[#]--+
            | |    <--- Core Flux Phi ---   | |
\`\`\`

---

### 6. Simple Example
Your phone charger contains a small high-frequency step-down transformer that converts 230V AC from your home wall socket down to 5V AC, which is then rectified and filtered into 5V DC to safely charge the lithium battery.

---

### 7. Technical Understanding
- **Must Know**:
  - Faraday's Law of Mutual Induction.
  - Transformation Ratio: $K = \\frac{V_2}{V_1} = \\frac{N_2}{N_1} = \\frac{I_1}{I_2}$.
  - Core Losses (Iron losses: Hysteresis + Eddy current) are constant at all loads.
- **Good to Know**:
  - Copper losses ($I^2 R$) vary with square of load ($P_{cu} = x^2 P_{cu,fl}$).
  - Maximum efficiency condition occurs when **Copper Loss = Iron Loss** ($W_{cu} = W_i$).
- **Advanced**:
  - All-day efficiency is used for distribution transformers (energized 24h, loaded intermittently).

---

### 8. Formula / Rules
*All variables defined before formula:*
- $E_1, E_2$ = Primary and Secondary induced EMF (Volts)
- $N_1, N_2$ = Number of primary and secondary turns
- $f$ = AC supply frequency (Hertz, Hz)
- $\\Phi_m$ = Maximum core magnetic flux (Webers, Wb)
- $B_m$ = Maximum flux density (Tesla, T), $A$ = Core cross-sectional area ($m^2$)

1. **EMF Equation of Transformer**:
   $$E_1 = 4.44 \\cdot f \\cdot N_1 \\cdot \\Phi_m$$
   $$E_2 = 4.44 \\cdot f \\cdot N_2 \\cdot \\Phi_m$$
2. **Transformation Ratio**:
   $$\\frac{E_2}{E_1} = \\frac{N_2}{N_1} = \\frac{I_1}{I_2} = K$$
3. **Efficiency**:
   $$\\eta = \\frac{\\text{Output Power}}{\\text{Output Power} + P_i + P_{cu}} \\times 100\\%$$

---

### 9. Solved Example
**Problem**: A 250kVA single-phase transformer has $N_1 = 500$ turns and $N_2 = 50$ turns. Connected to $2500\\text{V}, 50\\text{Hz}$ supply. Calculate secondary voltage and maximum flux in core.
- **Given**: $V_1 = 2500\\text{V}, N_1 = 500, N_2 = 50, f = 50\\text{Hz}$.
- **Step 1: Secondary Voltage**:
  $$\\frac{V_2}{V_1} = \\frac{N_2}{N_1} \\Rightarrow V_2 = 2500 \\times \\left(\\frac{50}{500}\\right) = 250\\text{ Volts}$$
- **Step 2: Maximum Flux $\\Phi_m$**:
  $$E_1 = 4.44 \\cdot f \\cdot N_1 \\cdot \\Phi_m$$
  $$\\Phi_m = \\frac{2500}{4.44 \\times 50 \\times 500} = \\frac{2500}{111000} \\approx 0.0225\\text{ Wb} = 22.5\\text{ mWb}$$
- **Final Result**: Secondary Voltage = $250\\text{ V}$, Core Flux = $22.5\\text{ mWb}$.

---

### 10. Common Mistakes
1. ❌ **Connecting to DC supply**: Applying DC to a transformer primary results in zero time-varying flux ($d\\Phi/dt = 0 \\Rightarrow E_1 = 0$), causing massive current $I = V/R_1$ that will burn the winding!
2. ❌ **Confusing frequency**: Thinking frequency changes between primary and secondary (Frequency remains strictly constant!).

---

### 11. Quick Revision (Key Points)
1. Works strictly on alternating current (AC) via mutual electromagnetic induction.
2. Frequency remains completely unchanged from input to output.
3. Step-up increases voltage and decreases current; Step-down decreases voltage and increases current.
4. Max efficiency occurs when variable copper loss equals constant iron loss.
5. Open Circuit (OC) test measures core loss; Short Circuit (SC) test measures copper loss.

---

### 12. Check My Understanding (Progressive Quiz)
1. **Level 1 (Easy)**: What happens if a 230V transformer primary is connected to a 230V DC battery?
2. **Level 2 (Basic)**: Why is the core of a transformer made of laminated silicon steel?
3. **Level 3 (Application)**: If a transformer has 1000 primary turns and 200 secondary turns, is it step-up or step-down?
4. **Level 4 (Analysis)**: At what condition does a transformer operate with peak maximum efficiency?
5. **Level 5 (Challenging)**: Why is transformer rating expressed in kVA or MVA rather than kW?

Want to check these quiz answers or explore the equivalent circuit model? 🎯`,
      suggestedFollowUps: [
        'Check quiz answers for Transformer 🎯',
        'Explain Open Circuit and Short Circuit tests 🔬',
        'Solve a numerical on Transformer efficiency 🔢'
      ]
    };
  }

  // 4. Kirchhoff's Laws (KCL & KVL)
  if (lower.includes('kirchhoff') || lower.includes('kcl') || lower.includes('kvl')) {
    return {
      text: `### 1. What?
**Kirchhoff's Laws** are the two foundational conservation laws of electrical engineering formulated by Gustav Kirchhoff in 1845.
- **KCL (Kirchhoff's Current Law)**: Deals with currents meeting at an electrical junction (node).
- **KVL (Kirchhoff's Voltage Law)**: Deals with voltages around any closed loop in a circuit.

---

### 2. Why?
Ohm's Law ($V = IR$) works only for simple single-loop or single-resistor circuits. In real-world engineering, circuits have multiple loops, cross-connected branches, and independent power sources. Kirchhoff's laws allow you to formulate systematic simultaneous equations (Nodal and Mesh analysis) to solve for any unknown voltage or current in ANY network!

---

### 3. Build Intuition (Analogy)
- **KCL Analogy (Plumbing T-Pipe)**: If 10 liters/sec of water enters a pipe junction from the main pipe, exactly 10 liters/sec must exit through the branch pipes. Pipes cannot store or destroy water.
- **KVL Analogy (Roller Coaster)**: A roller coaster climbs up 100 meters (voltage rise from battery), then drops 60m on hill 1, and 40m on hill 2 (voltage drops across resistors). When it returns to the starting platform, the net elevation change is exactly zero!

---

### 4. How Does It Work?
- **KCL (Conservation of Charge)**:
  Charge cannot accumulate at a geometric point. Therefore:
  $$\\sum I_{\\text{in}} = \\sum I_{\\text{out}} \\quad \\text{or} \\quad \\sum I = 0$$
- **KVL (Conservation of Energy)**:
  The work done in moving a unit charge around any closed loop must equal zero:
  $$\\sum V_{\\text{rises}} = \\sum V_{\\text{drops}} \\quad \\text{or} \\quad \\sum V = 0$$

---

### 5. Visualize (Node and Loop)
\`\`\`
          I1 ---> \\         / ---> I3
                   \\       /
                    O Node
                   /       \\
          I2 ---> /         \\ ---> I4
      KCL:  I1 + I2 = I3 + I4  (No charge lost)
\`\`\`

---

### 6. Simple Example
In your home switchboard, current comes from the main breaker ($15\\text{A}$) and splits into your laptop charger ($2\\text{A}$), ceiling fan ($1\\text{A}$), and air conditioner ($12\\text{A}$).
$$15\\text{A} = 2\\text{A} + 1\\text{A} + 12\\text{A} \\quad \\text{(KCL in action!)}$$

---

### 7. Technical Understanding
- **Must Know**:
  - KCL is rooted in the **Law of Conservation of Charge**.
  - KVL is rooted in the **Law of Conservation of Energy**.
  - Sign convention consistency: If clockwise travel through battery goes from $-$ to $+$, it is a potential rise ($+V$); going through a resistor in direction of current is a potential drop ($-IR$).
- **Good to Know**:
  - Supernode analysis is used when a voltage source exists between two non-reference nodes.
  - Supermesh analysis is used when a current source is shared between two meshes.
- **Advanced**:
  - KCL fails at ultra-high frequencies (GHz microwave circuits) where wavelength is comparable to circuit dimensions, and displacement current ($dD/dt$) in dielectric radiation must be accounted for using Maxwell's equations.

---

### 8. Formula & Rules
1. **Kirchhoff's Current Law**:
   $$\\sum_{k=1}^{n} I_k = 0 \\quad \\text{(at any node)}$$
2. **Kirchhoff's Voltage Law**:
   $$\\sum_{k=1}^{m} V_k = 0 \\quad \\text{(in any closed mesh)}$$

---

### 9. Solved Example
**Problem**: A single loop has a $12\\text{V}$ battery connected to two series resistors $R_1 = 4\\,\\Omega$ and $R_2 = 2\\,\\Omega$. Find current $I$ and voltage across each resistor.
- **Apply KVL clockwise**:
  $$+12 - I(4) - I(2) = 0$$
  $$12 - 6I = 0 \\implies I = 2\\text{ Amperes}$$
- **Voltages**:
  $$V_{R1} = 2\\text{A} \\times 4\\,\\Omega = 8\\text{V}$$
  $$V_{R2} = 2\\text{A} \\times 2\\,\\Omega = 4\\text{V}$$
- **Verification**: $8\\text{V} + 4\\text{V} = 12\\text{V}$ (Energy strictly conserved!).

---

### 10. Common Mistakes
1. ❌ **Inconsistent Sign Conventions**: Mixing positive and negative signs midway through loop traversal.
2. ❌ **Assuming Node Stores Charge**: Writing $I_{\\text{in}} > I_{\\text{out}}$ without considering ground or return path.

---

### 11. Quick Revision
1. KCL applies to nodes $\\to$ Conservation of Charge $\\to$ Nodal Analysis.
2. KVL applies to closed loops $\\to$ Conservation of Energy $\\to$ Mesh Analysis.
3. Sign convention: Entering positive terminal of passive element is a voltage drop ($-$).
4. Number of independent KVL equations = $b - n + 1$ (branches $b$, nodes $n$).

---

### 12. Check My Understanding (5 Quiz Questions)
1. **Level 1**: Which fundamental physics conservation law underpins KCL?
2. **Level 2**: If $5\\text{A}$ and $3\\text{A}$ enter a node, and $4\\text{A}$ leaves through branch 1, what leaves through branch 2?
3. **Level 3**: Why does KVL equate the algebraic sum of voltages in a loop to zero?
4. **Level 4**: When do you create a "Supermesh" in circuit analysis?
5. **Level 5**: At what operating conditions or frequency range does classic lumped KCL begin to break down?`,
      suggestedFollowUps: [
        'Check my KCL/KVL quiz answers 🎯',
        'Solve a 2-mesh circuit problem using KVL 🔢',
        'Explain Nodal Analysis step-by-step 💡'
      ]
    };
  }

  // 5. Recursion (Coding / Computer Science)
  if (lower.includes('recursion') || lower.includes('recursive')) {
    return {
      text: `### 1. What?
**Recursion** is a programming technique where a function calls itself to break down a large, intimidating problem into identical, bite-sized sub-problems, until it reaches a trivial baseline condition called the **Base Case**.

---

### 2. Why?
Many natural data structures in engineering are self-similar and hierarchical — like directory trees, JSON documents, XML tags, circuit netlists, and expression parse trees. Writing iterative \`while\` loops with manual stacks for these is messy and bug-prone. Recursion makes complex tree, graph, and divide-and-conquer algorithms (like QuickSort and MergeSort) remarkably clean and expressive.

---

### 3. Build Intuition (Analogy)
Imagine you are seated in the middle of a dark movie cinema and want to know what row number you are in.
Instead of walking down to the screen to count:
1. You ask the person directly in front of you: *"Hey, what row are you in?"*
2. That person doesn't know either, so they ask the person in front of them.
3. This repeats until someone in Row 1 says: *"I'm in Row 1!"* (This is the **Base Case**).
4. That answer bubbles back row-by-row, adding $+1$ at each step, until it reaches you!

---

### 4. How Does It Work?
Every time a function calls itself, the computer's CPU allocates a new **Stack Frame** on the **Call Stack** storing:
- Local variables
- Parameter values
- Return address to resume execution
When the base case is hit, stack frames pop off one-by-one, returning results back up the chain.

---

### 5. Visualize (Call Stack for Factorial of 3)
\`\`\`
 CALLING DOWN (Push to Stack):
   fact(3) -> waiting for fact(2) * 3
     fact(2) -> waiting for fact(1) * 2
       fact(1) -> BASE CASE REACHED! returns 1

 RETURNING UP (Pop from Stack):
       fact(1) returns 1
     fact(2) computes 1 * 2 = 2
   fact(3) computes 2 * 3 = 6
\`\`\`

---

### 6. Simple Example
Calculating $n!$ (Factorial):
- Definition: $n! = n \\times (n-1)!$
- Base Case: $0! = 1$ and $1! = 1$

---

### 7. Technical Understanding
- **Must Know**:
  - Two mandatory components: **Base Case** (termination) + **Recursive Step** (progress toward base case).
  - Time & Space Complexity analysis using recurrence relations (e.g. Master Theorem).
- **Good to Know**:
  - **Tail Recursion**: When the recursive call is the absolute final statement; modern compilers can optimize this into a loop to prevent stack overflow!
- **Advanced**:
  - Overlapping subproblems in naive recursion (e.g. Fibonacci $O(2^n)$) require **Memoization / Dynamic Programming** to reduce complexity to $O(n)$.

---

### 8. Clean Code Implementation (Python / C++)
\`\`\`python
def factorial(n: int) -> int:
    # 1. Base Case: prevents infinite loop
    if n <= 1:
        return 1
    
    # 2. Recursive Step: smaller sub-problem
    return n * factorial(n - 1)

# Example execution:
print(factorial(5)) # Output: 120
\`\`\`

---

### 9. Common Mistakes
1. ❌ **Missing Base Case**: Leads immediately to \`RecursionError: maximum recursion depth exceeded\` (Stack Overflow)!
2. ❌ **Not Progressing Toward Base Case**: e.g., calling \`foo(n)\` instead of \`foo(n - 1)\`.
3. ❌ **Unnecessary Recomputations**: Calling tree recursion without memoization (like naive Fibonacci computing \`fib(3)\` thousands of times).

---

### 10. Quick Revision
1. Recursion = Base Case + Recursive Relation.
2. Uses the Call Stack in memory (LIFO order).
3. If memory runs out before base case $\\to$ Stack Overflow.
4. MergeSort and QuickSort use $O(n \\log n)$ divide-and-conquer recursion.

---

### 11. Check My Understanding (5 Quiz Questions)
1. **Level 1**: What happens if a recursive function does not have a base case?
2. **Level 2**: In which memory segment are recursive function calls stored?
3. **Level 3**: What is the time complexity of naive recursive Fibonacci without memoization?
4. **Level 4**: What is Tail Call Optimization (TCO)?
5. **Level 5**: Can every recursive algorithm be rewritten iteratively? (Why or why not?)`,
      suggestedFollowUps: [
        'Check my recursion quiz answers 🎯',
        'Show me how to convert recursion to dynamic programming 🚀',
        'Solve Binary Search recursively 💻'
      ]
    };
  }

  // 6. Exam Preparation / CIA Test Advice
  if (intent === 'exam') {
    return {
      text: `### 🎯 High-Yield Exam Preparation Framework

Here is a practical, battle-tested strategy for engineering semester & CIA exams:

#### 1. The 80/20 High-Yield Strategy
In every engineering subject, **20% of the syllabus accounts for 80% of the exam marks**:
- **Derivations**: Teachers love asking derivations (e.g., EMF equations, Bernouilli's, Navier-Stokes, Fourier Transforms). Master these 4–5 derivations with zero hesitation.
- **Standard Numericals**: Every unit has 2 standard textbook numerical formats that appear every single year with modified numbers.
- **Block Diagrams & Flowcharts**: Clean diagrams fetch 60–70% of question marks even if the text explanation is brief!

#### 2. 5-Day Countdown Plan:
- **Day 1 (Scouting)**: Collect previous 3 years' university question papers (PYQs). Mark topics asked repeatedly.
- **Day 2 (Derivations & Definitions)**: Write down all key formulas and derivations in a single 4-page cheat sheet.
- **Day 3 (Numericals)**: Solve 2 representative numerical problems per unit. Focus on unit conversions (e.g., mm to m, RPM to rad/s, kW to W).
- **Day 4 (Diagrams & Core Theory)**: Practice drawing circuits, state diagrams, and cross-sections without looking at notes.
- **Day 5 (Speed Run)**: Set a timer for 60 minutes and solve one previous year question paper under exam conditions.

#### 3. Scoring Hacks in the Exam Hall:
1. Start with your strongest 10-mark question to build confidence and make a great first impression on the examiner.
2. Put final numerical answers inside a neat box with proper SI units (e.g., $\\boxed{P = 14.2\\text{ kW}}$).
3. Always state assumptions upfront (e.g., *"Assuming steady-state operation and ideal switches"*).

Which subject are you preparing for right now? Tell me the name and unit, and I'll give you the top 5 predicted questions! 🚀`,
      suggestedFollowUps: [
        'Give me top predicted questions for my subject 📌',
        'Create a formula cheat-sheet for my syllabus 📝',
        'Quiz me on high-yield exam concepts 🎯'
      ]
    };
  }

  // 7. Career / Placement Guidance
  if (intent === 'career') {
    return {
      text: `### 🚀 Engineering Career & Placement Roadmap

Whether your goal is a **Core Engineering Company**, **Top Tech / Software**, or **Higher Studies (GATE/MS)**, here is your clear engineering roadmap:

#### Phase 1: Year-by-Year Milestones
- **1st Year (Foundations)**:
  - Strong grasp of Math & Physics basics.
  - Learn one programming language thoroughly (Python or C++).
  - Join a college technical club (Robotics, IEEE, Coding Club, SAE Baja).
- **2nd Year (Core Skills & Projects)**:
  - Master Data Structures & Algorithms (if tech) OR Core Simulation Tools like MATLAB/Simulink, AutoCAD, ANSYS, Cadence, Proteus (if core).
  - Build your first functional hardware or software project outside coursework!
- **3rd Year (Internship & Depth)**:
  - Secure a summer internship (via LinkedIn outreach, college placement cell, or open-source programs like GSoC).
  - Begin focused GATE / GRE preparation if aiming for higher studies.
  - Solve 150+ LeetCode problems (Tech) or 5 years of GATE PYQs (Core).
- **4th Year (Placements & Launch)**:
  - Refine your single-page resume (quantify results: *"Reduced latency by 35%"* or *"Designed 500W converter with 94% efficiency"*).
  - Mock technical interviews and HR situational rounds (STAR method).

#### Recommended Focus for ${dept}:
Focus on combining **domain fundamentals** with **digital/software tools** (e.g. Embedded C, IoT, Python data processing, power electronics simulation). This makes you twice as attractive to recruiters!

Want help drafting project ideas, reviewing your resume structure, or practicing technical interview questions?`,
      suggestedFollowUps: [
        'Suggest 3 high-impact project ideas for my resume 🛠️',
        'How to prepare for technical interview rounds? 💼',
        'How should I structure my single-page resume? 📄'
      ]
    };
  }

  // 8. Motivation & Study Planning
  if (intent === 'motivation') {
    return {
      text: `### 🌟 Deep Breath: You've Got This!

Engineering can be genuinely intense — lab records, CIA tests, attendance minimums, assignments, and projects all piling up at once. It is completely normal to feel overwhelmed sometimes.

Here is how we turn chaos into calm progress today:

#### 1. The "Rule of Three" Daily Focus
Do not look at the entire 500-page syllabus today. Pick only **THREE specific tasks** for today:
1. *One derivation or concept* (e.g. Master KCL/KVL or Transformer EMF).
2. *Two solved numericals*.
3. *30 minutes of notes review*.

#### 2. The 25/5 Pomodoro Cadence
- Study with zero distractions (phone in another room) for **25 minutes**.
- Take a forced **5-minute break** (walk, drink water, stretch).
- After 4 cycles, take a real 30-minute break.
You'll get more done in 2 hours than 6 hours of half-focused scrolling.

#### 3. Overcoming Backlog Anxiety:
Remember: A backlog or a low CIA score is just an academic checkpoint, not a measure of your intelligence or future potential. Engineering tests persistence far more than raw talent.

Tell me: what is the **single biggest topic or deadline** stressing you out right now? Let's break it down together right now! 💪`,
      suggestedFollowUps: [
        'Help me break down my hardest subject step-by-step 💡',
        'Build a daily 2-hour study plan for me 📅',
        'Explain a concept easily so I gain confidence ✨'
      ]
    };
  }

  // 9. Generic / Welcome / Default Engineering Assistance
  return {
    text: `### 👋 Hey there! I'm your AI Study Companion

I'm your personal engineering study partner. Whether you are tackling tough derivations, debugging code, solving numericals, or planning for semester exams, I'm here to explain everything clearly from first principles!

#### What we can do together:
- 💡 **Master Any Concept**: Ask me *"Explain DC Machine"*, *"Teach me Semiconductor"*, or *"How does Op-Amp work?"* for our complete 12-step structured breakdown.
- 🔢 **Solve Numericals**: Step-by-step calculations with formulas, substitutions, and engineering takeaways.
- 🎯 **Quiz You**: Test your understanding before your professors or exams do!
- 📝 **Exam & CIA Prep**: High-yield question predictions, derivations, and rapid revision sheets.
- 🚀 **Career & Placements**: Resume advice, project ideas, and interview prep tailored to **${dept}**.

What subject or topic are you working on today? Let's dive in! 🚀`,
    suggestedFollowUps: [
      'Explain DC Machine ⚡',
      'Teach me Transformer 💡',
      'Explain Kirchhoff\'s Laws 🔌',
      'What is Recursion? 💻',
      'Give me exam preparation tips 🎯'
    ]
  };
}
