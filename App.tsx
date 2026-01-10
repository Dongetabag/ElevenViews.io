import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.tsx';
import Sidebar from './components/Sidebar.tsx';
import TopBar from './components/TopBar.tsx';
import DashboardHome from './components/DashboardHome.tsx';
import LeadsModule from './components/LeadsModule.tsx';
import ClientsModule from './components/ClientsModule.tsx';
import CampaignsModule from './components/CampaignsModule.tsx';
import EmailBuilderModule from './components/EmailBuilderModule.tsx';
import AIToolsModule from './components/AIToolsModule.tsx';
import MediaModule from './components/MediaModule.tsx';
import AssetsModule from './components/AssetsModule.tsx';
import TeamModule from './components/TeamModule.tsx';
import ReportsModule from './components/ReportsModule.tsx';
import IntegrationsModule from './components/IntegrationsModule.tsx';
import SettingsModule from './components/SettingsModule.tsx';
import ARHubModule from './components/ARHubModule.tsx';
import ProductionModule from './components/ProductionModule.tsx';
import StudioEngine from './components/StudioEngine.tsx';
import BrandEngine from './components/BrandEngine.tsx';
import DesignAgent from './components/DesignAgent.tsx';
import MusicPlayer from './components/MusicPlayer.tsx';
import IntakeModal, { IntakeData } from './components/IntakeModal.tsx';
import LoginModal from './components/LoginModal.tsx';
import ResetPasswordPage from './components/ResetPasswordPage.tsx';
import { UserProfile } from './types.ts';
import { useDataStore } from './hooks/useDataStore.ts';
import { appStore } from './services/appStore.ts';
import { discordService } from './services/discordService.ts';
import { profileMemory } from './services/profileMemory.ts';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Data store for all app data
  const dataStore = useDataStore();

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if we're on the reset password page
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path === '/reset-password' || params.has('token')) {
      setShowResetPassword(true);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('agency_user_profile');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        console.log('Restored User Profile:', parsed);
        setUserProfile(parsed);

        // Initialize profile memory with user ID
        const userId = parsed.email || parsed.name?.replace(/\s+/g, '_').toLowerCase();
        if (userId) {
          profileMemory.init(userId);
          console.log('Profile memory initialized for:', userId);
        }

        // Re-register user in app store to ensure they appear in team
        if (parsed.name && parsed.email) {
          appStore.registerUser({
            name: parsed.name,
            email: parsed.email,
            role: parsed.role || 'Team Member',
            department: parsed.role,
            title: parsed.role,
            agencyCoreCompetency: parsed.agencyCoreCompetency,
            primaryClientIndustry: parsed.primaryClientIndustry,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(parsed.name)}&backgroundColor=d4a500&textColor=000000`
          });
        }
      } catch (e) {
        console.error("Failed to parse user profile", e);
        localStorage.removeItem('agency_user_profile');
      }
    }
  }, []);

  const handleShowLogin = () => setShowLogin(true);
  const handleShowRegister = () => setShowIntake(true);

  const handleLoginSuccess = (user: any) => {
    console.log('Login successful:', user);

    const userProfile: UserProfile = {
      name: user.name,
      email: user.email,
      role: user.role || 'Strategist',
      agencyCoreCompetency: user.agencyCoreCompetency || '',
      primaryClientIndustry: user.primaryClientIndustry || '',
      agencyBrandVoice: '',
      targetLocation: '',
      idealClientProfile: '',
      clientWorkExamples: '',
      primaryGoals: [],
      successMetric: '',
      platformTheme: 'violet',
      toolLayout: 'grid',
      isPremium: true,
      credits: 1000,
      totalToolsUsed: 0,
      hasCompletedOnboarding: true,
      themeMode: 'dark',
    };

    localStorage.setItem('agency_user_profile', JSON.stringify(userProfile));
    setUserProfile(userProfile);
    setShowLogin(false);
    setActiveModule('dashboard');

    // Initialize profile memory
    const userId = user.email || user.name?.replace(/\s+/g, '_').toLowerCase();
    if (userId) {
      profileMemory.init(userId);
    }
  };

  const handleIntakeSubmit = async (data: IntakeData) => {
    console.log('Processing Intake Submission in App:', data);

    const newUser: UserProfile = {
      ...data,
      isPremium: true,
      credits: 1000,
      totalToolsUsed: 0,
      hasCompletedOnboarding: false,
      themeMode: 'dark',
    };

    // Register user in app store with password
    try {
      const result = await appStore.registerUserWithPassword({
        name: data.name,
        email: data.email,
        role: data.role || 'Team Member',
        department: data.role,
        title: data.role,
        agencyCoreCompetency: data.agencyCoreCompetency,
        primaryClientIndustry: data.primaryClientIndustry,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=d4a500&textColor=000000`
      }, data.password);

      if (!result || !result.success) {
        console.error('Registration failed:', result?.error);
        alert(result?.error || 'Registration failed. Please try again.');
        return;
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('Registration failed. Please check your connection and try again.');
      return;
    }

    // Force immediate transition
    localStorage.setItem('agency_user_profile', JSON.stringify(newUser));
    setUserProfile(newUser);
    setShowIntake(false);
    setActiveModule('dashboard');

    // Initialize profile memory for new user
    const userId = data.email || data.name?.replace(/\s+/g, '_').toLowerCase();
    if (userId) {
      profileMemory.init(userId);
    }

    // Send Discord notification for new registration
    discordService.notifyNewProject({
      name: data.name,
      email: data.email,
      company: data.agencyCoreCompetency,
      industry: data.primaryClientIndustry,
      location: data.targetLocation,
      projectTypes: data.primaryGoals,
    }).catch(err => console.error('Discord notification failed:', err));
  };

  const renderModule = () => {
    if (!userProfile) return null;
    switch (activeModule) {
      case 'dashboard':
        return (
          <DashboardHome
            user={userProfile}
            stats={dataStore.getStats()}
            onNavigate={setActiveModule}
          />
        );
      case 'leads':
        return (
          <LeadsModule
            leads={dataStore.leads}
            addLead={dataStore.addLead}
            updateLead={dataStore.updateLead}
            deleteLead={dataStore.deleteLead}
          />
        );
      case 'clients':
        return (
          <ClientsModule
            clients={dataStore.clients}
            addClient={dataStore.addClient}
            updateClient={dataStore.updateClient}
            deleteClient={dataStore.deleteClient}
          />
        );
      case 'campaigns':
        return (
          <CampaignsModule
            campaigns={dataStore.campaigns}
            addCampaign={dataStore.addCampaign}
            updateCampaign={dataStore.updateCampaign}
            deleteCampaign={dataStore.deleteCampaign}
          />
        );
      case 'studio-engine': return <StudioEngine />;
      case 'brand-engine': return <BrandEngine />;
      case 'design-agent': return <DesignAgent />;
      case 'ar-hub': return <ARHubModule />;
      case 'production': return <ProductionModule />;
      case 'ai-tools': return <AIToolsModule user={userProfile} />;
      case 'media': return <MediaModule user={userProfile} />;
      case 'assets': return <AssetsModule />;
      case 'team':
        return <TeamModule />;
      case 'reports': return <ReportsModule />;
      case 'integrations': return <IntegrationsModule />;
      case 'settings': return <SettingsModule user={userProfile} onUpdate={setUserProfile} />;
      default:
        return (
          <DashboardHome
            user={userProfile}
            stats={dataStore.getStats()}
            onNavigate={setActiveModule}
          />
        );
    }
  };

  // Show reset password page if on /reset-password route
  if (showResetPassword) {
    return (
      <ResetPasswordPage
        onBackToLogin={() => {
          setShowResetPassword(false);
          window.history.replaceState({}, document.title, '/');
          setShowLogin(true);
        }}
      />
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-brand-dark min-h-screen">
        <LandingPage onLogin={handleShowLogin} onRegister={handleShowRegister} />
        {showIntake && (
          <IntakeModal
            show={showIntake}
            onClose={() => setShowIntake(false)}
            onSubmit={handleIntakeSubmit}
          />
        )}
        {showLogin && (
          <LoginModal
            show={showLogin}
            onClose={() => setShowLogin(false)}
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => {
              setShowLogin(false);
              setShowIntake(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-dark selection:bg-brand-gold selection:text-black">
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        onLogout={() => {
          appStore.logout();
          localStorage.removeItem('agency_user_profile');
          setUserProfile(null);
          setActiveModule('dashboard');
        }}
      />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TopBar
          user={userProfile}
          onLogout={() => {
            appStore.logout();
            localStorage.removeItem('agency_user_profile');
            setUserProfile(null);
            setActiveModule('dashboard');
          }}
          onNavigate={setActiveModule}
        />
        <main className="flex-1 overflow-y-auto bg-brand-dark scrollbar-hide pb-20 md:pb-20">
          {renderModule()}
        </main>
      </div>
      {/* Global Music Player */}
      <MusicPlayer minimized={true} />
    </div>
  );
};

export default App;
