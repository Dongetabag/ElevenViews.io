import { useState, useEffect, useCallback } from 'react';
import {
  Lead, Client, Campaign, TeamMember, Activity, Asset, Integration, AppData, DashboardStats
} from '../types';

const STORAGE_KEY = 'recipe-labs-data';

const getInitialData = (): AppData => {
  if (typeof window === 'undefined') {
    return { leads: [], clients: [], campaigns: [], team: [], activities: [], assets: [], integrations: [] };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { leads: [], clients: [], campaigns: [], team: [], activities: [], assets: [], integrations: [] };
    }
  }
  return { leads: [], clients: [], campaigns: [], team: [], activities: [], assets: [], integrations: [] };
};

export const useDataStore = () => {
  const [data, setData] = useState<AppData>(getInitialData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setData(getInitialData());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoading]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = () => new Date().toISOString();

  // Leads CRUD
  const addLead = useCallback((lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLead: Lead = { ...lead, id: generateId(), createdAt: now(), updatedAt: now() };
    setData(prev => ({ ...prev, leads: [...prev.leads, newLead] }));
    addActivity({ user: 'You', action: 'added a new lead', target: lead.company, targetType: 'lead' });
    return newLead;
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setData(prev => ({
      ...prev,
      leads: prev.leads.map(l => l.id === id ? { ...l, ...updates, updatedAt: now() } : l)
    }));
  }, []);

  const deleteLead = useCallback((id: string) => {
    setData(prev => ({ ...prev, leads: prev.leads.filter(l => l.id !== id) }));
  }, []);

  // Clients CRUD
  const addClient = useCallback((client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newClient: Client = { ...client, id: generateId(), createdAt: now(), updatedAt: now() };
    setData(prev => ({ ...prev, clients: [...prev.clients, newClient] }));
    addActivity({ user: 'You', action: 'added a new client', target: client.name, targetType: 'client' });
    return newClient;
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setData(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === id ? { ...c, ...updates, updatedAt: now() } : c)
    }));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
  }, []);

  // Campaigns CRUD
  const addCampaign = useCallback((campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCampaign: Campaign = { ...campaign, id: generateId(), createdAt: now(), updatedAt: now() };
    setData(prev => ({ ...prev, campaigns: [...prev.campaigns, newCampaign] }));
    addActivity({ user: 'You', action: 'created a new campaign', target: campaign.name, targetType: 'campaign' });
    return newCampaign;
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setData(prev => ({
      ...prev,
      campaigns: prev.campaigns.map(c => c.id === id ? { ...c, ...updates, updatedAt: now() } : c)
    }));
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setData(prev => ({ ...prev, campaigns: prev.campaigns.filter(c => c.id !== id) }));
  }, []);

  // Team CRUD
  const addTeamMember = useCallback((member: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const newMember: TeamMember = { ...member, id: generateId(), createdAt: now() };
    setData(prev => ({ ...prev, team: [...prev.team, newMember] }));
    return newMember;
  }, []);

  const updateTeamMember = useCallback((id: string, updates: Partial<TeamMember>) => {
    setData(prev => ({
      ...prev,
      team: prev.team.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  }, []);

  const deleteTeamMember = useCallback((id: string) => {
    setData(prev => ({ ...prev, team: prev.team.filter(t => t.id !== id) }));
  }, []);

  // Activity
  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'time' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activity,
      id: generateId(),
      time: 'Just now',
      createdAt: now()
    };
    setData(prev => ({
      ...prev,
      activities: [newActivity, ...prev.activities].slice(0, 50) // Keep last 50 activities
    }));
    return newActivity;
  }, []);

  // Assets CRUD
  const addAsset = useCallback((asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAsset: Asset = { ...asset, id: generateId(), createdAt: now(), updatedAt: now() };
    setData(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
    addActivity({ user: 'You', action: 'uploaded an asset', target: asset.name, targetType: 'asset' });
    return newAsset;
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setData(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, []);

  // Dashboard Stats
  const getStats = useCallback((): DashboardStats => {
    const leads = data.leads;
    const wonLeads = leads.filter(l => l.status === 'won');
    const totalLeads = leads.length;
    const pipelineValue = leads.reduce((sum, l) => sum + l.value, 0);
    const activeCampaigns = data.campaigns.filter(c => c.status === 'active').length;
    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;

    return {
      totalLeads,
      leadsChange: 0, // Would calculate from historical data
      pipelineValue,
      pipelineChange: 0,
      activeCampaigns,
      campaignsChange: 0,
      conversionRate: Math.round(conversionRate * 10) / 10,
      conversionChange: 0
    };
  }, [data]);

  // Convert lead to client
  const convertLeadToClient = useCallback((leadId: string) => {
    const lead = data.leads.find(l => l.id === leadId);
    if (!lead) return null;

    const newClient = addClient({
      name: lead.company,
      contactName: lead.name,
      email: lead.email,
      industry: 'General',
      healthScore: 'green',
      activeProjects: 0,
      totalValue: lead.value
    });

    updateLead(leadId, { status: 'won' });

    return newClient;
  }, [data.leads, addClient, updateLead]);

  return {
    // Data
    leads: data.leads,
    clients: data.clients,
    campaigns: data.campaigns,
    team: data.team,
    activities: data.activities,
    assets: data.assets,
    integrations: data.integrations,
    isLoading,

    // Leads
    addLead,
    updateLead,
    deleteLead,

    // Clients
    addClient,
    updateClient,
    deleteClient,

    // Campaigns
    addCampaign,
    updateCampaign,
    deleteCampaign,

    // Team
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,

    // Activity
    addActivity,

    // Assets
    addAsset,
    deleteAsset,

    // Stats
    getStats,

    // Conversions
    convertLeadToClient
  };
};

export type DataStore = ReturnType<typeof useDataStore>;
