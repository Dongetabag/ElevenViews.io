
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

// Media categories and subcategories
export type MediaCategory = 'video' | 'image' | 'audio' | 'document' | 'project';
export type AudioSubcategory = 'songs' | 'beats' | 'stems' | 'masters';
export type VideoSubcategory = 'raw' | 'edits' | 'finals' | 'thumbnails';
export type ImageSubcategory = 'photos' | 'graphics' | 'thumbnails' | 'ai-generated';

// Enhanced metadata for media files
export interface MediaMetadata {
  category: MediaCategory;
  subcategory?: AudioSubcategory | VideoSubcategory | ImageSubcategory | string;
  tags: string[];

  // Duration for audio/video (in seconds)
  duration?: number;

  // Dimensions for images/video
  dimensions?: { width: number; height: number };

  // Technical info
  codec?: string;
  bitrate?: number;
  format?: string;

  // Music-specific metadata
  bpm?: number;
  key?: string;
  artist?: string;
  album?: string;

  // Optimization tracking
  isOptimized: boolean;
  originalKey?: string;  // Reference to original file if this is optimized version
  optimizedKey?: string; // Reference to optimized version if this is original

  // Revision system
  revision?: number;
  parentRevision?: string; // ID of parent asset
  revisionHistory?: string[]; // Array of revision asset IDs

  // Thumbnail
  thumbnailUrl?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  size: number;
  url?: string;
  key?: string; // S3/Wasabi key
  clientId?: string;
  tags?: string[];

  // Enhanced metadata
  metadata?: MediaMetadata;

  // Quick access fields (also in metadata)
  subcategory?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
  thumbnailUrl?: string;

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

// AI Executive Assistant Chat Sessions
export interface AIChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  summary?: string; // Auto-generated summary of older messages for context continuity
  summarizedUpTo?: number; // Index of last summarized message
  createdAt: string;
  updatedAt: string;
}

export interface AIAssistantData {
  sessions: AIChatSession[];
  activeSessionId: string | null;
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

// User Memory & Persistence Types
export interface UserPreferences {
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  categoryFilter: string | null;
  subcategoryFilter: string | null;
}

export interface RecentFile {
  assetId: string;
  name: string;
  url: string;
  type: string;
  accessedAt: string;
}

export interface FavoriteFile {
  assetId: string;
  name: string;
  url: string;
  type: string;
  addedAt: string;
}

export interface UserMemory {
  userId: string;
  preferences: UserPreferences;
  recentFiles: RecentFile[];
  favorites: FavoriteFile[];
  chatSessions: AIChatSession[];
  currentChatSessionId: string | null;
  lastSyncedAt: string;
}

// Video Player Types
export interface VideoTrack {
  id: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  duration: number;
  category?: string;
  subcategory?: string;
  metadata?: MediaMetadata;
}

// Media Editor Types
export interface EditOperation {
  id: string;
  type: 'background-removal' | 'background-replace' | 'style-transfer' | 'object-removal' | 'object-addition' | 'color-correction' | 'upscale' | 'trim' | 'text-overlay';
  prompt?: string;
  params?: Record<string, unknown>;
  timestamp: string;
}

export interface MediaRevision {
  id: string;
  assetId: string;
  revisionNumber: number;
  url: string;
  operations: EditOperation[];
  createdAt: string;
}
