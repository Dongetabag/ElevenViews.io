
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

// ============================================
// Production Module Types - Video Editing Suite
// ============================================

export type ProjectStatus =
  | 'draft'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'rendering'
  | 'completed'
  | 'archived';

export interface Resolution {
  width: number;
  height: number;
  label: '720p' | '1080p' | '4K' | 'custom';
}

export interface ProjectSettings {
  resolution: Resolution;
  frameRate: 24 | 30 | 60;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  backgroundColor: string;
  defaultTransition: TransitionType;
}

export interface ProjectMetadata {
  clientId?: string;
  campaignId?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
}

export interface VideoProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  timeline: Timeline;
  assets: ProjectAsset[];
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  collaborators?: string[];
  version: number;
  thumbnailUrl?: string;
}

export interface Timeline {
  id: string;
  duration: number;
  tracks: Track[];
  markers: TimelineMarker[];
  playheadPosition: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export type TrackType = 'video' | 'audio' | 'text' | 'overlay' | 'effect';

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume?: number;
  height?: number;
}

export interface Clip {
  id: string;
  trackId: string;
  assetId?: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'effect';
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  sourceUrl?: string;
  content?: TextContent | EffectContent;
  transitions: {
    in?: Transition;
    out?: Transition;
  };
  effects: ClipEffect[];
  keyframes?: Keyframe[];
  volume?: number;
  opacity?: number;
}

export interface TextContent {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor?: string;
  position: { x: number; y: number };
  alignment: 'left' | 'center' | 'right';
  animation?: TextAnimation;
}

export interface TextAnimation {
  type: 'none' | 'fade-in' | 'fade-out' | 'slide-in' | 'slide-out' | 'typewriter' | 'bounce';
  duration: number;
  delay?: number;
}

export interface EffectContent {
  type: string;
  params: Record<string, number | string | boolean>;
}

export interface ClipEffect {
  id: string;
  type: EffectType;
  params: Record<string, number | string | boolean>;
  enabled: boolean;
}

export type EffectType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'blur'
  | 'sharpen'
  | 'grayscale'
  | 'sepia'
  | 'vignette'
  | 'chromaKey'
  | 'colorCorrection'
  | 'speed'
  | 'reverse'
  | 'mirror';

export interface Transition {
  type: TransitionType;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export type TransitionType =
  | 'fade'
  | 'crossDissolve'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'zoom'
  | 'wipe'
  | 'iris'
  | 'none';

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: number | string;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  type: 'video' | 'audio' | 'image' | 'font';
  name: string;
  originalFilename: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  metadata: AssetMetadata;
  uploadedAt: string;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  frameRate?: number;
}

// AI Features for Production
export interface AISceneDetection {
  scenes: DetectedScene[];
  confidence: number;
  processingTime: number;
}

export interface DetectedScene {
  startTime: number;
  endTime: number;
  type: 'action' | 'dialogue' | 'transition' | 'static';
  confidence: number;
  suggestedCuts: number[];
  description?: string;
}

export interface AIVoiceOver {
  id: string;
  text: string;
  voice: VoiceOption;
  audioUrl?: string;
  duration?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  style?: 'natural' | 'professional' | 'casual' | 'narrator';
}

export interface SmartCutSuggestion {
  startTime: number;
  endTime: number;
  reason: string;
  confidence: number;
  action: 'keep' | 'remove' | 'trim';
}

// Vortex Media API Types
export interface VortexMediaRequest {
  type: 'generate' | 'enhance' | 'transcribe' | 'analyze' | 'voiceover' | 'music';
  content: string;
  options: Record<string, unknown>;
}

export interface VortexMediaResponse {
  success: boolean;
  jobId?: string;
  data?: unknown;
  error?: string;
  creditsUsed?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface VortexVideoGenerationOptions {
  prompt: string;
  duration?: number;
  style?: 'cinematic' | 'documentary' | 'commercial' | 'social';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  quality?: 'draft' | 'standard' | 'high';
}

export interface VortexEnhanceOptions {
  upscale?: boolean;
  denoise?: boolean;
  stabilize?: boolean;
  colorCorrect?: boolean;
  faceEnhance?: boolean;
}

export interface VortexVoiceOverOptions {
  text: string;
  voice: string;
  speed?: number;
  pitch?: number;
  language?: string;
}

// Export & Sharing Types
export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov' | 'gif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: Resolution;
  frameRate: number;
  codec: string;
  includeAudio: boolean;
  watermark?: WatermarkSettings;
}

export interface WatermarkSettings {
  enabled: boolean;
  imageUrl?: string;
  text?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size?: number;
}

export interface ShareableLink {
  id: string;
  projectId: string;
  url: string;
  shareToken: string;
  expiresAt?: string;
  password?: string;
  accessCount: number;
  permissions: 'view' | 'comment' | 'download';
  createdAt: string;
}

export interface ExportJob {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'rendering' | 'completed' | 'failed';
  progress: number;
  settings: ExportSettings;
  outputUrl?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// Production Store Types
export interface ProductionState {
  currentProject: VideoProject | null;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  playheadPosition: number;
  isPlaying: boolean;
  zoom: number;
  scrollPosition: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  editingClipId: string | null;
  copiedClips: Clip[];
  activePanel: 'timeline' | 'assets' | 'effects' | 'text' | 'audio' | 'ai';
  previewQuality: 'low' | 'medium' | 'high';
  showGrid: boolean;
  snapEnabled: boolean;
  undoStack: Timeline[];
  redoStack: Timeline[];
}
