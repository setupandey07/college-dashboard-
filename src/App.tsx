import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AcademicDataProvider } from './context/AcademicDataContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner';
import { FirebaseRulesBanner } from './components/common/FirebaseRulesBanner';
import { LoginPage } from './components/auth/LoginPage';
import { VerifyingScreen } from './components/auth/VerifyingScreen';
import { CompleteProfilePage } from './components/auth/CompleteProfilePage';
import { UserRole } from './types';

// Dashboards
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { HodDashboard } from './components/dashboard/HodDashboard';
import { FacultyDashboard } from './components/dashboard/FacultyDashboard';
import { LabAssistantDashboard } from './components/dashboard/LabAssistantDashboard';
import { StudentDashboard } from './components/dashboard/StudentDashboard';

// Modules
import { AttendanceModule } from './components/modules/AttendanceModule';
import { MarksModule } from './components/modules/MarksModule';
import { SyllabusModule } from './components/modules/SyllabusModule';
import { WorkloadModule } from './components/modules/WorkloadModule';
import { DepartmentsModule } from './components/modules/DepartmentsModule';
import { UsersModule } from './components/modules/UsersModule';
import { QueriesModule } from './components/modules/QueriesModule';
import { InnovationHubModule } from './components/modules/InnovationHubModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { AnnouncementsModule } from './components/modules/AnnouncementsModule';
import { LabOperationsModule } from './components/modules/LabOperationsModule';
import { MasterNotesModule } from './components/modules/MasterNotesModule';
import { ProfileModule } from './components/modules/ProfileModule';
import { GeminiAssistantModal } from './components/modules/GeminiAssistantModal';

const AppContent: React.FC = () => {
  const { authState, currentRole, actualRole, currentUser } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [syllabusSubjectId, setSyllabusSubjectId] = useState<string | undefined>(undefined);

  // 1. Direct URL Protection & Synchronization
  useEffect(() => {
    if (authState !== 'AUTHORIZED') return;

    const handleUrlProtection = () => {
      if (typeof window === 'undefined') return;
      const path = (window.location.pathname || '/').toLowerCase();

      // Role path map
      const rolePrefixes: Record<string, UserRole> = {
        '/admin': 'admin',
        '/student': 'student',
        '/faculty': 'faculty',
        '/hod': 'hod',
        '/lab': 'lab_assistant'
      };

      for (const [prefix, role] of Object.entries(rolePrefixes)) {
        if (path === prefix || path.startsWith(`${prefix}/`)) {
          // If user's actual database role does not match this route and user is not admin
          if (actualRole !== 'admin' && actualRole !== role) {
            console.warn(`[RouteGuard] Direct access restricted: ${path} not allowed for actual role ${actualRole}`);
            const destination = `/${actualRole}`;
            if (window.history.pushState) {
              window.history.pushState({}, '', destination);
            }
          }
          break;
        }
      }
    };

    handleUrlProtection();
    window.addEventListener('popstate', handleUrlProtection);
    return () => window.removeEventListener('popstate', handleUrlProtection);
  }, [authState, actualRole]);

  // Tab permissions validation when role changes (e.g. Admin visiting Student view)
  useEffect(() => {
    const roleAllowedTabs: Record<UserRole, NavTab[]> = {
      admin: ['dashboard', 'marks', 'notes', 'syllabus', 'workload', 'departments', 'users', 'queries', 'innovation', 'reports', 'announcements', 'lab_ops', 'profile'],
      hod: ['dashboard', 'attendance', 'marks', 'notes', 'syllabus', 'workload', 'departments', 'users', 'queries', 'innovation', 'reports', 'announcements', 'lab_ops', 'profile'],
      faculty: ['dashboard', 'attendance', 'marks', 'notes', 'syllabus', 'workload', 'queries', 'innovation', 'reports', 'announcements', 'lab_ops', 'profile'],
      lab_assistant: ['dashboard', 'attendance', 'marks', 'notes', 'syllabus', 'lab_ops', 'queries', 'innovation', 'announcements', 'profile'],
      student: ['dashboard', 'attendance', 'marks', 'notes', 'syllabus', 'queries', 'innovation', 'announcements', 'profile']
    };

    const allowed = roleAllowedTabs[currentRole] || [];
    if (!allowed.includes(currentTab)) {
      setCurrentTab('dashboard');
    }
  }, [currentRole, currentTab]);

  // 2. Authentication Gates (Zero dashboard flash)
  if (authState === 'INITIAL_LOADING') {
    return (
      <VerifyingScreen
        message="Connecting to AcademicCore..."
        subMessage="Initializing secure session and checking institutional configuration..."
      />
    );
  }

  if (authState === 'SIGNING_IN' || authState === 'VERIFYING_PROFILE') {
    return (
      <VerifyingScreen
        message="Verifying your AcademicCore account..."
        subMessage="Checking institutional credentials and resolving authoritative role permissions..."
      />
    );
  }

  if (authState === 'UNAUTHENTICATED' || authState === 'ACCESS_DENIED') {
    return <LoginPage />;
  }

  // 2.5 First-Time Profile Completion & Subject Onboarding Gate
  // Incomplete profiles or faculty/lab assistants without completed initial subject onboarding are gated
  const isFacultyOrLab =
    actualRole === 'faculty' ||
    actualRole === 'lab_assistant' ||
    currentUser?.role === 'faculty' ||
    currentUser?.role === 'lab_assistant';

  const needsSubjectOnboarding = Boolean(isFacultyOrLab && !currentUser?.hasCompletedSubjectOnboarding);

  if (currentUser && actualRole !== 'admin' && (currentUser.isProfileComplete === false || needsSubjectOnboarding)) {
    return <CompleteProfilePage />;
  }

  // 3. Authorized View: Render role-specific dashboard when tab is 'dashboard'
  const renderDashboard = () => {
    switch (currentRole) {
      case 'admin':
        return <AdminDashboard onNavigate={setCurrentTab} />;
      case 'hod':
        return <HodDashboard onNavigate={setCurrentTab} />;
      case 'faculty':
        return (
          <FacultyDashboard
            onNavigate={setCurrentTab}
            onOpenAiAssistant={() => setIsAiModalOpen(true)}
          />
        );
      case 'lab_assistant':
        return <LabAssistantDashboard onNavigate={setCurrentTab} />;
      case 'student':
        return (
          <StudentDashboard
            onNavigate={setCurrentTab}
            onOpenAiAssistant={() => setIsAiModalOpen(true)}
          />
        );
      default:
        return <AdminDashboard onNavigate={setCurrentTab} />;
    }
  };

  // Render main content based on selected tab
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return renderDashboard();
      case 'attendance':
        return <AttendanceModule />;
      case 'marks':
        return <MarksModule />;
      case 'notes':
        return <MasterNotesModule />;
      case 'syllabus':
        return (
          <SyllabusModule
            initialSubjectId={syllabusSubjectId}
            key={syllabusSubjectId || 'default-syllabus'}
          />
        );
      case 'workload':
        return <WorkloadModule />;
      case 'departments':
        return (
          <DepartmentsModule
            onNavigateToSyllabus={(subId) => {
              setSyllabusSubjectId(subId);
              setCurrentTab('syllabus');
            }}
          />
        );
      case 'users':
        return <UsersModule />;
      case 'queries':
        return <QueriesModule />;
      case 'innovation':
        return <InnovationHubModule />;
      case 'reports':
        return <ReportsModule />;
      case 'announcements':
        return <AnnouncementsModule />;
      case 'lab_ops':
        return <LabOperationsModule />;
      case 'profile':
        return <ProfileModule />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F8F5] flex text-[#14382C]">
      {/* Light Mint-Sage Institutional Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Right Content Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dev Simulator Role Switcher Banner */}
        <RoleSwitcherBanner />

        {/* Institutional Header */}
        <Header
          currentTab={currentTab}
          onOpenAiAssistant={() => setIsAiModalOpen(true)}
          onNavigateToProfile={() => setCurrentTab('profile')}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto">
          <FirebaseRulesBanner />
          {renderContent()}
        </main>
      </div>

      {/* Gemini AI Academic Copilot Modal */}
      <GeminiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AcademicDataProvider>
        <AppContent />
      </AcademicDataProvider>
    </AuthProvider>
  );
}
