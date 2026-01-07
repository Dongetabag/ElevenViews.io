import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.tsx';
import Sidebar from './components/Sidebar.tsx';
import TopBar from './components/TopBar.tsx';
import DashboardHome from './components/DashboardHome.tsx';
import LeadsModule from './components/LeadsModule.tsx';
import ClientsModule from './components/ClientsModule.tsx';
import CampaignsModule from './components/CampaignsModule.tsx';
import AIToolsModule from './components/AIToolsModule.tsx';
import MediaModule from './components/MediaModule.tsx';
import AssetsModule from './components/AssetsModule.tsx';
import TeamModule from './components/TeamModule.tsx';
import ReportsModule from './components/ReportsModule.tsx';
import IntegrationsModule from './components/IntegrationsModule.tsx';
import SettingsModule from './components/SettingsModule.tsx';
import IntakeModal, { IntakeData } from './components/IntakeModal.tsx';
import { UserProfile } from './types.ts';
import { useDataStore } from './hooks/useDataStore.ts';

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showIntake, setShowIntake] = useState(false);

  // Data store for all app data
  const dataStore = useDataStore();

  useEffect(() => {
    const savedUser = localStorage.getItem('agency_user_profile');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        console.log('Restored User Profile:', parsed);
        setUserProfile(parsed);
      } catch (e) {
        console.error("Failed to parse user profile", e);
        localStorage.removeItem('agency_user_profile');
      }
    }
  }, []);

  const handleLogin = () => setShowIntake(true);
  
  const handleIntakeSubmit = (data: IntakeData) => {
    console.log('Processing Intake Submission in App:', data);
    
    const newUser: UserProfile = {
      ...data,
      email: `${data.name.toLowerCase().trim().replace(/\s/g, '.')}@recipelabs.ai`,
      isPremium: true,
      credits: 1000,
      totalToolsUsed: 0,
      hasCompletedOnboarding: false,
      themeMode: 'dark',
    };

    // Force immediate transition
    localStorage.setItem('agency_user_profile', JSON.stringify(newUser));
    setUserProfile(newUser);
    setShowIntake(false);
    setActiveModule('dashboard');
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
            leads={dataStore.data.leads}
            addLead={dataStore.addLead}
            updateLead={dataStore.updateLead}
            deleteLead={dataStore.deleteLead}
          />
        );
      case 'clients':
        return (
          <ClientsModule
            clients={dataStore.data.clients}
            addClient={dataStore.addClient}
            updateClient={dataStore.updateClient}
            deleteClient={dataStore.deleteClient}
          />
        );
      case 'campaigns':
        return (
          <CampaignsModule
            campaigns={dataStore.data.campaigns}
            addCampaign={dataStore.addCampaign}
            updateCampaign={dataStore.updateCampaign}
            deleteCampaign={dataStore.deleteCampaign}
          />
        );
      case 'ai-tools': return <AIToolsModule user={userProfile} />;
      case 'media': return <MediaModule user={userProfile} />;
      case 'assets': return <AssetsModule />;
      case 'team':
        return (
          <TeamModule
            team={dataStore.data.team}
            activities={dataStore.data.activities}
            addTeamMember={dataStore.addTeamMember}
            updateTeamMember={dataStore.updateTeamMember}
            deleteTeamMember={dataStore.deleteTeamMember}
          />
        );
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

  if (!userProfile) {
    return (
      <div className="bg-brand-dark min-h-screen">
        <LandingPage onLogin={handleLogin} />
        {showIntake && (
          <IntakeModal 
            show={showIntake} 
            onClose={() => setShowIntake(false)} 
            onSubmit={handleIntakeSubmit} 
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
        onLogout={() => {
          localStorage.removeItem('agency_user_profile');
          setUserProfile(null);
          setActiveModule('dashboard');
        }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={userProfile} />
        <main className="flex-1 overflow-y-auto bg-brand-dark scrollbar-hide">
          {renderModule()}
        </main>
      </div>
    </div>
  );
};

export default App;