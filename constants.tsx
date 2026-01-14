import React from 'react';
import {
  Home, Users, Briefcase, Mail, MessageSquare, Palette, Folder, Layout, BarChart, Settings, Search, Plus, Zap,
  Compass, Sparkles, Target, Brain, FlaskConical, ClipboardList, PenTool, FileText, Share2, Award, Eye, MousePointer2, TrendingUp, Presentation, Users2, Send,
  Music, Video, Camera, Headphones, Film, Globe, MapPin, Aperture, Play, Image
} from 'lucide-react';
import { Tool, Recipe } from './types.ts';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: <Home className="w-5 h-5" /> },
  { id: 'studio-engine', label: 'Studio Engine', icon: <Aperture className="w-5 h-5" /> },
  { id: 'brand-engine', label: 'Brand Engine', icon: <Palette className="w-5 h-5" /> },
  { id: 'design-agent', label: 'Design Agent', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'executive-agent', label: 'Executive Agent', icon: <Brain className="w-5 h-5" /> },
  { id: 'production', label: 'Video Studio', icon: <Film className="w-5 h-5" /> },
  { id: 'ar-hub', label: 'A&R Hub', icon: <Headphones className="w-5 h-5" /> },
  { id: 'clients', label: 'Projects', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'campaigns', label: 'Campaigns', icon: <Globe className="w-5 h-5" /> },
  { id: 'media', label: 'Media Studio', icon: <Play className="w-5 h-5" /> },
  { id: 'assets', label: 'Asset Library', icon: <Folder className="w-5 h-5" /> },
  { id: 'ai-tools', label: 'AI Suite', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'team', label: 'Crew', icon: <Users2 className="w-5 h-5" /> },
  { id: 'reports', label: 'Analytics', icon: <BarChart className="w-5 h-5" /> },
  { id: 'integrations', label: 'Integrations', icon: <Zap className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

// Default integrations configuration
export const DEFAULT_INTEGRATIONS = [
  { id: 'discord', name: 'Discord', description: 'Real-time team notifications and project alerts.', icon: 'discord', connected: true },
  { id: 'frame-io', name: 'Frame.io', description: 'Video review and collaboration platform.', icon: 'video', connected: false },
  { id: 'google-drive', name: 'Google Drive', description: 'Cloud storage for raw footage and assets.', icon: 'drive', connected: false },
  { id: 'notion', name: 'Notion', description: 'Production documentation and call sheets.', icon: 'notion', connected: false },
];

// Project status columns for Kanban
export const LEAD_STATUS_COLUMNS = [
  { id: 'new', label: 'Inquiry' },
  { id: 'contacted', label: 'Pre-Production' },
  { id: 'qualified', label: 'In Production' },
  { id: 'proposal', label: 'Post-Production' },
];

// Media style presets for production
export const MEDIA_STYLE_PRESETS = [
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic film look, anamorphic lens, natural lighting, film grain, 2.39:1 aspect ratio' },
  { id: 'documentary', name: 'Documentary', prompt: 'raw documentary style, natural light, authentic moments, handheld feel, observational' },
  { id: 'editorial', name: 'Editorial', prompt: 'high fashion editorial, dramatic lighting, clean compositions, luxury aesthetic' },
  { id: 'adventure', name: 'Adventure', prompt: 'epic landscapes, golden hour, wide shots, adventure lifestyle, expedition feel' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'clean minimalist aesthetic, negative space, soft neutral tones, architectural' },
];

// AI Tools for Production
export const ALL_TOOLS: Tool[] = [
  {
    id: 'location-scout-ai',
    name: 'Location Scout AI',
    description: 'Find and research global filming locations.',
    category: 'Production',
    icon: <MapPin className="w-5 h-5" />,
    gradient: 'from-amber-600 to-orange-500',
    systemInstruction: 'You are a location scout helping find and research filming locations worldwide. Consider permits, logistics, weather, and visual aesthetics.'
  },
  {
    id: 'script-breakdown',
    name: 'Script Breakdown',
    description: 'Analyze scripts for production requirements.',
    category: 'Production',
    icon: <FileText className="w-5 h-5" />,
    gradient: 'from-blue-600 to-cyan-500',
    systemInstruction: 'You analyze scripts and creative briefs to identify production requirements including locations, props, talent, equipment, and scheduling needs.'
  },
  {
    id: 'visual-moodboard',
    name: 'Visual Moodboard',
    description: 'Generate creative direction and references.',
    category: 'Creative',
    icon: <Palette className="w-5 h-5" />,
    gradient: 'from-purple-600 to-pink-500',
    systemInstruction: 'You are a creative director helping develop visual moodboards and creative direction for productions. Reference cinematography, color palettes, and visual styles.'
  },
  {
    id: 'shot-list-generator',
    name: 'Shot List Generator',
    description: 'Create detailed shot lists and schedules.',
    category: 'Production',
    icon: <ClipboardList className="w-5 h-5" />,
    gradient: 'from-green-500 to-teal-600',
    systemInstruction: 'You create detailed shot lists with camera angles, movements, and technical specifications for film and video productions.'
  },
  {
    id: 'treatment-writer',
    name: 'Treatment Writer',
    description: 'Draft creative treatments and proposals.',
    category: 'Creative',
    icon: <PenTool className="w-5 h-5" />,
    gradient: 'from-indigo-500 to-purple-600',
    systemInstruction: 'You write compelling creative treatments for video productions, capturing the visual style, narrative approach, and emotional tone.'
  },
  {
    id: 'client-brief-ai',
    name: 'Client Brief AI',
    description: 'Structure and clarify client requirements.',
    category: 'Client',
    icon: <Briefcase className="w-5 h-5" />,
    gradient: 'from-yellow-500 to-orange-600',
    systemInstruction: 'You help structure client briefs, extract key requirements, and identify creative opportunities from initial client conversations.'
  },
  {
    id: 'budget-estimator',
    name: 'Budget Estimator',
    description: 'Estimate production costs and resources.',
    category: 'Production',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-green-700',
    systemInstruction: 'You estimate production budgets based on requirements, locations, crew needs, and equipment. Provide detailed breakdowns.'
  },
  {
    id: 'casting-assistant',
    name: 'Casting Assistant',
    description: 'Help with talent casting and profiles.',
    category: 'Production',
    icon: <Users className="w-5 h-5" />,
    gradient: 'from-rose-500 to-pink-600',
    systemInstruction: 'You assist with talent casting, creating casting briefs, and evaluating talent for productions based on creative requirements.'
  },
  {
    id: 'social-content-ai',
    name: 'Social Content AI',
    description: 'Create social media content strategies.',
    category: 'Creative',
    icon: <Share2 className="w-5 h-5" />,
    gradient: 'from-sky-500 to-blue-600',
    systemInstruction: 'You develop social media content strategies for production companies and campaigns, including BTS content planning.'
  },
  {
    id: 'pitch-deck-ai',
    name: 'Pitch Deck AI',
    description: 'Create compelling client presentations.',
    category: 'Client',
    icon: <Presentation className="w-5 h-5" />,
    gradient: 'from-slate-600 to-gray-800',
    systemInstruction: 'You create compelling pitch decks and proposals for production companies, highlighting creative vision and production capabilities.'
  },
  {
    id: 'color-grade-ai',
    name: 'Color Grade Assistant',
    description: 'Color grading direction and LUT suggestions.',
    category: 'Post',
    icon: <Palette className="w-5 h-5" />,
    gradient: 'from-orange-500 to-red-600',
    systemInstruction: 'You provide color grading direction, LUT suggestions, and color palette recommendations for video productions based on mood and genre.'
  },
  {
    id: 'sound-design-ai',
    name: 'Sound Design Brief',
    description: 'Audio direction and sound design concepts.',
    category: 'Post',
    icon: <Headphones className="w-5 h-5" />,
    gradient: 'from-violet-500 to-purple-700',
    systemInstruction: 'You create sound design briefs and audio direction for productions, including music direction, ambient sound, and sonic branding.'
  },
];

// Recipes (workflow automations)
export const ALL_RECIPES: Recipe[] = [
  {
    id: 'new-project',
    name: 'New Project Setup',
    description: 'Complete workflow for new production projects.',
    icon: <Film className="w-6 h-6" />,
    gradient: 'from-brand-gold to-amber-600',
    toolIds: ['client-brief-ai', 'location-scout-ai', 'treatment-writer']
  },
  {
    id: 'pre-production',
    name: 'Pre-Production Pack',
    description: 'Prepare all pre-production deliverables.',
    icon: <ClipboardList className="w-6 h-6" />,
    gradient: 'from-blue-500 to-cyan-500',
    toolIds: ['script-breakdown', 'shot-list-generator', 'budget-estimator']
  },
  {
    id: 'pitch-prep',
    name: 'Pitch Preparation',
    description: 'Prepare compelling client pitches.',
    icon: <Presentation className="w-6 h-6" />,
    gradient: 'from-purple-500 to-pink-500',
    toolIds: ['visual-moodboard', 'treatment-writer', 'pitch-deck-ai']
  }
];

// AI Agents - Specialized autonomous agents for Eleven Views
export interface AIAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  icon: React.ReactElement;
  gradient: string;
  webhookEndpoint: string;
  systemPrompt: string;
}

export const AI_AGENTS: AIAgent[] = [
  {
    id: 'media-librarian',
    name: 'Media Librarian',
    description: 'Organizes and categorizes your media library with AI-powered intelligence.',
    capabilities: [
      'Auto-categorize uploaded media',
      'Suggest tags based on content analysis',
      'Create smart playlists and collections',
      'Identify duplicates and similar files',
      'Generate metadata from file content'
    ],
    icon: <Folder className="w-5 h-5" />,
    gradient: 'from-green-500 to-emerald-600',
    webhookEndpoint: '/webhook/agent-librarian',
    systemPrompt: `You are the Eleven Views Media Librarian agent. Your role is to:
- Analyze media files and suggest appropriate categories (songs, beats, stems, masters for audio; raw, edits, finals for video)
- Generate relevant tags based on file names, metadata, and content
- Create smart collections based on project, mood, genre, or style
- Identify duplicates and suggest organization improvements
- Provide summaries of library contents and statistics
Always respond with structured JSON when organizing files.`
  },
  {
    id: 'production-assistant',
    name: 'Production Assistant',
    description: 'AI-powered assistant for video and audio production workflows.',
    capabilities: [
      'Suggest video cuts and transitions',
      'Analyze footage for best takes',
      'Recommend music tracks for videos',
      'Track project progress and deadlines',
      'Generate edit decision lists (EDL)'
    ],
    icon: <Film className="w-5 h-5" />,
    gradient: 'from-purple-500 to-violet-600',
    webhookEndpoint: '/webhook/agent-production',
    systemPrompt: `You are the Eleven Views Production Assistant agent. Your role is to:
- Help with video editing decisions (cuts, transitions, pacing)
- Analyze footage and suggest best takes based on quality metrics
- Match music tracks to video mood and tempo
- Track production milestones and suggest timeline optimizations
- Create edit decision lists and shot lists
Provide specific timecodes and actionable recommendations.`
  },
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Generates thumbnails, graphics, and copy for your media content.',
    capabilities: [
      'Generate video thumbnails',
      'Write video descriptions and titles',
      'Create social media posts',
      'Design promotional graphics',
      'Generate hashtags and keywords'
    ],
    icon: <Image className="w-5 h-5" />,
    gradient: 'from-pink-500 to-rose-600',
    webhookEndpoint: '/webhook/agent-content',
    systemPrompt: `You are the Eleven Views Content Creator agent. Your role is to:
- Generate compelling video thumbnails with attention-grabbing elements
- Write SEO-optimized titles and descriptions
- Create engaging social media posts for different platforms
- Suggest promotional graphics and visual styles
- Generate relevant hashtags and keywords for discovery
Focus on engagement, brand consistency, and platform-specific best practices.`
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Finds trends, analyzes competitors, and provides content insights.',
    capabilities: [
      'Analyze content trends',
      'Find similar successful content',
      'Research competitor strategies',
      'Provide industry insights',
      'Suggest content improvements'
    ],
    icon: <Search className="w-5 h-5" />,
    gradient: 'from-blue-500 to-cyan-600',
    webhookEndpoint: '/webhook/agent-research',
    systemPrompt: `You are the Eleven Views Research Agent. Your role is to:
- Analyze current content trends in music, video, and media production
- Find and reference similar successful content for inspiration
- Research competitor strategies and content approaches
- Provide actionable industry insights and predictions
- Suggest specific improvements based on data and trends
Always cite sources and provide evidence-based recommendations.`
  }
];
