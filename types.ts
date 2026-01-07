
import React from 'react';

export interface UserProfile {
  name: string;
  email: string;
  role: 'Designer' | 'Copywriter' | 'Strategist' | 'Account Manager';
  isPremium: boolean;
  credits: number;
  totalToolsUsed: number;
  hasCompletedOnboarding: boolean;
  agencyBrandVoice: string;
  agencyCoreCompetency: string;
  primaryClientIndustry: string;
  idealClientProfile: string;
  targetLocation: string;
  clientWorkExamples: string;
  primaryGoals: string[];
  successMetric: string;
  platformTheme: string;
  toolLayout: 'grid' | 'list';
  themeMode: 'dark' | 'light';
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  website: string;
  status: LeadStatus;
  score: number;
  source?: string;
  notes?: string;
  lastContactedAt?: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  industry: string;
  healthScore: 'green' | 'yellow' | 'red';
  activeProjects: number;
  totalValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft' | 'completed';
  type?: 'email' | 'social' | 'ads' | 'content';
  openRate: number;
  clickRate: number;
  sent: number;
  replies?: number;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  status: 'active' | 'away' | 'offline';
  workload: number;
  avatar: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId?: string;
  user: string;
  action: string;
  target: string;
  targetType?: 'lead' | 'client' | 'campaign' | 'asset' | 'system';
  time: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  size: number;
  url?: string;
  clientId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  lastSyncedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  icon: React.ReactNode;
  color: string;
}

export interface ChatThread {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  agentId: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
  satisfaction?: 'satisfied' | 'unsatisfied' | null;
  thought?: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'Strategy' | 'Creation' | 'Client' | 'Productivity';
  icon: React.ReactElement;
  gradient: string;
  systemInstruction: string;
  promptExamples?: string[] | ((user: UserProfile) => string[]);
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  icon: React.ReactElement;
  gradient: string;
  toolIds: string[];
}

// Data store types for persistence
export interface AppData {
  leads: Lead[];
  clients: Client[];
  campaigns: Campaign[];
  team: TeamMember[];
  activities: Activity[];
  assets: Asset[];
  integrations: Integration[];
}

// Stats types for dashboard
export interface DashboardStats {
  totalLeads: number;
  leadsChange: number;
  pipelineValue: number;
  pipelineChange: number;
  activeCampaigns: number;
  campaignsChange: number;
  conversionRate: number;
  conversionChange: number;
}
