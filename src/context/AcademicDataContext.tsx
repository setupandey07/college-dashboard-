import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  Subject,
  SyllabusUnit,
  DepartmentInfo,
  AttendanceSession,
  StudentSubjectAttendance,
  AssessmentRecord,
  StudentSubjectMarks,
  WorkloadItem,
  AcademicQuery,
  InnovationProject,
  Announcement,
  LabEquipment,
  UserProfile,
  UserRole
} from '../types';
import { StudentRecord, subscribeStudents, saveStudent as firestoreSaveStudent } from '../services/firestore/students';
import {
  AcademicSection,
  subscribeSections,
  createSection as firestoreCreateSection,
  updateSection as firestoreUpdateSection,
  deleteSection as firestoreDeleteSection,
  subscribeDepartments,
  subscribeSubjects,
  subscribeAttendanceSessions,
  subscribeStudentAttendanceSummaries,
  subscribeAssessments,
  subscribeStudentMarks,
  subscribeWorkloads,
  subscribeQueries,
  subscribeProblems,
  subscribeAnnouncements,
  subscribeLabEquipment,
  subscribeUsers,
  saveAttendanceSession,
  updateStudentAttendancePercentage,
  saveAssessmentRecord,
  updateSubjectSyllabus,
  saveSubject as firestoreSaveSubject,
  createSubject as firestoreCreateSubject,
  deleteSubject as firestoreDeleteSubject,
  createQuery,
  addQueryResponse,
  updateQueryStatus as firestoreUpdateQueryStatus,
  createProblem,
  updateProblemStatus as firestoreUpdateProblemStatus,
  createAnnouncement as firestoreCreateAnnouncement,
  updateAnnouncement as firestoreUpdateAnnouncement,
  deleteAnnouncement as firestoreDeleteAnnouncement,
  updateLabEquipmentStatus as firestoreUpdateLabEquipment,
  createLabEquipment as firestoreCreateLabEquipment,
  deleteLabEquipment as firestoreDeleteLabEquipment,
  saveUser,
  updateDepartmentMetrics,
  createDepartment as firestoreCreateDepartment,
  updateDepartment as firestoreUpdateDepartment,
  deleteDepartment as firestoreDeleteDepartment,
  deleteUser as firestoreDeleteUser,
  deleteStudent as firestoreDeleteStudent,
  deleteAssessmentRecord as firestoreDeleteAssessmentRecord,
  deleteQuery as firestoreDeleteQuery,
  deleteProblem as firestoreDeleteProblem,
  deleteAttendanceSession as firestoreDeleteAttendanceSession,
  saveStudentAttendanceSummary as firestoreSaveStudentAttendanceSummary
} from '../services/firestore';
import { testConnection } from '../lib/firebase';
import {
  seedFirestoreDatabase,
  purgeDemoUsers as firestorePurgeDemoUsers,
  purgeAllDemoData as firestorePurgeAllDemoData,
  DEMO_USER_DOC_IDS,
  DEMO_USER_EMAILS
} from '../services/firestore/seed';

interface AcademicDataContextType {
  departments: DepartmentInfo[];
  sections: AcademicSection[];
  subjects: Subject[];
  attendanceSessions: AttendanceSession[];
  studentAttendance: StudentSubjectAttendance[];
  assessments: AssessmentRecord[];
  studentMarks: StudentSubjectMarks[];
  workloads: WorkloadItem[];
  queries: AcademicQuery[];
  innovationProjects: InnovationProject[];
  announcements: Announcement[];
  labEquipment: LabEquipment[];
  users: UserProfile[];
  students: StudentRecord[];
  isFirestoreReady: boolean;
  syncStatus: 'loading' | 'synced' | 'error';

  // Action methods
  markAttendance: (session: Omit<AttendanceSession, 'id'>) => Promise<void>;
  recordAssessmentMarks: (record: Omit<AssessmentRecord, 'id'>) => Promise<void>;
  toggleSyllabusTopic: (subjectId: string, unitId: string, topicId: string, completed: boolean) => Promise<void>;
  createSubject: (subject: Subject) => Promise<Subject>;
  updateSubject: (subjectId: string, data: Partial<Subject>) => Promise<void>;
  updateSubjectUnits: (subjectId: string, units: SyllabusUnit[]) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  submitQuery: (query: Omit<AcademicQuery, 'id' | 'ticketId' | 'createdAt' | 'status' | 'replies'>) => Promise<void>;
  replyToQuery: (queryId: string, authorName: string, authorRole: UserRole, message: string) => Promise<void>;
  updateQueryStatus: (queryId: string, status: 'open' | 'in_progress' | 'resolved') => Promise<void>;
  submitInnovationProject: (project: Omit<InnovationProject, 'id' | 'status' | 'submittedDate'>) => Promise<void>;
  updateProjectStatus: (projectId: string, status: InnovationProject['status'], fundingAmount?: string) => Promise<void>;
  createAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => Promise<void>;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  createDepartment: (dept: Omit<DepartmentInfo, 'id'> & { id?: string }) => Promise<DepartmentInfo>;
  updateDepartment: (deptId: string, data: Partial<DepartmentInfo>) => Promise<void>;
  deleteDepartment: (deptId: string) => Promise<void>;
  createSection: (section: Omit<AcademicSection, 'id'> & { id?: string }) => Promise<AcademicSection>;
  updateSection: (sectionId: string, data: Partial<AcademicSection>) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  createLabEquipment: (item: LabEquipment) => Promise<LabEquipment>;
  deleteLabEquipment: (equipmentId: string) => Promise<void>;
  updateEquipmentStatus: (equipmentId: string, workingCount: number, maintenanceCount: number, status: LabEquipment['status']) => Promise<void>;
  addNewUser: (user: Omit<UserProfile, 'id'>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteAssessmentRecord: (assessmentId: string) => Promise<void>;
  deleteAttendanceSessionRecord: (sessionId: string) => Promise<void>;
  deleteQuery: (queryId: string) => Promise<void>;
  deleteProblem: (projectId: string) => Promise<void>;
  purgeDemoUsers: () => Promise<void>;
  purgeAllDemoData: () => Promise<{ success: boolean; purgedTotal: number }>;
}

const AcademicDataContext = createContext<AcademicDataContextType | undefined>(undefined);

export const AcademicDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure real-time Firestore database state: initialize with empty arrays
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [sections, setSections] = useState<AcademicSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<StudentSubjectAttendance[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentSubjectMarks[]>([]);
  const [workloads, setWorkloads] = useState<WorkloadItem[]>([]);
  const [queries, setQueries] = useState<AcademicQuery[]>([]);
  const [innovationProjects, setInnovationProjects] = useState<InnovationProject[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [labEquipment, setLabEquipment] = useState<LabEquipment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  const [isFirestoreReady, setIsFirestoreReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'error'>('loading');

  // Keep references to state for composite updates
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;
  const queriesRef = useRef(queries);
  queriesRef.current = queries;
  const departmentsRef = useRef(departments);
  departmentsRef.current = departments;

  const { authState, firebaseUser } = useAuth();

  // Real-time Firestore Subscriptions and Initialization
  // Critical (Firebase Skill): Only attach onSnapshot listeners if auth is ready and user is authenticated
  useEffect(() => {
    if (authState !== 'AUTHORIZED' || !firebaseUser) {
      setIsFirestoreReady(false);
      return;
    }

    let unsubs: (() => void)[] = [];

    const initializeFirestore = async () => {
      let isConnected = false;
      try {
        isConnected = await testConnection();
      } catch (connErr) {
        console.warn('Connection check notice:', connErr);
      }

      if (!isConnected) {
        console.warn('[Firestore] Database rules restrict read/write access. Please configure rules.');
        setSyncStatus('error');
        setIsFirestoreReady(false);
        return;
      }

      setIsFirestoreReady(true);
      setSyncStatus('synced');

      // Auto-seed the database with initial data if not yet seeded
      try {
        const seedResult = await seedFirestoreDatabase();
        console.log('[Firestore] Seed check:', seedResult.message);
      } catch (seedErr) {
        console.warn('[Firestore] Seed notice:', seedErr);
      }

      try {
        const handleSubError = (name: string) => (err: Error) => {
          console.warn(`Firestore subscription notice for ${name}:`, err.message);
          setSyncStatus('error');
        };

        // Attach Real-time Listeners to all authoritative Firestore collections
        unsubs.push(
          subscribeDepartments(
            (data) => setDepartments(data || []),
            handleSubError('departments')
          ),
          subscribeSections(
            (data) => setSections(data || []),
            handleSubError('sections')
          ),
          subscribeSubjects(
            (data) => setSubjects(data || []),
            handleSubError('subjects')
          ),
          subscribeAttendanceSessions(
            (data) => setAttendanceSessions(data || []),
            handleSubError('attendanceSessions')
          ),
          subscribeStudentAttendanceSummaries(
            (data) => setStudentAttendance(data || []),
            handleSubError('attendanceSummaries')
          ),
          subscribeAssessments(
            (data) => setAssessments(data || []),
            handleSubError('assessments')
          ),
          subscribeStudentMarks(
            (data) => setStudentMarks(data || []),
            handleSubError('studentMarks')
          ),
          subscribeWorkloads(
            (data) => setWorkloads(data || []),
            handleSubError('workloads')
          ),
          subscribeQueries(
            (data) => setQueries(data || []),
            handleSubError('queries')
          ),
          subscribeProblems(
            (data) => setInnovationProjects(data || []),
            handleSubError('problems')
          ),
          subscribeAnnouncements(
            (data) => setAnnouncements(data || []),
            handleSubError('announcements')
          ),
          subscribeLabEquipment(
            (data) => setLabEquipment(data || []),
            handleSubError('labEquipment')
          ),
          subscribeUsers(
            (data) => setUsers(data || []),
            handleSubError('users')
          ),
          subscribeStudents(
            (data) => setStudents(data || []),
            handleSubError('students')
          )
        );
      } catch (err) {
        console.warn('Firestore initialization encountered a non-fatal error:', err);
        setSyncStatus('error');
      }
    };

    initializeFirestore();

    return () => {
      unsubs.forEach(unsub => {
        try {
          unsub();
        } catch (_) {}
      });
    };
  }, [authState, firebaseUser]);

  // 1. Real-time Attendance Marking
  const markAttendance = async (sessionData: Omit<AttendanceSession, 'id'>) => {
    const newSession: AttendanceSession = {
      ...sessionData,
      id: `att-sess-${Date.now()}`
    };

    // Optimistic local update
    setAttendanceSessions(prev => [newSession, ...prev]);

    // Update or create student attendance summary records dynamically for each evaluated student
    setStudentAttendance(prev => {
      let updated = [...prev];
      for (const rec of sessionData.records) {
        const existingIdx = updated.findIndex(
          item =>
            (item.studentId === rec.studentId || !item.studentId) &&
            (item.subjectId === sessionData.subjectId || item.subjectCode === sessionData.subjectCode)
        );
        if (existingIdx >= 0) {
          const item = updated[existingIdx];
          const newTotal = item.totalClasses + 1;
          const newAttended = rec.status === 'present' ? item.attendedClasses + 1 : item.attendedClasses;
          const newPercent = Number(((newAttended / newTotal) * 100).toFixed(1));
          updated[existingIdx] = {
            ...item,
            studentId: rec.studentId,
            totalClasses: newTotal,
            attendedClasses: newAttended,
            percentage: newPercent
          };
        } else {
          updated.push({
            subjectId: sessionData.subjectId,
            subjectCode: sessionData.subjectCode,
            subjectName: sessionData.subjectName,
            facultyName: 'Course Faculty',
            totalClasses: 1,
            attendedClasses: rec.status === 'present' ? 1 : 0,
            percentage: rec.status === 'present' ? 100 : 0,
            lastAttended: sessionData.date,
            status: rec.status === 'present' ? 'safe' : 'warning',
            studentId: rec.studentId
          });
        }
      }
      return updated;
    });

    // Persist to Firestore
    try {
      await saveAttendanceSession(newSession);

      for (const rec of sessionData.records) {
        const currentItem = studentAttendance.find(
          item =>
            (item.studentId === rec.studentId || !item.studentId) &&
            (item.subjectId === sessionData.subjectId || item.subjectCode === sessionData.subjectCode)
        );
        if (currentItem) {
          const newTotal = currentItem.totalClasses + 1;
          const newAttended = rec.status === 'present' ? currentItem.attendedClasses + 1 : currentItem.attendedClasses;
          await updateStudentAttendancePercentage(rec.studentId, currentItem.subjectCode, newAttended, newTotal);
        } else {
          await firestoreSaveStudentAttendanceSummary({
            subjectId: sessionData.subjectId,
            subjectCode: sessionData.subjectCode,
            subjectName: sessionData.subjectName,
            facultyName: 'Course Faculty',
            totalClasses: 1,
            attendedClasses: rec.status === 'present' ? 1 : 0,
            percentage: rec.status === 'present' ? 100 : 0,
            lastAttended: sessionData.date,
            status: rec.status === 'present' ? 'safe' : 'warning',
            studentId: rec.studentId
          });
        }
      }

      // Dynamically calculate and update target department's real average attendance
      const targetSubject = subjects.find(s => s.id === sessionData.subjectId);
      const targetDept = departmentsRef.current.find(d =>
        d.code === targetSubject?.department ||
        d.name?.toLowerCase() === targetSubject?.department?.toLowerCase() ||
        d.id === targetSubject?.department
      );
      if (targetDept) {
        const allSessions = [newSession, ...attendanceSessions];
        const deptSessions = allSessions.filter(s =>
          subjects.find(sub => sub.id === s.subjectId && (sub.department === targetDept.code || sub.department === targetDept.name))
        );
        const totalAll = deptSessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
        const presentAll = deptSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
        const newAvg = totalAll > 0 ? Number(((presentAll / totalAll) * 100).toFixed(1)) : 0;
        await updateDepartmentMetrics(targetDept.id, { avgAttendance: newAvg });
      }
    } catch (e) {
      console.error('Error saving attendance session to Firestore:', e);
    }
  };

  const deleteAttendanceSessionRecord = async (sessionId: string) => {
    setAttendanceSessions(prev => prev.filter(s => s.id !== sessionId));
    try {
      await firestoreDeleteAttendanceSession(sessionId);
    } catch (e) {
      console.error('Error deleting attendance session from Firestore:', e);
    }
  };

  // 2. Real-time Assessment Marks Entry
  const recordAssessmentMarks = async (recordData: Omit<AssessmentRecord, 'id'>) => {
    const newRecord: AssessmentRecord = {
      ...recordData,
      id: `ass-${Date.now()}`
    };

    // Optimistic update for all evaluated students
    setAssessments(prev => [newRecord, ...prev]);

    setStudentMarks(prev => {
      let updated = [...prev];
      for (const entry of recordData.entries) {
        const existingIdx = updated.findIndex(
          sm => sm.studentId === entry.studentId &&
                (sm.subjectId === recordData.subjectId || sm.subjectCode === recordData.subjectCode)
        );

        if (existingIdx >= 0) {
          const item = updated[existingIdx];
          const cia1 = recordData.assessmentType === 'CIA-1' ? entry.marksObtained : item.cia1;
          const cia2 = recordData.assessmentType === 'CIA-2' ? entry.marksObtained : item.cia2;
          const modelExam = recordData.assessmentType === 'Model Exam' ? entry.marksObtained : item.modelExam;
          const assignment = recordData.assessmentType === 'Assignment' ? entry.marksObtained : item.assignment;
          const practical = recordData.assessmentType === 'Practical / Viva' ? entry.marksObtained : item.practical;
          const totalInternal = Math.min(50, Math.round(((cia1 + cia2) / 2) + (assignment * 0.5)));
          const grade = totalInternal >= 45 ? 'O' : totalInternal >= 40 ? 'A+' : totalInternal >= 35 ? 'A' : totalInternal >= 30 ? 'B+' : totalInternal >= 25 ? 'B' : 'RA';

          updated[existingIdx] = {
            ...item,
            cia1,
            cia2,
            modelExam,
            assignment,
            practical,
            totalInternal,
            grade
          };
        } else {
          const cia1 = recordData.assessmentType === 'CIA-1' ? entry.marksObtained : 0;
          const cia2 = recordData.assessmentType === 'CIA-2' ? entry.marksObtained : 0;
          const modelExam = recordData.assessmentType === 'Model Exam' ? entry.marksObtained : 0;
          const assignment = recordData.assessmentType === 'Assignment' ? entry.marksObtained : 0;
          const practical = recordData.assessmentType === 'Practical / Viva' ? entry.marksObtained : undefined;
          const totalInternal = Math.min(50, Math.round(((cia1 + cia2) / 2) + (assignment * 0.5)));
          const grade = totalInternal >= 45 ? 'O' : totalInternal >= 40 ? 'A+' : totalInternal >= 35 ? 'A' : totalInternal >= 30 ? 'B+' : totalInternal >= 25 ? 'B' : 'RA';

          updated.push({
            id: `${entry.studentId}_${recordData.subjectCode}`,
            studentId: entry.studentId,
            subjectId: recordData.subjectId,
            subjectCode: recordData.subjectCode,
            subjectName: recordData.subjectName,
            cia1,
            cia2,
            assignment,
            practical,
            modelExam,
            totalInternal,
            maxInternal: 50,
            grade
          });
        }
      }
      return updated;
    });

    // Persist to Firestore
    try {
      await saveAssessmentRecord(newRecord);
    } catch (e) {
      console.error('Error saving assessment record to Firestore:', e);
    }
  };

  // 3. Syllabus Topic completion toggle
  const toggleSyllabusTopic = async (
    subjectId: string,
    unitId: string,
    topicId: string,
    completed: boolean
  ) => {
    let updatedSubject: Subject | undefined;

    setSubjects(prev =>
      prev.map(sub => {
        if (sub.id !== subjectId) return sub;

        const updatedUnits = sub.units.map(unit => {
          if (unit.id !== unitId) return unit;

          const updatedTopics = unit.topics.map(topic => {
            if (topic.id !== topicId) return topic;
            return {
              ...topic,
              completed,
              completionDate: completed ? new Date().toISOString().split('T')[0] : undefined
            };
          });

          const completedTopicsCount = updatedTopics.filter(t => t.completed).length;
          const allCompleted = completedTopicsCount === updatedTopics.length;
          const completedHours = updatedTopics
            .filter(t => t.completed)
            .reduce((sum, t) => sum + t.hours, 0);

          return {
            ...unit,
            topics: updatedTopics,
            completedHours,
            isCompleted: allCompleted
          };
        });

        const totalHoursConducted = updatedUnits.reduce((acc, u) => acc + u.completedHours, 0);
        const completionRate = (totalHoursConducted / sub.totalHoursPlanned) * 100;
        const status: Subject['status'] =
          completionRate >= 100 ? 'completed' : completionRate >= 65 ? 'on_track' : 'behind_schedule';

        const result: Subject = {
          ...sub,
          units: updatedUnits,
          hoursConducted: totalHoursConducted,
          status
        };
        updatedSubject = result;
        return result;
      })
    );

    // Persist to Firestore
    if (updatedSubject) {
      try {
        await updateSubjectSyllabus(
          subjectId,
          updatedSubject.units,
          updatedSubject.hoursConducted,
          updatedSubject.status
        );
      } catch (e) {
        console.error('Error updating syllabus in Firestore:', e);
      }
    }
  };

  const createSubject = async (subjectData: Subject): Promise<Subject> => {
    setSubjects(prev => [...prev, subjectData]);
    try {
      await firestoreCreateSubject(subjectData);
    } catch (e) {
      console.error('Error creating subject in Firestore:', e);
    }
    return subjectData;
  };

  const updateSubject = async (subjectId: string, data: Partial<Subject>): Promise<void> => {
    let updatedSub: Subject | undefined;
    setSubjects(prev =>
      prev.map(s => {
        if (s.id !== subjectId) return s;
        updatedSub = { ...s, ...data };
        return updatedSub;
      })
    );
    if (updatedSub) {
      try {
        await firestoreSaveSubject(updatedSub);
      } catch (e) {
        console.error('Error updating subject in Firestore:', e);
      }
    }
  };

  const updateSubjectUnits = async (subjectId: string, units: SyllabusUnit[]): Promise<void> => {
    let updatedSubject: Subject | undefined;
    setSubjects(prev =>
      prev.map(sub => {
        if (sub.id !== subjectId) return sub;

        const totalCompletedHours = units.reduce(
          (sum: number, u: SyllabusUnit) =>
            sum + (u.topics ? u.topics.filter(t => t.completed).reduce((ts: number, t) => ts + (t.hours || 1), 0) : 0),
          0
        );
        const totalPlannedHours = units.reduce(
          (sum: number, u: SyllabusUnit) =>
            sum + (u.topics ? u.topics.reduce((ts: number, t) => ts + (t.hours || 1), 0) : 0),
          0
        ) || sub.totalHoursPlanned || 45;

        const completionRate = totalPlannedHours > 0 ? (totalCompletedHours / totalPlannedHours) * 100 : 0;
        const status: Subject['status'] =
          completionRate >= 100 ? 'completed' : completionRate >= 65 ? 'on_track' : 'behind_schedule';

        const result: Subject = {
          ...sub,
          units,
          hoursConducted: totalCompletedHours,
          totalHoursPlanned: totalPlannedHours,
          status
        };
        updatedSubject = result;
        return result;
      })
    );

    if (updatedSubject) {
      try {
        await updateSubjectSyllabus(
          subjectId,
          updatedSubject.units,
          updatedSubject.hoursConducted,
          updatedSubject.status
        );
      } catch (e) {
        console.error('Error updating subject units in Firestore:', e);
      }
    }
  };

  const deleteSubject = async (subjectId: string): Promise<void> => {
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    try {
      await firestoreDeleteSubject(subjectId);
    } catch (e) {
      console.error('Error deleting subject in Firestore:', e);
    }
  };

  // 4. Query / Grievance operations
  const submitQuery = async (queryData: Omit<AcademicQuery, 'id' | 'ticketId' | 'createdAt' | 'status' | 'replies'>) => {
    const newQuery: AcademicQuery = {
      ...queryData,
      id: `q-${Date.now()}`,
      ticketId: `ACAD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'open',
      replies: []
    };

    setQueries(prev => [newQuery, ...prev]);

    try {
      await createQuery(newQuery);
    } catch (e) {
      console.error('Error submitting query to Firestore:', e);
    }
  };

  const replyToQuery = async (queryId: string, authorName: string, authorRole: UserRole, message: string) => {
    const newReply = {
      id: `r-${Date.now()}`,
      authorName,
      authorRole,
      message,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    const targetQuery = queriesRef.current.find(q => q.id === queryId);
    const existingReplies = targetQuery?.replies || [];

    setQueries(prev =>
      prev.map(q => {
        if (q.id !== queryId) return q;
        return {
          ...q,
          status: q.status === 'open' ? 'in_progress' : q.status,
          replies: [...q.replies, newReply]
        };
      })
    );

    try {
      await addQueryResponse(queryId, newReply, existingReplies);
    } catch (e) {
      console.error('Error adding query response to Firestore:', e);
    }
  };

  const updateQueryStatus = async (queryId: string, status: 'open' | 'in_progress' | 'resolved') => {
    setQueries(prev =>
      prev.map(q => {
        if (q.id !== queryId) return q;
        return { ...q, status };
      })
    );

    try {
      await firestoreUpdateQueryStatus(queryId, status);
    } catch (e) {
      console.error('Error updating query status in Firestore:', e);
    }
  };

  // 5. Innovation Hub operations
  const submitInnovationProject = async (
    projectData: Omit<InnovationProject, 'id' | 'status' | 'submittedDate'>
  ) => {
    const newProject: InnovationProject = {
      ...projectData,
      id: `inn-${Date.now()}`,
      status: 'ideation',
      submittedDate: new Date().toISOString().split('T')[0]
    };

    setInnovationProjects(prev => [newProject, ...prev]);

    try {
      await createProblem(newProject);
    } catch (e) {
      console.error('Error submitting innovation project to Firestore:', e);
    }
  };

  const updateProjectStatus = async (
    projectId: string,
    status: InnovationProject['status'],
    fundingAmount?: string
  ) => {
    setInnovationProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          status,
          fundingAmount: fundingAmount ?? p.fundingAmount
        };
      })
    );

    try {
      await firestoreUpdateProblemStatus(projectId, status, fundingAmount);
    } catch (e) {
      console.error('Error updating project status in Firestore:', e);
    }
  };

  // 6. Announcements
  const createAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'date'>) => {
    const newAnc: Announcement = {
      ...announcementData,
      id: `anc-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };

    setAnnouncements(prev => [newAnc, ...prev]);

    try {
      await firestoreCreateAnnouncement(newAnc);
    } catch (e) {
      console.error('Error creating announcement in Firestore:', e);
    }
  };

  const updateAnnouncement = async (id: string, data: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => (a.id === id ? { ...a, ...data } : a)));
    try {
      await firestoreUpdateAnnouncement(id, data);
    } catch (e) {
      console.error('Error updating announcement in Firestore:', e);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await firestoreDeleteAnnouncement(id);
    } catch (e) {
      console.error('Error deleting announcement in Firestore:', e);
    }
  };

  // 7. Departments CRUD
  const createDepartment = async (deptData: Omit<DepartmentInfo, 'id'> & { id?: string }): Promise<DepartmentInfo> => {
    const tempId = deptData.id || `dept-${deptData.code.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`;
    const newDept: DepartmentInfo = {
      id: tempId,
      code: deptData.code.toUpperCase().trim(),
      name: deptData.name.trim(),
      hodName: deptData.hodName.trim(),
      hodEmail: deptData.hodEmail.trim(),
      facultyCount: deptData.facultyCount ?? 0,
      studentCount: deptData.studentCount ?? 0,
      labsCount: deptData.labsCount ?? 0,
      avgAttendance: deptData.avgAttendance ?? 0,
      syllabusCompletion: deptData.syllabusCompletion ?? 0,
      establishedYear: deptData.establishedYear ?? new Date().getFullYear(),
      description: deptData.description || '',
      phone: deptData.phone || '',
      location: deptData.location || '',
      status: deptData.status || 'active'
    };

    setDepartments(prev => [...prev, newDept]);

    try {
      const created = await firestoreCreateDepartment(newDept);
      setDepartments(prev => prev.map(d => (d.id === tempId ? created : d)));
      return created;
    } catch (e) {
      console.error('Error creating department in Firestore:', e);
      return newDept;
    }
  };

  const updateDepartment = async (deptId: string, data: Partial<DepartmentInfo>) => {
    setDepartments(prev => prev.map(d => (d.id === deptId ? { ...d, ...data } : d)));
    try {
      await firestoreUpdateDepartment(deptId, data);
    } catch (e) {
      console.error('Error updating department in Firestore:', e);
    }
  };

  const deleteDepartment = async (deptId: string) => {
    setDepartments(prev => prev.filter(d => d.id !== deptId));
    try {
      await firestoreDeleteDepartment(deptId);
    } catch (e) {
      console.error('Error deleting department in Firestore:', e);
    }
  };

  // 7b. Academic Sections CRUD
  const createSection = async (data: Omit<AcademicSection, 'id'> & { id?: string }): Promise<AcademicSection> => {
    const cleanCode = (data.departmentCode || 'DEPT').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanSec = (data.sectionName || 'a').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanYear = (data.academicYear || '1yr').toLowerCase().replace(/[^a-z0-9]/g, '');
    const canonicalId = data.id || `sec-${cleanCode}-${cleanYear}-${cleanSec}`;

    const newSec: AcademicSection = {
      ...data,
      id: canonicalId,
      status: data.status || 'active'
    };

    setSections(prev => {
      const filtered = prev.filter(s => s.id !== canonicalId);
      return [...filtered, newSec];
    });

    try {
      const created = await firestoreCreateSection({ ...data, id: canonicalId });
      setSections(prev => prev.map(s => (s.id === canonicalId ? created : s)));
      return created;
    } catch (e) {
      console.error('Error creating section in Firestore:', e);
      return newSec;
    }
  };

  const updateSection = async (id: string, data: Partial<AcademicSection>) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, ...data } : s)));
    try {
      await firestoreUpdateSection(id, data);
    } catch (e) {
      console.error('Error updating section in Firestore:', e);
    }
  };

  const deleteSection = async (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    try {
      await firestoreDeleteSection(id);
    } catch (e) {
      console.error('Error deleting section in Firestore:', e);
    }
  };

  // 8. Lab equipment
  const updateEquipmentStatus = async (
    equipmentId: string,
    workingCount: number,
    maintenanceCount: number,
    status: LabEquipment['status']
  ) => {
    setLabEquipment(prev =>
      prev.map(eq => {
        if (eq.id !== equipmentId) return eq;
        return {
          ...eq,
          workingCount,
          maintenanceCount,
          status,
          lastServiced: new Date().toISOString().split('T')[0]
        };
      })
    );

    try {
      await firestoreUpdateLabEquipment(equipmentId, workingCount, maintenanceCount, status);
    } catch (e) {
      console.error('Error updating equipment status in Firestore:', e);
    }
  };

  const createLabEquipment = async (item: LabEquipment): Promise<LabEquipment> => {
    setLabEquipment(prev => [...prev, item]);
    try {
      await firestoreCreateLabEquipment(item);
    } catch (e) {
      console.error('Error creating lab equipment in Firestore:', e);
    }
    return item;
  };

  const deleteLabEquipment = async (equipmentId: string): Promise<void> => {
    setLabEquipment(prev => prev.filter(e => e.id !== equipmentId));
    try {
      await firestoreDeleteLabEquipment(equipmentId);
    } catch (e) {
      console.error('Error deleting lab equipment in Firestore:', e);
    }
  };

  // 9. Add user
  const addNewUser = async (userData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...userData,
      id: `u-${Date.now()}`
    };

    setUsers(prev => [newUser, ...prev]);

    try {
      await saveUser(newUser);

      if (newUser.role === 'student') {
        const studentRec = {
          id: newUser.id,
          userId: newUser.id,
          name: newUser.name,
          email: newUser.email,
          rollNumber: newUser.regId || `USN-${newUser.departmentCode || 'STUDENT'}-${Date.now().toString().slice(-4)}`,
          registrationNumber: newUser.regId || `REG-${newUser.departmentCode || 'STUDENT'}-${Date.now().toString().slice(-4)}`,
          departmentId: `dept-${(newUser.departmentCode || 'cse').toLowerCase()}`,
          departmentName: newUser.department || 'Academic Department',
          year: newUser.semester ? Math.ceil(newUser.semester / 2) : 1,
          section: newUser.section || 'A',
          semester: newUser.semester || 1,
          admissionYear: Number(newUser.joiningYear) || new Date().getFullYear(),
          status: newUser.status === 'inactive' ? 'inactive' : 'active'
        };
        await firestoreSaveStudent(studentRec as any);
      }
    } catch (e) {
      console.error('Error adding user to Firestore:', e);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await firestoreDeleteUser(userId);
      await firestoreDeleteStudent(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setStudents(prev => prev.filter(s => s.userId !== userId && s.id !== userId));
    } catch (e) {
      console.error('Error deleting user:', e);
    }
  };

  const deleteAssessmentRecord = async (assessmentId: string) => {
    try {
      await firestoreDeleteAssessmentRecord(assessmentId);
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
    } catch (e) {
      console.error('Error deleting assessment record:', e);
    }
  };

  const deleteQuery = async (queryId: string) => {
    try {
      await firestoreDeleteQuery(queryId);
      setQueries(prev => prev.filter(q => q.id !== queryId));
    } catch (e) {
      console.error('Error deleting query:', e);
    }
  };

  const deleteProblem = async (projectId: string) => {
    try {
      await firestoreDeleteProblem(projectId);
      setInnovationProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (e) {
      console.error('Error deleting innovation project:', e);
    }
  };

  const purgeDemoUsers = async () => {
    try {
      await firestorePurgeDemoUsers();
      const demoIds = new Set(DEMO_USER_DOC_IDS);
      const demoEmails = new Set(DEMO_USER_EMAILS);
      setUsers(prev => prev.filter(u => !demoIds.has(u.id) && !demoEmails.has(u.email)));
      setStudents(prev => prev.filter(s => !demoIds.has(s.id) && !demoEmails.has(s.email) && !demoIds.has(s.userId)));
    } catch (e) {
      console.error('Error purging demo users:', e);
    }
  };

  const purgeAllDemoData = async () => {
    try {
      const res = await firestorePurgeAllDemoData();
      // Clean local React states immediately
      const demoIds = new Set(DEMO_USER_DOC_IDS);
      const demoEmails = new Set(DEMO_USER_EMAILS);
      setUsers(prev => prev.filter(u => !demoIds.has(u.id) && !demoEmails.has(u.email)));
      setStudents(prev => prev.filter(s => !demoIds.has(s.id) && !demoEmails.has(s.email) && !demoIds.has(s.userId)));
      setAssessments(prev => prev.filter(a => !a.id.startsWith('ass-cia') && !a.id.includes('demo')));
      setStudentMarks(prev => prev.filter(sm => sm.studentId && !sm.studentId.startsWith('u-stu-') && !sm.subjectId?.startsWith('sub-cs')));
      setQueries(prev => prev.filter(q => !q.id.startsWith('q-10') && !q.studentId?.startsWith('u-stu-')));
      setInnovationProjects(prev => prev.filter(p => !p.id.startsWith('inn-00')));
      setAnnouncements(prev => prev.filter(a => !a.id.startsWith('anc-0')));
      setAttendanceSessions(prev => prev.filter(s => !s.id.startsWith('att-sess-10')));
      setLabEquipment(prev => prev.filter(eq => !eq.id.startsWith('eq-10')));
      return res;
    } catch (e) {
      console.error('Error purging all demo data:', e);
      return { success: false, purgedTotal: 0 };
    }
  };

  return (
    <AcademicDataContext.Provider
      value={{
        departments,
        sections,
        subjects,
        attendanceSessions,
        studentAttendance,
        assessments,
        studentMarks,
        workloads,
        queries,
        innovationProjects,
        announcements,
        labEquipment,
        users,
        students,
        isFirestoreReady,
        syncStatus,
        markAttendance,
        recordAssessmentMarks,
        toggleSyllabusTopic,
        createSubject,
        updateSubject,
        updateSubjectUnits,
        deleteSubject,
        submitQuery,
        replyToQuery,
        updateQueryStatus,
        submitInnovationProject,
        updateProjectStatus,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        createDepartment,
        updateDepartment,
        deleteDepartment,
        createSection,
        updateSection,
        deleteSection,
        createLabEquipment,
        deleteLabEquipment,
        updateEquipmentStatus,
        addNewUser,
        deleteUser,
        deleteAssessmentRecord,
        deleteAttendanceSessionRecord,
        deleteQuery,
        deleteProblem,
        purgeDemoUsers,
        purgeAllDemoData
      }}
    >
      {children}
    </AcademicDataContext.Provider>
  );
};

export const useAcademicData = () => {
  const context = useContext(AcademicDataContext);
  if (!context) {
    throw new Error('useAcademicData must be used within an AcademicDataProvider');
  }
  return context;
};
