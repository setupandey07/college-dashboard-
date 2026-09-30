import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, testConnection } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  getUserByExactEmail,
  getUserById,
  createOrUpdateAdminProfile,
  updateUserProfile,
  subscribeUsers
} from '../services/firestore';
import {
  getStudentByExactEmail,
  createOrUpdateStudentProfile,
  updateStudentProfile
} from '../services/firestore/students';
import {
  normalizeEmail,
  isExactNitAndhraStudentDomain,
  isAttemptedStudentDomain,
  isAuthorizedDevAdminIdentity
} from '../lib/authHelpers';

export type AuthState =
  | 'INITIAL_LOADING'
  | 'UNAUTHENTICATED'
  | 'SIGNING_IN'
  | 'VERIFYING_PROFILE'
  | 'AUTHORIZED'
  | 'ACCESS_DENIED';

export interface AuthErrorDetails {
  title: string;
  message: string;
  code:
    | 'UNAUTHORIZED_ACCOUNT'
    | 'MISSING_STUDENT_PROFILE'
    | 'INVALID_STUDENT_DOMAIN'
    | 'ACCOUNT_DISABLED'
    | 'PROFILE_INCOMPLETE'
    | 'AUTH_ERROR'
    | 'BACKEND_ERROR';
  email?: string;
}

interface AuthContextType {
  // Auth state
  authState: AuthState;
  authError: AuthErrorDetails | null;
  firebaseUser: FirebaseUser | null;
  currentUser: UserProfile;
  actualRole: UserRole | null;
  currentRole: UserRole;
  isSimulatingRole: boolean;
  isDevRoleSwitcherActive: boolean;
  allUsers: UserProfile[];

  // Actions
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => void;
  returnToAdmin: () => void;
  clearAuthError: () => void;
  updateCurrentUserProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  simulateIdentityVerification: (email: string, uid?: string, displayName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('INITIAL_LOADING');
  const [authError, setAuthError] = useState<AuthErrorDetails | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Authoritative verified database profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  // Authoritative database role
  const [actualRole, setActualRole] = useState<UserRole | null>(null);
  // Active role view (can only differ from actualRole if actualRole === 'admin')
  const [currentRole, setCurrentRoleState] = useState<UserRole>('admin');

  // Authoritative Admin Profile cache so switching to other roles never loses admin identity
  const originalAdminProfileRef = useRef<UserProfile | null>(null);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Session storage key for session restore on refresh
  const SESSION_STORAGE_KEY = 'academiccore_session_identity';

  // Real-time Firestore users listener (Only attach if auth is ready, user is authenticated, and database is accessible)
  useEffect(() => {
    if (authState !== 'AUTHORIZED' || !firebaseUser) {
      return;
    }

    let unsub: (() => void) | null = null;
    let isCancelled = false;

    testConnection().then((canConnect) => {
      if (!canConnect || isCancelled) return;
      unsub = subscribeUsers(
        (users) => {
          if (users && users.length > 0) {
            setAllUsers(users);
            if (currentUser) {
              const updated = users.find(u => u.id === currentUser.id || u.email === currentUser.email);
              if (updated) {
                setCurrentUser(prev => prev ? { ...prev, ...updated } : updated);
              }
            }
          }
        },
        (err) => {
          console.warn('Users subscription notice:', err.message);
        }
      );
    });

    return () => {
      isCancelled = true;
      if (unsub) {
        try {
          unsub();
        } catch (_) {}
      }
    };
  }, [authState, firebaseUser, currentUser?.id, currentUser?.email]);

  /**
   * Core Identity Verification and Role Resolution Pipeline
   */
  const verifyIdentityAndResolveProfile = useCallback(
    async (credentials: {
      email: string;
      uid?: string;
      displayName?: string;
      photoURL?: string;
    }) => {
      setAuthState('VERIFYING_PROFILE');
      setAuthError(null);

      const normEmail = normalizeEmail(credentials.email);
      const normUid = credentials.uid || '';

      if (!normEmail && !normUid) {
        setAuthError({
          title: 'Authentication Failed',
          message: 'Unable to retrieve verified account credentials from Google.',
          code: 'AUTH_ERROR'
        });
        setAuthState('ACCESS_DENIED');
        return;
      }

      try {
        // -------------------------------------------------------------
        // STEP 1: Check Authorized Development Admin (Non-Student)
        // -------------------------------------------------------------
        if (isAuthorizedDevAdminIdentity(normEmail, normUid) && !isExactNitAndhraStudentDomain(normEmail)) {
          const adminProfile = await createOrUpdateAdminProfile(
            normUid || 'u-admin-1',
            normEmail || 'pkr02042006@gmail.com',
            credentials.displayName,
            credentials.photoURL
          );

          // Save verified session for page reload persistence
          try {
            sessionStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({
                email: normEmail,
                uid: normUid || 'u-admin-1',
                displayName: adminProfile.name,
                photoURL: adminProfile.avatar
              })
            );
          } catch (_) {}

          setActualRole('admin');
          setCurrentRoleState('admin');
          originalAdminProfileRef.current = adminProfile;
          setCurrentUser(adminProfile);
          setAuthState('AUTHORIZED');
          setAuthError(null);
          return;
        }

        // -------------------------------------------------------------
        // STEP 2: Check Student Domain & Student Profile
        // -------------------------------------------------------------
        if (isAttemptedStudentDomain(normEmail)) {
          // Check exact domain
          if (!isExactNitAndhraStudentDomain(normEmail)) {
            setAuthError({
              title: 'Invalid Student Domain',
              message: 'Please sign in using your official NIT Andhra Pradesh student account.',
              code: 'INVALID_STUDENT_DOMAIN',
              email: normEmail
            });
            setAuthState('ACCESS_DENIED');
            return;
          }

          // Exact domain valid (@student.nitandhra.ac.in). Now verify database record.
          let [existingUser, studentRecord] = await Promise.all([
            getUserByExactEmail(normEmail),
            getStudentByExactEmail(normEmail)
          ]);

          // Automatic Student Provisioning:
          // Verified official institutional student account! If not yet in database,
          // auto-provision their academic record so they are never blocked.
          if (!existingUser && !studentRecord) {
            try {
              const provisioned = await createOrUpdateStudentProfile(
                normUid || `stu-${normEmail.split('@')[0]}`,
                normEmail,
                credentials.displayName,
                credentials.photoURL
              );
              existingUser = provisioned.user;
              studentRecord = provisioned.student;
            } catch (provErr) {
              console.warn('Auto student provisioning warning:', provErr);
            }
          }

          // Check if disabled
          const status = existingUser?.status || studentRecord?.status || 'active';
          if (status === 'inactive') {
            setAuthError({
              title: 'Account Disabled',
              message: 'Your AcademicCore account is currently disabled. Please contact the college administrator.',
              code: 'ACCOUNT_DISABLED',
              email: normEmail
            });
            setAuthState('ACCESS_DENIED');
            return;
          }

          // Construct verified student profile
          const emailPrefix = normEmail.split('@')[0] || '525077';
          const rollNum = studentRecord?.rollNumber || studentRecord?.registrationNumber || emailPrefix.toUpperCase();

          const resolvedStudentProfile: UserProfile = existingUser || {
            id: studentRecord?.userId || studentRecord?.id || normUid || `stu-${emailPrefix}`,
            name: studentRecord?.name || credentials.displayName || `NIT Andhra Student (${rollNum})`,
            email: normEmail,
            role: 'student',
            department: studentRecord?.departmentName || 'Computer Science & Engineering',
            departmentCode: 'CSE',
            phone: '+91 91760 33412',
            regId: rollNum,
            designation: `B.Tech CSE - Semester ${studentRecord?.semester || 5}`,
            semester: studentRecord?.semester || 5,
            section: studentRecord?.section || 'A',
            joiningYear: String(studentRecord?.admissionYear || 2022),
            status: 'active',
            avatar:
              credentials.photoURL ||
              'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
          };

          // Save verified session for page reload persistence
          try {
            sessionStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({
                email: normEmail,
                uid: resolvedStudentProfile.id,
                displayName: resolvedStudentProfile.name,
                photoURL: resolvedStudentProfile.avatar
              })
            );
          } catch (_) {}

          setActualRole('student');
          setCurrentRoleState('student');
          setCurrentUser(resolvedStudentProfile);
          setAuthState('AUTHORIZED');
          setAuthError(null);
          return;
        }

        // -------------------------------------------------------------
        // STEP 3: Check Other Authorized Roles (HOD, Faculty, Lab Assistant)
        // -------------------------------------------------------------
        const existingStaffUser = await getUserByExactEmail(normEmail);

        if (existingStaffUser) {
          if (existingStaffUser.status === 'inactive') {
            setAuthError({
              title: 'Account Disabled',
              message: 'Your AcademicCore account is currently disabled. Please contact the college administrator.',
              code: 'ACCOUNT_DISABLED',
              email: normEmail
            });
            setAuthState('ACCESS_DENIED');
            return;
          }

          // Save verified session for page reload persistence
          try {
            sessionStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({
                email: normEmail,
                uid: existingStaffUser.id,
                displayName: existingStaffUser.name,
                photoURL: existingStaffUser.avatar
              })
            );
          } catch (_) {}

          setActualRole(existingStaffUser.role);
          setCurrentRoleState(existingStaffUser.role);
          if (existingStaffUser.role === 'admin') {
            originalAdminProfileRef.current = existingStaffUser;
          }
          setCurrentUser(existingStaffUser);
          setAuthState('AUTHORIZED');
          setAuthError(null);
          return;
        }

        // -------------------------------------------------------------
        // STEP 4: Non-authorized account
        // -------------------------------------------------------------
        setAuthError({
          title: 'Access Denied',
          message: 'Your Google account is not authorized to access AcademicCore.',
          code: 'UNAUTHORIZED_ACCOUNT',
          email: normEmail
        });
        setAuthState('ACCESS_DENIED');
      } catch (err) {
        console.error('Identity verification pipeline exception:', err);
        setAuthError({
          title: 'Verification Error',
          message: 'We could not verify your AcademicCore profile right now. Please try again.',
          code: 'BACKEND_ERROR',
          email: normEmail
        });
        setAuthState('ACCESS_DENIED');
      }
    },
    []
  );

  // Listen to Firebase Auth state on mount and session restore across refresh
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user) {
        setFirebaseUser(user);
        await verifyIdentityAndResolveProfile({
          email: user.email || '',
          uid: user.uid,
          displayName: user.displayName || '',
          photoURL: user.photoURL || ''
        });
      } else {
        // Session restore on browser refresh (Requirement #12)
        let savedSession: any = null;
        try {
          const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
          if (raw) savedSession = JSON.parse(raw);
        } catch (_) {}

        if (savedSession && (savedSession.email || savedSession.uid)) {
          // Re-fetch profile from database to ensure fresh authoritative permissions
          await verifyIdentityAndResolveProfile({
            email: savedSession.email || '',
            uid: savedSession.uid || '',
            displayName: savedSession.displayName || '',
            photoURL: savedSession.photoURL || ''
          });
        } else {
          setFirebaseUser(null);
          setCurrentUser(null);
          setActualRole(null);
          setAuthState('UNAUTHENTICATED');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [verifyIdentityAndResolveProfile]);

  /**
   * Google Sign-In with Popup and Diagnostic Error Handling
   */
  const signInWithGoogle = async () => {
    setAuthState('SIGNING_IN');
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setFirebaseUser(user);

      await verifyIdentityAndResolveProfile({
        email: user.email || '',
        uid: user.uid,
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      });
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        setAuthState('UNAUTHENTICATED');
        return;
      }
      console.warn('Google sign-in popup notice:', error);

      let title = 'Sign-In Unsuccessful';
      let message = error?.message || 'We could not complete Google sign-in. Please try again.';

      if (error?.code === 'auth/unauthorized-domain') {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'preview domain';
        title = 'Preview Domain Not Authorized in Firebase';
        message = `Firebase Authentication blocked OAuth from this domain (${currentHost}). To enable standard Google popup on this URL, add "${currentHost}" in Firebase Console → Authentication → Settings → Authorized domains.`;
      } else if (error?.code === 'auth/popup-blocked') {
        title = 'Google Sign-In Popup Blocked';
        message = 'Your browser or iframe sandbox blocked the Google sign-in popup. Please allow popups for this site and click Continue with Google again.';
      } else if (error?.code === 'auth/network-request-failed') {
        title = 'Network Connection Notice';
        message = 'A network issue or third-party cookie restriction prevented Google sign-in. Please check your internet connection and try again.';
      } else if (error?.code === 'auth/configuration-not-found') {
        title = 'Authentication Configuration Notice';
        message = 'Firebase Authentication configuration could not be resolved. Please reload and click Continue with Google.';
      }

      setAuthError({
        title,
        message,
        code: 'AUTH_ERROR'
      });
      setAuthState('ACCESS_DENIED');
    }
  };

  /**
   * Development Testing Simulator
   */
  const simulateIdentityVerification = async (email: string, uid?: string, displayName?: string) => {
    await verifyIdentityAndResolveProfile({
      email,
      uid: uid || `dev-${Date.now()}`,
      displayName: displayName || email
    });
  };

  /**
   * Secure Logout
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase sign out notice:', e);
    }
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (_) {}

    originalAdminProfileRef.current = null;
    setFirebaseUser(null);
    setCurrentUser(null);
    setActualRole(null);
    setCurrentRoleState('admin');
    setAuthState('UNAUTHENTICATED');
    setAuthError(null);

    // Reset URL to /
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/');
    }
  };

  /**
   * Return back to Admin mode seamlessly
   */
  const returnToAdmin = useCallback(() => {
    const hasAdminAccess =
      actualRole === 'admin' ||
      originalAdminProfileRef.current?.role === 'admin' ||
      isAuthorizedDevAdminIdentity(originalAdminProfileRef.current?.email || '', originalAdminProfileRef.current?.id) ||
      isAuthorizedDevAdminIdentity(firebaseUser?.email || '', firebaseUser?.uid);

    if (!hasAdminAccess) {
      console.warn('[Security Guard] Unauthorized return to admin rejected.');
      return;
    }

    setCurrentRoleState('admin');
    if (originalAdminProfileRef.current) {
      setCurrentUser(originalAdminProfileRef.current);
    }
  }, [actualRole, firebaseUser]);

  /**
   * Admin-Only Role Switcher
   * Gives Admin access to all roles to experience user workflows and test features live.
   *
   * CRITICAL SECURITY INVARIANT:
   * "One authenticated account = one identity."
   * Switching role changes only the testing simulation view (currentRole).
   * It must NEVER change currentUser, select another user's account, or fabricate a persona!
   */
  const setRole = (newRole: UserRole) => {
    // Strictly prevent non-admins from changing simulation views
    const hasAdminAccess =
      actualRole === 'admin' ||
      originalAdminProfileRef.current?.role === 'admin' ||
      isAuthorizedDevAdminIdentity(originalAdminProfileRef.current?.email || '', originalAdminProfileRef.current?.id) ||
      isAuthorizedDevAdminIdentity(currentUser?.email || '', currentUser?.id) ||
      isAuthorizedDevAdminIdentity(firebaseUser?.email || '', firebaseUser?.uid);

    if (!hasAdminAccess) {
      console.warn('[Security Guard] Unauthorized role switch rejected. Only authenticated Admin can switch simulator view.');
      return;
    }

    if (newRole === 'admin') {
      returnToAdmin();
      return;
    }

    // Save admin profile before switching view if not already saved
    if (actualRole === 'admin' && currentUser && currentUser.role === 'admin' && !originalAdminProfileRef.current) {
      originalAdminProfileRef.current = currentUser;
    }

    // Update simulation view state for testing only; do NOT alter currentUser!
    setCurrentRoleState(newRole);
  };

  const clearAuthError = () => {
    setAuthError(null);
    setAuthState('UNAUTHENTICATED');
  };

  const updateCurrentUserProfile = async (updatedData: Partial<UserProfile>): Promise<void> => {
    if (!currentUser) return;

    // Filter out locked identity / system fields to guarantee security
    // Locked: id, name, regId, email, role, department, departmentCode, status, section, semester
    const {
      id,
      name,
      regId,
      email,
      role,
      department,
      departmentCode,
      status,
      section,
      semester,
      ...allowedUpdates
    } = updatedData as any;

    const mergedUser = { ...currentUser, ...allowedUpdates };
    setCurrentUser(mergedUser);

    if (originalAdminProfileRef.current && originalAdminProfileRef.current.id === currentUser.id) {
      originalAdminProfileRef.current = { ...originalAdminProfileRef.current, ...allowedUpdates };
    }

    try {
      await updateUserProfile(currentUser.id, allowedUpdates);

      // If user is a student, also sync relevant fields to the students collection
      if (currentUser.role === 'student') {
        const studentUpdates: Record<string, any> = {};
        if (allowedUpdates.parentName !== undefined) studentUpdates.parentName = allowedUpdates.parentName;
        if (allowedUpdates.parentPhone !== undefined) studentUpdates.parentPhone = allowedUpdates.parentPhone;
        if (allowedUpdates.admissionYear !== undefined) studentUpdates.admissionYear = Number(allowedUpdates.admissionYear) || 2022;
        if (allowedUpdates.currentAcademicYear !== undefined) {
          studentUpdates.year = Number(allowedUpdates.currentAcademicYear.charAt(0)) || 3;
        }
        await updateStudentProfile(currentUser.id, studentUpdates);
      }
    } catch (e) {
      console.warn('Failed to sync user profile update to Firestore:', e);
      throw e;
    }
  };

  // Strictly check that role switcher is ONLY permitted for authentic Admin users
  const isDevRoleSwitcherActive =
    actualRole === 'admin' ||
    originalAdminProfileRef.current?.role === 'admin' ||
    isAuthorizedDevAdminIdentity(originalAdminProfileRef.current?.email || '', originalAdminProfileRef.current?.id) ||
    isAuthorizedDevAdminIdentity(firebaseUser?.email || '', firebaseUser?.uid);

  const defaultEmptyUser: UserProfile = {
    id: firebaseUser?.uid || '',
    name: firebaseUser?.displayName || 'Institutional Member',
    email: firebaseUser?.email || '',
    role: currentRole,
    department: 'Academic Administration',
    departmentCode: 'ADMIN',
    regId: 'MEM-000',
    avatar: firebaseUser?.photoURL || '',
    phone: '',
    joiningYear: '2026',
    status: 'active'
  };

  // Indicator for role simulation / preview mode
  const isSimulatingRole = actualRole === 'admin' && currentRole !== 'admin';

  return (
    <AuthContext.Provider
      value={{
        authState,
        authError,
        firebaseUser,
        currentUser: currentUser || defaultEmptyUser,
        actualRole,
        currentRole,
        isSimulatingRole,
        isDevRoleSwitcherActive,
        allUsers,
        signInWithGoogle,
        logout,
        setRole,
        returnToAdmin,
        clearAuthError,
        updateCurrentUserProfile,
        simulateIdentityVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
