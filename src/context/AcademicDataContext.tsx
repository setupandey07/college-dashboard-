import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
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
  UserRole,
  AcademicBatch,
  MasterNote,
  AppNotification,
  QueryReply
} from '../types';
import { canUserAccessQuery, assertQueryAccessAuthorized } from '../lib/queryPrivacy';
import {
  ClassTimetable,
  TimetableDay,
  TimetableSlotConfig,
  TimetableCell,
  DEFAULT_TIMETABLE_SLOTS,
  subscribeAllTimetables,
  updateTimetableSlot as firestoreUpdateTimetableSlot,
  subscribeNotifications,
  createNotification as firestoreCreateNotification,
  markNotificationAsRead as firestoreMarkNotificationAsRead,
  markAllNotificationsAsRead as firestoreMarkAllNotificationsAsRead
} from '../services/firestore';
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
  saveSingleStudentMark as firestoreSaveSingleStudentMark,
  getAssessmentFieldKey,
  SaveSingleMarkParams,
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
  saveStudentAttendanceSummary as firestoreSaveStudentAttendanceSummary,
  subscribeBatches,
  saveBatch as firestoreSaveBatch,
  deleteBatch as firestoreDeleteBatch,
  subscribeNotes,
  saveNote as firestoreSaveNote,
  deleteNote as firestoreDeleteNote
} from '../services/firestore';
import { testConnection } from '../lib/firebase';
import { assertSubjectOperationAuthorized } from '../lib/subjectSecurity';
import {
  seedFirestoreDatabase,
  purgeDemoUsers as firestorePurgeDemoUsers,
  purgeAllDemoData as firestorePurgeAllDemoData,
  DEMO_USER_DOC_IDS,
  DEMO_USER_EMAILS
} from '../services/firestore/seed';

export interface AcademicLoadingState {
  isInitialLoading: boolean;
  departments: boolean;
  sections: boolean;
  subjects: boolean;
  attendance: boolean;
  marks: boolean;
  users: boolean;
  students: boolean;
  announcements: boolean;
  queries: boolean;
  workloads: boolean;
  innovation: boolean;
}

export type CollectionErrorMap = Partial<Record<keyof AcademicLoadingState, string>>;

export interface AcademicDataContextType {
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
  batches: AcademicBatch[];
  notes: MasterNote[];
  timetables: ClassTimetable[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isFirestoreReady: boolean;
  syncStatus: 'loading' | 'synced' | 'error';
  loadingState: AcademicLoadingState;
  errorState: CollectionErrorMap;

  // Action methods
  markAttendance: (session: Omit<AttendanceSession, 'id'>, existingSessionId?: string) => Promise<void>;
  recordAssessmentMarks: (record: Omit<AssessmentRecord, 'id'>) => Promise<void>;
  saveSingleMark: (params: Omit<SaveSingleMarkParams, 'actorName' | 'actorRole'>) => Promise<void>;
  toggleSyllabusTopic: (subjectId: string, unitId: string, topicId: string, completed: boolean) => Promise<void>;
  createSubject: (subject: Subject) => Promise<Subject>;
  updateSubject: (subjectId: string, data: Partial<Subject>) => Promise<void>;
  updateSubjectUnits: (subjectId: string, units: SyllabusUnit[]) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  updateTimetableSlot: (
    sectionId: string,
    departmentCode: string,
    academicYear: string,
    sectionName: string,
    day: TimetableDay,
    slotId: string,
    cell: TimetableCell | null
  ) => Promise<void>;
  submitQuery: (query: Omit<AcademicQuery, 'id' | 'ticketId' | 'createdAt' | 'status' | 'replies'>) => Promise<void>;
  replyToQuery: (queryId: string, authorName: string, authorRole: UserRole, message: string) => Promise<void>;
  updateQueryStatus: (queryId: string, status: 'open' | 'in_progress' | 'resolved', actorName?: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  sendPrivateNotification: (params: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
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
  createBatch: (batch: Omit<AcademicBatch, 'id'>) => Promise<AcademicBatch>;
  updateBatch: (batchId: string, data: Partial<AcademicBatch>) => Promise<void>;
  deleteBatch: (batchId: string) => Promise<void>;
  createNote: (note: Omit<MasterNote, 'id'>) => Promise<MasterNote>;
  updateNote: (noteId: string, data: Partial<MasterNote>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  purgeDemoUsers: () => Promise<void>;
  purgeAllDemoData: () => Promise<{ success: boolean; purgedTotal: number }>;
  assignFacultySubjects: (facultyUserId: string, subjectIds: string[]) => Promise<void>;
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
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [notes, setNotes] = useState<MasterNote[]>([]);
  const [timetables, setTimetables] = useState<ClassTimetable[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const [isFirestoreReady, setIsFirestoreReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'synced' | 'error'>('loading');

  const [loadingState, setLoadingState] = useState<AcademicLoadingState>({
    isInitialLoading: true,
    departments: true,
    sections: true,
    subjects: true,
    attendance: true,
    marks: true,
    users: true,
    students: true,
    announcements: true,
    queries: true,
    workloads: true,
    innovation: true
  });
  const [errorState, setErrorState] = useState<CollectionErrorMap>({});

  // Keep references to state for composite updates
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;
  const queriesRef = useRef(queries);
  queriesRef.current = queries;
  const departmentsRef = useRef(departments);
  departmentsRef.current = departments;

  const { authState, firebaseUser, currentUser, currentRole, actualRole, updateCurrentUserProfile } = useAuth();

  // Real-time Firestore Subscriptions and Initialization
  // Optimized: Attaches primary listeners immediately in parallel on authorization.
  // Non-blocking background health check & seed verification.
  useEffect(() => {
    if (authState !== 'AUTHORIZED' || !firebaseUser) {
      setIsFirestoreReady(false);
      setSyncStatus('loading');
      setLoadingState({
        isInitialLoading: true,
        departments: true,
        sections: true,
        subjects: true,
        attendance: true,
        marks: true,
        users: true,
        students: true,
        announcements: true,
        queries: true,
        workloads: true,
        innovation: true
      });
      return;
    }

    const unsubs: (() => void)[] = [];
    let isCancelled = false;
    const syncStartTime = performance.now();

    // 1. Non-blocking Background Connection & Rules Check
    testConnection()
      .then((canConnect) => {
        if (!isCancelled) {
          setIsFirestoreReady(canConnect);
          if (!canConnect) {
            console.warn('[Firestore] Database rules restrict read/write access. Please configure rules.');
            setSyncStatus('error');
          }
        }
      })
      .catch((connErr) => {
        console.warn('[Firestore] Connection check notice:', connErr);
      });

    // 2. Non-blocking Background System Seed Verification
    seedFirestoreDatabase()
      .then((seedResult) => {
        if (!isCancelled && seedResult.message) {
          console.log('[Firestore] Foundation status:', seedResult.message);
        }
      })
      .catch((seedErr) => {
        console.warn('[Firestore] Seed notice:', seedErr);
      });

    // Track which primary collections are pending first snapshot
    const pendingPrimary = new Set<string>([
      'departments',
      'sections',
      'subjects',
      'attendance',
      'marks',
      'users',
      'students',
      'announcements'
    ]);

    const markPrimaryLoaded = (name: keyof AcademicLoadingState) => {
      if (isCancelled) return;
      setLoadingState((prev) => (prev[name] ? { ...prev, [name]: false } : prev));
      if (pendingPrimary.has(name)) {
        pendingPrimary.delete(name);
        if (pendingPrimary.size === 0) {
          setLoadingState((prev) => (prev.isInitialLoading ? { ...prev, isInitialLoading: false } : prev));
          setSyncStatus('synced');
          setIsFirestoreReady(true);
          const duration = Math.round(performance.now() - syncStartTime);
          console.log(`[DataSync] Primary dashboard collections synchronized in ${duration}ms`);
        }
      }
    };

    const handlePrimarySubError = (name: keyof AcademicLoadingState) => (err: Error) => {
      if (isCancelled) return;
      console.warn(`[Firestore] Subscription notice for ${name}:`, err.message);
      setErrorState((prev) => ({ ...prev, [name]: err.message }));
      markPrimaryLoaded(name);
    };

    // 3. Attach Primary Listeners Immediately in Parallel (Critical Dashboard Path)
    try {
      unsubs.push(
        subscribeDepartments(
          (data) => {
            setDepartments(data || []);
            markPrimaryLoaded('departments');
          },
          handlePrimarySubError('departments')
        ),
        subscribeSections(
          (data) => {
            setSections(data || []);
            markPrimaryLoaded('sections');
          },
          handlePrimarySubError('sections')
        ),
        subscribeSubjects(
          (data) => {
            setSubjects(data || []);
            markPrimaryLoaded('subjects');
          },
          handlePrimarySubError('subjects')
        ),
        subscribeAttendanceSessions(
          (data) => {
            setAttendanceSessions(data || []);
            markPrimaryLoaded('attendance');
          },
          handlePrimarySubError('attendance')
        ),
        subscribeStudentAttendanceSummaries(
          (data) => setStudentAttendance(data || []),
          handlePrimarySubError('attendance')
        ),
        subscribeStudentMarks(
          (data) => {
            setStudentMarks(data || []);
            markPrimaryLoaded('marks');
          },
          handlePrimarySubError('marks')
        ),
        subscribeAnnouncements(
          (data) => {
            setAnnouncements(data || []);
            markPrimaryLoaded('announcements');
          },
          handlePrimarySubError('announcements')
        ),
        subscribeUsers(
          (data) => {
            setUsers(data || []);
            markPrimaryLoaded('users');
          },
          handlePrimarySubError('users')
        ),
        subscribeStudents(
          (data) => {
            setStudents(data || []);
            markPrimaryLoaded('students');
          },
          handlePrimarySubError('students')
        )
      );
    } catch (primaryErr) {
      console.warn('[Firestore] Primary subscriptions encountered error:', primaryErr);
    }

    // 4. Attach Secondary Listeners (Yields microtask for primary render)
    const secondaryTimer = setTimeout(() => {
      if (isCancelled) return;
      try {
        unsubs.push(
          subscribeAssessments(
            (data) => setAssessments(data || []),
            (err) => console.warn('assessments sub notice:', err.message)
          ),
          subscribeWorkloads(
            (data) => {
              setWorkloads(data || []);
              setLoadingState((prev) => (prev.workloads ? { ...prev, workloads: false } : prev));
            },
            (err) => console.warn('workloads sub notice:', err.message)
          ),
          subscribeProblems(
            (data) => {
              setInnovationProjects(data || []);
              setLoadingState((prev) => (prev.innovation ? { ...prev, innovation: false } : prev));
            },
            (err) => console.warn('problems sub notice:', err.message)
          ),
          subscribeLabEquipment(
            (data) => setLabEquipment(data || []),
            (err) => console.warn('labEquipment sub notice:', err.message)
          ),
          subscribeBatches(
            (data) => setBatches(data || []),
            (err) => console.warn('batches sub notice:', err.message)
          ),
          subscribeNotes(
            (data) => setNotes(data || []),
            (err) => console.warn('notes sub notice:', err.message)
          ),
          subscribeAllTimetables(
            (data) => setTimetables(data || []),
            (err) => console.warn('timetables sub notice:', err.message)
          )
        );
      } catch (secondaryErr) {
        console.warn('[Firestore] Secondary subscriptions notice:', secondaryErr);
      }
    }, 40);

    // 5. Safety resolution timeout: Ensure UI transitions out of loading state within 3.5s
    const safetyTimer = setTimeout(() => {
      if (!isCancelled && pendingPrimary.size > 0) {
        console.warn(`[DataSync] Safety resolution: Fallback for slow listeners: ${Array.from(pendingPrimary).join(', ')}`);
        pendingPrimary.clear();
        setLoadingState((prev) => (prev.isInitialLoading ? { ...prev, isInitialLoading: false } : prev));
        setSyncStatus('synced');
      }
    }, 3500);

    return () => {
      isCancelled = true;
      clearTimeout(secondaryTimer);
      clearTimeout(safetyTimer);
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch (_) {}
      });
    };
  }, [authState, firebaseUser?.uid]);

  // Strict User-Scoped Query and Private Notification Subscriptions
  // Wipes stale data immediately on user/role switch and subscribes only to authorized queries and private notifications
  useEffect(() => {
    setQueries([]);
    setNotifications([]);
    setLoadingState((prev) => (prev.queries ? prev : { ...prev, queries: true }));

    if (authState !== 'AUTHORIZED' || !currentUser || !currentUser.id) {
      return;
    }

    let isCancelled = false;
    let unsubQueries: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    try {
      unsubQueries = subscribeQueries(
        currentUser,
        currentRole,
        (data) => {
          if (!isCancelled) {
            setQueries(data || []);
            setLoadingState((prev) => (prev.queries ? { ...prev, queries: false } : prev));
          }
        },
        (err) => {
          console.warn('[AcademicDataProvider] Queries subscription notice:', err.message);
          if (!isCancelled) {
            setErrorState((prev) => ({ ...prev, queries: err.message }));
            setLoadingState((prev) => (prev.queries ? { ...prev, queries: false } : prev));
          }
        }
      );

      // Private notifications targeted specifically to currentUser.id
      unsubNotifs = subscribeNotifications(
        currentUser.id,
        (data) => {
          if (!isCancelled) {
            setNotifications(data || []);
          }
        },
        (err) => {
          console.warn('[AcademicDataProvider] Notifications subscription notice:', err.message);
        }
      );
    } catch (e) {
      console.warn('Failed to start query/notification subscription:', e);
      setLoadingState((prev) => (prev.queries ? { ...prev, queries: false } : prev));
    }

    return () => {
      isCancelled = true;
      if (unsubQueries) {
        try { unsubQueries(); } catch (_) {}
      }
      if (unsubNotifs) {
        try { unsubNotifs(); } catch (_) {}
      }
    };
  }, [authState, currentUser?.id, currentUser?.departmentCode, currentRole, actualRole]);

  // 1. Real-time Attendance Marking
  const markAttendance = async (sessionData: Omit<AttendanceSession, 'id'>, existingSessionId?: string) => {
    // SECURITY ENFORCEMENT: Verify Role + Department + Assigned Subject authorization
    assertSubjectOperationAuthorized(currentUser, currentRole, sessionData.subjectId, subjects, 'Mark Attendance');

    // Check if an existing session exists with the exact same subject, date, slot, and section
    const matchingExistingSession = existingSessionId
      ? attendanceSessions.find(s => s.id === existingSessionId)
      : attendanceSessions.find(
          s =>
            s.subjectId === sessionData.subjectId &&
            s.date === sessionData.date &&
            s.slot === sessionData.slot &&
            s.section === sessionData.section
        );

    const sessionId = matchingExistingSession?.id || existingSessionId || `att-sess-${Date.now()}`;

    const sessionToSave: AttendanceSession = {
      ...sessionData,
      id: sessionId,
      submittedAt: matchingExistingSession?.submittedAt || new Date().toISOString()
    };

    // Optimistic local update
    const updatedSessions = matchingExistingSession || existingSessionId
      ? attendanceSessions.map(s => (s.id === sessionId ? sessionToSave : s))
      : [sessionToSave, ...attendanceSessions];

    setAttendanceSessions(updatedSessions);

    // Optimistic local update of studentAttendance summaries
    if (sessionToSave.records && sessionToSave.records.length > 0) {
      setStudentAttendance(prev => {
        const next = [...prev];
        for (const rec of sessionToSave.records) {
          const sid = rec.studentId;
          const susn = rec.usn;
          const subCode = sessionToSave.subjectCode;

          const studentSubSessions = updatedSessions.filter(s =>
            s.subjectCode === subCode &&
            s.records?.some(r => r.studentId === sid || (susn && r.usn === susn))
          );

          const total = studentSubSessions.length;
          let attended = 0;
          for (const s of studentSubSessions) {
            const r = s.records?.find(item => item.studentId === sid || (susn && item.usn === susn));
            if (r?.status === 'present') attended++;
          }
          const absent = Math.max(0, total - attended);
          const percentage = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
          const status = percentage >= 75 ? 'safe' : percentage >= 65 ? 'warning' : 'critical';

          const existingIdx = next.findIndex(
            sm => (sm.studentId === sid || (susn && sm.usn === susn)) && sm.subjectCode === subCode
          );

          const summaryItem: StudentSubjectAttendance = {
            id: `${sid}_${subCode}`,
            studentId: sid,
            usn: susn,
            studentName: rec.studentName,
            subjectId: sessionToSave.subjectId,
            subjectCode: subCode,
            subjectName: sessionToSave.subjectName,
            facultyName: sessionToSave.facultyName || 'Course Faculty',
            totalClasses: total,
            attendedClasses: attended,
            absentClasses: absent,
            percentage,
            status
          };

          if (existingIdx >= 0) {
            next[existingIdx] = { ...next[existingIdx], ...summaryItem };
          } else {
            next.push(summaryItem);
          }
        }
        return next;
      });
    }

    // Persist to Firestore (authoritatively updates sessions, individual records, and student summaries)
    try {
      await saveAttendanceSession(sessionToSave);

      // Dynamically calculate and update target department's real average attendance
      const targetSubject = subjects.find(s => s.id === sessionData.subjectId);
      const targetDept = departmentsRef.current.find(d =>
        d.code === targetSubject?.department ||
        d.name?.toLowerCase() === targetSubject?.department?.toLowerCase() ||
        d.id === targetSubject?.department
      );
      if (targetDept) {
        const allSessions = [sessionToSave, ...attendanceSessions.filter(s => s.id !== sessionId)];
        const deptSessions = allSessions.filter(s =>
          subjects.find(sub => sub.id === s.subjectId && (sub.department === targetDept.code || sub.department === targetDept.name))
        );
        const totalAll = deptSessions.reduce((acc, s) => acc + (s.totalStudents || 0), 0);
        const presentAll = deptSessions.reduce((acc, s) => acc + (s.presentCount || 0), 0);
        const newAvg = totalAll > 0 ? Number(((presentAll / totalAll) * 100).toFixed(1)) : 0;
        await updateDepartmentMetrics(targetDept.id, { avgAttendance: newAvg });
      }

      // Private notifications: notify students marked absent
      if (sessionData.records && sessionData.records.length > 0) {
        const absentList = sessionData.records.filter(r => r.status === 'absent');
        if (absentList.length > 0) {
          Promise.all(
            absentList.map(r =>
              firestoreCreateNotification({
                recipientUserId: r.studentId,
                senderUserId: currentUser.id,
                senderName: currentUser.name,
                title: 'Attendance Alert: Marked Absent',
                message: `You were marked Absent for ${sessionData.subjectCode} (${sessionData.subjectName}) on ${sessionData.date} (${sessionData.slot}).`,
                type: 'warning',
                linkTab: 'attendance',
                relatedEntity: 'attendance',
                relatedEntityId: sessionId
              })
            )
          ).catch(err => console.warn('Attendance notification notice:', err));
        }
      }
    } catch (e) {
      console.error('Error saving attendance session to Firestore:', e);
    }
  };

  const deleteAttendanceSessionRecord = async (sessionId: string) => {
    const sessionToDelete = attendanceSessions.find(s => s.id === sessionId);
    if (sessionToDelete) {
      assertSubjectOperationAuthorized(currentUser, currentRole, sessionToDelete.subjectId, subjects, 'Delete Attendance Record');
    }
    const remainingSessions = attendanceSessions.filter(s => s.id !== sessionId);
    setAttendanceSessions(remainingSessions);

    if (sessionToDelete && sessionToDelete.records) {
      setStudentAttendance(prev => {
        const next = [...prev];
        for (const rec of sessionToDelete.records) {
          const sid = rec.studentId;
          const susn = rec.usn;
          const subCode = sessionToDelete.subjectCode;

          const studentSubSessions = remainingSessions.filter(s =>
            s.subjectCode === subCode &&
            s.records?.some(r => r.studentId === sid || (susn && r.usn === susn))
          );

          const total = studentSubSessions.length;
          const existingIdx = next.findIndex(
            sm => (sm.studentId === sid || (susn && sm.usn === susn)) && sm.subjectCode === subCode
          );

          if (total === 0) {
            if (existingIdx >= 0) {
              next.splice(existingIdx, 1);
            }
          } else {
            let attended = 0;
            for (const s of studentSubSessions) {
              const r = s.records?.find(item => item.studentId === sid || (susn && item.usn === susn));
              if (r?.status === 'present') attended++;
            }
            const absent = Math.max(0, total - attended);
            const percentage = Number(((attended / total) * 100).toFixed(1));
            const status = percentage >= 75 ? 'safe' : percentage >= 65 ? 'warning' : 'critical';

            if (existingIdx >= 0) {
              next[existingIdx] = {
                ...next[existingIdx],
                totalClasses: total,
                attendedClasses: attended,
                absentClasses: absent,
                percentage,
                status
              };
            }
          }
        }
        return next;
      });
    }

    try {
      await firestoreDeleteAttendanceSession(sessionId);
    } catch (e) {
      console.error('Error deleting attendance session from Firestore:', e);
    }
  };

  // 2. Real-time Assessment Marks Entry (Minor 1, Minor 2, Mid Sem, End Sem)
  const recordAssessmentMarks = async (recordData: Omit<AssessmentRecord, 'id'>) => {
    // SECURITY ENFORCEMENT: Verify Role + Department + Assigned Subject authorization
    assertSubjectOperationAuthorized(currentUser, currentRole, recordData.subjectId, subjects, 'Record Assessment Marks');

    const newRecord: AssessmentRecord = {
      ...recordData,
      id: `ass-${Date.now()}`
    };

    const fieldKey = getAssessmentFieldKey(recordData.assessmentType);

    // Optimistic update for all evaluated students
    setAssessments(prev => [newRecord, ...prev]);

    setStudentMarks(prev => {
      let updated = [...prev];
      for (const entry of recordData.entries) {
        if (entry.marksObtained === null || entry.marksObtained === undefined) continue;

        const existingIdx = updated.findIndex(
          sm => sm.studentId === entry.studentId &&
                (sm.subjectId === recordData.subjectId || sm.subjectCode === recordData.subjectCode)
        );

        if (existingIdx >= 0) {
          const item = updated[existingIdx];
          const minor1 = fieldKey === 'minor1' ? entry.marksObtained : (item.minor1 ?? null);
          const minor2 = fieldKey === 'minor2' ? entry.marksObtained : (item.minor2 ?? null);
          const midSem = fieldKey === 'midSem' ? entry.marksObtained : (item.midSem ?? null);
          const endSem = fieldKey === 'endSem' ? entry.marksObtained : (item.endSem ?? null);
          const entered = [minor1, minor2, midSem, endSem].filter((m): m is number => m !== null);
          const total = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;

          updated[existingIdx] = {
            ...item,
            [fieldKey]: entry.marksObtained,
            total,
            updatedAt: new Date().toISOString()
          };
        } else {
          const minor1 = fieldKey === 'minor1' ? entry.marksObtained : null;
          const minor2 = fieldKey === 'minor2' ? entry.marksObtained : null;
          const midSem = fieldKey === 'midSem' ? entry.marksObtained : null;
          const endSem = fieldKey === 'endSem' ? entry.marksObtained : null;
          const entered = [minor1, minor2, midSem, endSem].filter((m): m is number => m !== null);
          const total = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;

          updated.push({
            id: `${entry.studentId}_${recordData.subjectCode}`,
            studentId: entry.studentId,
            studentName: entry.studentName,
            rollNumber: entry.usn,
            subjectId: recordData.subjectId,
            subjectCode: recordData.subjectCode,
            subjectName: recordData.subjectName,
            departmentCode: recordData.departmentCode,
            year: recordData.year,
            section: recordData.section,
            semester: recordData.semester,
            minor1,
            minor2,
            midSem,
            endSem,
            total,
            grade: null
          });
        }
      }
      return updated;
    });

    // Persist to Firestore
    try {
      await saveAssessmentRecord(newRecord, currentUser.name, currentRole);
    } catch (e) {
      console.error('Error saving assessment record to Firestore:', e);
    }
  };

  const saveSingleMark = async (params: Omit<SaveSingleMarkParams, 'actorName' | 'actorRole'>) => {
    // SECURITY ENFORCEMENT: Verify Role + Department + Assigned Subject authorization
    assertSubjectOperationAuthorized(currentUser, currentRole, params.subjectId, subjects, 'Save Single Mark');

    const fieldKey = getAssessmentFieldKey(params.assessmentType);

    // Optimistic local state update
    setStudentMarks(prev => {
      let updated = [...prev];
      const existingIdx = updated.findIndex(
        sm => sm.studentId === params.studentId &&
              (sm.subjectId === params.subjectId || sm.subjectCode === params.subjectCode)
      );

      if (existingIdx >= 0) {
        const item = updated[existingIdx];
        const minor1 = fieldKey === 'minor1' ? params.marksObtained : (item.minor1 ?? null);
        const minor2 = fieldKey === 'minor2' ? params.marksObtained : (item.minor2 ?? null);
        const midSem = fieldKey === 'midSem' ? params.marksObtained : (item.midSem ?? null);
        const endSem = fieldKey === 'endSem' ? params.marksObtained : (item.endSem ?? null);
        const entered = [minor1, minor2, midSem, endSem].filter((m): m is number => m !== null);
        const total = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;

        updated[existingIdx] = {
          ...item,
          [fieldKey]: params.marksObtained,
          total,
          updatedAt: new Date().toISOString()
        };
      } else {
        const minor1 = fieldKey === 'minor1' ? params.marksObtained : null;
        const minor2 = fieldKey === 'minor2' ? params.marksObtained : null;
        const midSem = fieldKey === 'midSem' ? params.marksObtained : null;
        const endSem = fieldKey === 'endSem' ? params.marksObtained : null;
        const entered = [minor1, minor2, midSem, endSem].filter((m): m is number => m !== null);
        const total = entered.length > 0 ? entered.reduce((a, b) => a + b, 0) : null;

        updated.push({
          id: `${params.studentId}_${params.subjectCode}`,
          studentId: params.studentId,
          studentName: params.studentName,
          rollNumber: params.rollNumber,
          subjectId: params.subjectId,
          subjectCode: params.subjectCode,
          subjectName: params.subjectName,
          departmentCode: params.departmentCode,
          year: params.year,
          section: params.section,
          semester: params.semester,
          minor1,
          minor2,
          midSem,
          endSem,
          total,
          grade: null
        });
      }
      return updated;
    });

    await firestoreSaveSingleStudentMark({
      ...params,
      actorName: currentUser.name,
      actorRole: currentRole
    });
  };

  // 3. Syllabus Topic completion toggle
  const toggleSyllabusTopic = async (
    subjectId: string,
    unitId: string,
    topicId: string,
    completed: boolean
  ) => {
    // SECURITY ENFORCEMENT: Verify Role + Department + Assigned Subject authorization
    assertSubjectOperationAuthorized(currentUser, currentRole, subjectId, subjects, 'Toggle Syllabus Topic');

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
    // SECURITY ENFORCEMENT: Verify Role + Department + Assigned Subject authorization
    assertSubjectOperationAuthorized(currentUser, currentRole, subjectId, subjects, 'Update Subject');

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
    // SECURITY ENFORCEMENT: Verify Role + Department + Assigned Subject authorization
    assertSubjectOperationAuthorized(currentUser, currentRole, subjectId, subjects, 'Update Subject Units');

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
    // Only Admin and Department HOD can delete curriculum subjects
    if (currentRole !== 'admin' && currentRole !== 'hod') {
      throw new Error('Access Denied: Only Administrator and Head of Department are authorized to delete subjects.');
    }

    const targetSubject = subjects.find(s => s.id === subjectId);
    if (!targetSubject) {
      throw new Error(`Subject with ID '${subjectId}' was not found.`);
    }

    if (currentRole === 'hod') {
      const hodDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const hodDeptName = (currentUser?.department || '').toLowerCase().trim();
      const subDeptCode = (targetSubject.departmentCode || '').toUpperCase().trim();
      const subDeptName = (targetSubject.department || '').toLowerCase().trim();
      const isMatch = (hodDeptCode && subDeptCode === hodDeptCode) || (hodDeptName && (subDeptName === hodDeptName || subDeptName.includes(hodDeptName)));
      if (!isMatch) {
        throw new Error('Access Denied: HOD can only delete subjects belonging to their own department.');
      }
    }

    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    try {
      await firestoreDeleteSubject(subjectId);
    } catch (e) {
      console.error('Error deleting subject in Firestore:', e);
    }
  };

  /**
   * Authorized Admin / HOD subject management for Faculty and Lab Assistants.
   * Faculty and Lab Assistants cannot assign themselves arbitrary subjects outside onboarding.
   */
  const assignFacultySubjects = async (facultyUserId: string, subjectIds: string[]): Promise<void> => {
    const targetUser = users.find(u => u.id === facultyUserId);
    if (!targetUser) {
      throw new Error(`Faculty/Staff member with ID '${facultyUserId}' was not found.`);
    }

    if (currentRole !== 'admin' && currentRole !== 'hod') {
      throw new Error('Access Denied: Only Administrator and Head of Department can manage subject assignments.');
    }

    if (currentRole === 'hod') {
      const hodDeptCode = (currentUser?.departmentCode || '').toUpperCase().trim();
      const hodDeptName = (currentUser?.department || '').toLowerCase().trim();
      const userDeptCode = (targetUser.departmentCode || '').toUpperCase().trim();
      const userDeptName = (targetUser.department || '').toLowerCase().trim();
      const isUserInDept = (hodDeptCode && userDeptCode === hodDeptCode) || (hodDeptName && (userDeptName === hodDeptName || userDeptName.includes(hodDeptName)));
      if (!isUserInDept) {
        throw new Error('Access Denied: HOD may only assign subjects to faculty within their own department.');
      }

      for (const sid of subjectIds) {
        const sub = subjects.find(s => s.id === sid);
        if (sub) {
          const subDeptCode = (sub.departmentCode || '').toUpperCase().trim();
          const subDeptName = (sub.department || '').toLowerCase().trim();
          const isSubInDept = (hodDeptCode && subDeptCode === hodDeptCode) || (hodDeptName && (subDeptName === hodDeptName || subDeptName.includes(hodDeptName)));
          if (!isSubInDept) {
            throw new Error(`Access Denied: Cannot assign subject '${sub.name}' from outside your department.`);
          }
        }
      }
    }

    const assignedNames = subjectIds.map(id => subjects.find(s => s.id === id)?.name || id);

    const userUpdates: Partial<UserProfile> = {
      assignedSubjectIds: subjectIds,
      assignedSubjectNames: assignedNames,
      assignedSubjectId: subjectIds[0] || '',
      assignedSubjectName: assignedNames[0] || '',
      hasCompletedSubjectOnboarding: true
    };

    setUsers(prev => prev.map(u => (u.id === facultyUserId ? { ...u, ...userUpdates } : u)));

    await saveUser({ ...targetUser, ...userUpdates });

    if (currentUser?.id === facultyUserId) {
      await updateCurrentUserProfile(userUpdates);
    }
  };

  // 3b. Real-Time Timetable Management
  const updateTimetableSlot = async (
    sectionId: string,
    departmentCode: string,
    academicYear: string,
    sectionName: string,
    day: TimetableDay,
    slotId: string,
    cell: TimetableCell | null
  ) => {
    // Optimistic local state update
    setTimetables(prev => {
      const existing = prev.find(t => t.sectionId === sectionId || t.id === sectionId);
      let updated: ClassTimetable;
      if (existing) {
        const schedule = { ...existing.schedule };
        const daySlots = { ...(schedule[day] || {}) };
        if (cell) {
          daySlots[slotId] = cell;
        } else {
          delete daySlots[slotId];
        }
        schedule[day] = daySlots;
        updated = { ...existing, schedule, updatedAt: new Date().toISOString() };
        return prev.map(t => (t.id === existing.id ? updated : t));
      } else {
        const schedule: any = {};
        schedule[day] = cell ? { [slotId]: cell } : {};
        updated = {
          id: sectionId,
          sectionId,
          departmentCode,
          academicYear,
          sectionName,
          schedule,
          slotsConfig: DEFAULT_TIMETABLE_SLOTS,
          updatedAt: new Date().toISOString()
        };
        return [...prev, updated];
      }
    });

    try {
      await firestoreUpdateTimetableSlot(sectionId, departmentCode, academicYear, sectionName, day, slotId, cell);

      // Notify affected faculty if assigned
      if (cell && cell.facultyId) {
        firestoreCreateNotification({
          recipientUserId: cell.facultyId,
          senderUserId: currentUser?.id || '',
          senderName: currentUser?.name || 'Administrator',
          title: 'Timetable Updated',
          message: `Your lecture for ${cell.subjectName} (${cell.subjectCode}) in ${departmentCode} Year ${academicYear} Sec ${sectionName} is scheduled on ${day} (${slotId}) in Room ${cell.room}.`,
          type: 'info',
          linkTab: 'timetable',
          relatedEntity: 'timetable',
          relatedEntityId: sectionId
        }).catch(err => console.warn('Timetable notification error:', err));
      }
    } catch (e) {
      console.error('Error updating timetable slot in Firestore:', e);
    }
  };

  // 4. Query / Grievance operations with strict ownership and private notifications
  const submitQuery = async (queryData: Omit<AcademicQuery, 'id' | 'ticketId' | 'createdAt' | 'status' | 'replies'>) => {
    const senderId = queryData.createdByUserId || queryData.createdBy || currentUser?.id || '';
    const senderRole = queryData.createdByRole || queryData.senderRole || currentRole || currentUser?.role || 'student';
    const senderName = queryData.createdByName || queryData.studentName || currentUser?.name || 'Institutional Member';
    const recipientUserId = queryData.recipientUserId || queryData.recipientId || '';
    const recipientRole = queryData.recipientRole;
    const recipientName = queryData.recipientName || queryData.assignedTo || '';
    const departmentId = queryData.departmentId || queryData.recipientDepartment || queryData.department || currentUser?.departmentCode || 'General';

    const newQuery: AcademicQuery = {
      ...queryData,
      id: `q-${Date.now()}`,
      ticketId: `ACAD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      createdByUserId: senderId,
      createdByRole: senderRole,
      createdByName: senderName,
      createdBy: senderId,
      studentId: senderId,
      studentName: senderName,
      senderRole: senderRole,
      senderEmail: queryData.senderEmail || currentUser?.email || '',
      senderDepartment: queryData.senderDepartment || currentUser?.departmentCode || '',
      usn: queryData.usn || currentUser?.regId || '',
      recipientUserId,
      recipientRole,
      recipientName,
      recipientDepartment: departmentId,
      recipientType: queryData.recipientType,
      recipientId: recipientUserId,
      assignedTo: recipientName,
      departmentId,
      department: departmentId,
      subjectId: queryData.subjectId || '',
      subjectName: queryData.subjectName || '',
      title: queryData.title,
      message: queryData.message || queryData.description || '',
      description: queryData.description || queryData.message || '',
      status: 'open',
      replies: []
    };

    setQueries(prev => {
      if (canUserAccessQuery(newQuery, currentUser, currentRole)) {
        return [newQuery, ...prev];
      }
      return prev;
    });

    try {
      await createQuery(newQuery);

      // Private Notification directly to recipient user ID
      if (recipientUserId) {
        firestoreCreateNotification({
          recipientUserId,
          senderUserId: senderId,
          senderName,
          title: `New Query: ${newQuery.title}`,
          message: `${senderName} submitted a private academic query: "${newQuery.title}" (${newQuery.subjectName || departmentId}).`,
          type: 'info',
          linkTab: 'queries',
          relatedEntity: 'query',
          relatedEntityId: newQuery.id
        }).catch(err => console.warn('Query notification error:', err));
      }
    } catch (e) {
      console.error('Error submitting query to Firestore:', e);
    }
  };

  const replyToQuery = async (queryId: string, authorName: string, authorRole: UserRole, message: string) => {
    const targetQuery = queriesRef.current.find(q => q.id === queryId);
    if (targetQuery) {
      assertQueryAccessAuthorized(currentUser, currentRole, targetQuery, 'reply');
    }

    const newReply: QueryReply = {
      id: `r-${Date.now()}`,
      authorName,
      authorRole,
      senderId: currentUser?.id || '',
      senderRole: authorRole,
      senderName: authorName,
      message,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      createdAt: new Date().toISOString()
    };

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

      // Send private notification to the counterparty (Student <-> Faculty)
      if (targetQuery) {
        const isCreator = (
          currentUser?.id === targetQuery.createdByUserId ||
          currentUser?.id === targetQuery.studentId ||
          currentUser?.id === targetQuery.createdBy
        );
        const notifyTargetId = isCreator
          ? (targetQuery.recipientUserId || targetQuery.recipientId)
          : (targetQuery.createdByUserId || targetQuery.studentId || targetQuery.createdBy);

        if (notifyTargetId && notifyTargetId !== currentUser?.id) {
          firestoreCreateNotification({
            recipientUserId: notifyTargetId,
            senderUserId: currentUser?.id || '',
            senderName: authorName,
            title: `Reply to Query: ${targetQuery.title}`,
            message: `${authorName} replied: "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}"`,
            type: 'info',
            linkTab: 'queries',
            relatedEntity: 'query',
            relatedEntityId: queryId
          }).catch(err => console.warn('Query reply notification error:', err));
        }
      }
    } catch (e) {
      console.error('Error adding query response to Firestore:', e);
    }
  };

  const updateQueryStatus = async (queryId: string, status: 'open' | 'in_progress' | 'resolved', actorName?: string) => {
    const targetQuery = queriesRef.current.find(q => q.id === queryId);
    if (targetQuery) {
      assertQueryAccessAuthorized(currentUser, currentRole, targetQuery, 'update');
    }

    setQueries(prev =>
      prev.map(q => {
        if (q.id !== queryId) return q;
        return { ...q, status };
      })
    );

    try {
      await firestoreUpdateQueryStatus(queryId, status, actorName);
    } catch (e) {
      console.error('Error updating query status in Firestore:', e);
    }
  };

  // Notification actions
  const markNotificationRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)));
    try {
      await firestoreMarkNotificationAsRead(notificationId);
    } catch (e) {
      console.error('Error marking notification read in Firestore:', e);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (currentUser?.id) {
      try {
        await firestoreMarkAllNotificationsAsRead(currentUser.id);
      } catch (e) {
        console.error('Error marking all notifications read in Firestore:', e);
      }
    }
  };

  const sendPrivateNotification = async (params: Omit<AppNotification, 'id' | 'createdAt'>) => {
    try {
      await firestoreCreateNotification(params);
    } catch (e) {
      console.error('Error sending private notification:', e);
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
          rollNumber: newUser.regId || `USN-${newUser.departmentCode || 'STU'}-${Date.now().toString().slice(-4)}`,
          registrationNumber: newUser.regId || `REG-${newUser.departmentCode || 'STU'}-${Date.now().toString().slice(-4)}`,
          departmentId: newUser.departmentCode ? `dept-${newUser.departmentCode.toLowerCase()}` : 'unassigned',
          departmentName: newUser.department || 'Unassigned Department',
          year: newUser.semester ? Math.ceil(newUser.semester / 2) : 0,
          section: newUser.section || '',
          semester: newUser.semester || 0,
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
    // Admin Protection Guard: Strict prevention of Admin account deletion at application layer
    const target = users.find(u => u.id === userId);
    if (userId === 'u-admin-1' || target?.role === 'admin' || target?.email?.toLowerCase().includes('admin@')) {
      const err = new Error('CRITICAL SECURITY VIOLATION: Institutional Administrator accounts are protected and cannot be deleted.');
      console.error(err.message);
      throw err;
    }
    try {
      await firestoreDeleteUser(userId);
      await firestoreDeleteStudent(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setStudents(prev => prev.filter(s => s.userId !== userId && s.id !== userId));
    } catch (e) {
      console.error('Error deleting user:', e);
      throw e;
    }
  };

  // Batches CRUD
  const createBatch = async (batchData: Omit<AcademicBatch, 'id'>): Promise<AcademicBatch> => {
    const cleanId = `batch-${batchData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || Date.now()}`;
    const newBatch: AcademicBatch = {
      ...batchData,
      id: cleanId,
      createdAt: new Date().toISOString()
    };
    setBatches(prev => [newBatch, ...prev]);
    try {
      await firestoreSaveBatch(newBatch, currentUser?.name || 'Administrator');
      return newBatch;
    } catch (e) {
      console.error('Error creating batch in Firestore:', e);
      return newBatch;
    }
  };

  const updateBatch = async (batchId: string, data: Partial<AcademicBatch>) => {
    setBatches(prev => prev.map(b => (b.id === batchId ? { ...b, ...data } : b)));
    const target = batches.find(b => b.id === batchId);
    if (target) {
      try {
        await firestoreSaveBatch({ ...target, ...data } as AcademicBatch, currentUser?.name || 'Administrator');
      } catch (e) {
        console.error('Error updating batch in Firestore:', e);
      }
    }
  };

  const deleteBatch = async (batchId: string) => {
    setBatches(prev => prev.filter(b => b.id !== batchId));
    try {
      await firestoreDeleteBatch(batchId, currentUser?.name || 'Administrator');
    } catch (e) {
      console.error('Error deleting batch in Firestore:', e);
    }
  };

  // Master Notes CRUD
  const createNote = async (noteData: Omit<MasterNote, 'id'>): Promise<MasterNote> => {
    const newNote: MasterNote = {
      ...noteData,
      id: `note-${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    setNotes(prev => [newNote, ...prev]);
    try {
      await firestoreSaveNote(newNote, currentUser?.name || 'Course Faculty', currentRole);
      return newNote;
    } catch (e) {
      console.error('Error saving note in Firestore:', e);
      return newNote;
    }
  };

  const updateNote = async (noteId: string, data: Partial<MasterNote>) => {
    setNotes(prev => prev.map(n => (n.id === noteId ? { ...n, ...data } : n)));
    const target = notes.find(n => n.id === noteId);
    if (target) {
      try {
        await firestoreSaveNote({ ...target, ...data } as MasterNote, currentUser?.name || 'Course Faculty', currentRole);
      } catch (e) {
        console.error('Error updating note in Firestore:', e);
      }
    }
  };

  const deleteNote = async (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try {
      await firestoreDeleteNote(noteId, currentUser?.name || 'Course Faculty', currentRole);
    } catch (e) {
      console.error('Error deleting note in Firestore:', e);
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
    const targetQuery = queriesRef.current.find(q => q.id === queryId);
    if (targetQuery) {
      assertQueryAccessAuthorized(currentUser, currentRole, targetQuery, 'delete');
    }
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
        batches,
        notes,
        timetables,
        notifications,
        unreadNotificationCount,
        isFirestoreReady,
        syncStatus,
        loadingState,
        errorState,
        markAttendance,
        recordAssessmentMarks,
        toggleSyllabusTopic,
        createSubject,
        updateSubject,
        updateSubjectUnits,
        deleteSubject,
        updateTimetableSlot,
        submitQuery,
        replyToQuery,
        updateQueryStatus,
        markNotificationRead,
        markAllNotificationsRead,
        sendPrivateNotification,
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
        saveSingleMark,
        deleteAttendanceSessionRecord,
        deleteQuery,
        deleteProblem,
        createBatch,
        updateBatch,
        deleteBatch,
        createNote,
        updateNote,
        deleteNote,
        purgeDemoUsers,
        purgeAllDemoData,
        assignFacultySubjects
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
