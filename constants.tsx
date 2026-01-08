import React from 'react';
import {
  Home, Users, Briefcase, Mail, MessageSquare, Palette, Folder, Layout, BarChart, Settings, Search, Plus, Zap,
  Compass, Sparkles, Target, Brain, FlaskConical, ClipboardList, PenTool, FileText, Share2, Award, Zap as ZapIcon, Eye, MousePointer2, TrendingUp, Presentation, Users2, Send,
  Music, Video, Camera, Headphones, Film
} from 'lucide-react';
import { Tool, Recipe } from './types.ts';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
  { id: 'ar-hub', label: 'A&R Hub', icon: <Headphones className="w-5 h-5" /> },
  { id: 'production', label: 'Production', icon: <Film className="w-5 h-5" /> },
  { id: 'clients', label: 'Clients', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'campaigns', label: 'Campaigns', icon: <Camera className="w-5 h-5" /> },
  { id: 'ai-tools', label: 'AI Tools', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'media', label: 'Media Studio', icon: <Video className="w-5 h-5" /> },
  { id: 'assets', label: 'Media Vault', icon: <Folder className="w-5 h-5" /> },
  { id: 'team', label: 'Team', icon: <Users2 className="w-5 h-5" /> },
  { id: 'reports', label: 'Analytics', icon: <BarChart className="w-5 h-5" /> },
  { id: 'integrations', label: 'Integrations', icon: <Zap className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

// Default integrations configuration
export const DEFAULT_INTEGRATIONS = [
  { id: 'slack', name: 'Slack', description: 'Real-time agency notifications and lead alerts.', icon: 'slack', connected: false },
  { id: 'hubspot', name: 'HubSpot', description: 'Sync leads and client CRM data automatically.', icon: 'hubspot', connected: false },
  { id: 'google-drive', name: 'Google Drive', description: 'Direct asset storage and collaboration.', icon: 'drive', connected: false },
  { id: 'notion', name: 'Notion', description: 'Project documentation and agency wiki sync.', icon: 'notion', connected: false },
];

// Lead status columns for Kanban
export const LEAD_STATUS_COLUMNS = [
  { id: 'new', label: 'New Leads' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
];

// Media style presets
export const MEDIA_STYLE_PRESETS = [
  { id: 'photorealistic', name: 'Photorealistic', prompt: 'highly detailed, studio photography, 8k, cinematic lighting, sharp focus' },
  { id: 'minimalist-3d', name: 'Minimalist 3D', prompt: 'minimalist 3d render, blender style, soft global illumination, pastel gradients' },
  { id: 'noir-agency', name: 'Noir Agency', prompt: 'film noir style, high contrast, dramatic shadows, black and white cinematic' },
  { id: 'fluid-abstract', name: 'Fluid Abstract', prompt: 'abstract liquid metal, fluid dynamics, vibrant iridescence, futuristic' },
  { id: 'high-end-corp', name: 'High-End Corp', prompt: 'professional corporate photography, premium glass textures, bright airy aesthetic' },
];

// AI Tools
export const ALL_TOOLS: Tool[] = [
  {
    id: 'market-insight-ai',
    name: 'Market Insight AI',
    description: 'Competitive landscape and industry trend analysis.',
    category: 'Strategy',
    icon: <Search className="w-5 h-5" />,
    gradient: 'from-blue-600 to-cyan-500',
    systemInstruction: 'You are a market analyst providing strategic insights.'
  },
  {
    id: 'brand-essence-extractor',
    name: 'Brand Essence Extractor',
    description: 'Distill brand identity and core messaging.',
    category: 'Strategy',
    icon: <Brain className="w-5 h-5" />,
    gradient: 'from-purple-600 to-pink-500',
    systemInstruction: 'You are a brand strategist focusing on identity distillation.'
  },
  {
    id: 'campaign-architect',
    name: 'Campaign Architect',
    description: 'Design multi-channel campaign skeletons.',
    category: 'Creation',
    icon: <Layout className="w-5 h-5" />,
    gradient: 'from-orange-500 to-red-600',
    systemInstruction: 'You are a campaign strategist designing high-level marketing architectures.'
  },
  {
    id: 'copycraft-ai',
    name: 'CopyCraft AI',
    description: 'High-conversion advertising and social copy.',
    category: 'Creation',
    icon: <PenTool className="w-5 h-5" />,
    gradient: 'from-green-500 to-teal-600',
    systemInstruction: 'You are a creative copywriter focusing on conversion.'
  },
  {
    id: 'visual-muse',
    name: 'Visual Muse',
    description: 'Art direction and visual concept ideation.',
    category: 'Creation',
    icon: <Palette className="w-5 h-5" />,
    gradient: 'from-indigo-500 to-purple-600',
    systemInstruction: 'You are an art director helping with visual concepts.'
  },
  {
    id: 'pitch-perfect-ai',
    name: 'Pitch Perfect AI',
    description: 'Sales deck and client proposal structuring.',
    category: 'Client',
    icon: <Award className="w-5 h-5" />,
    gradient: 'from-yellow-500 to-orange-600',
    systemInstruction: 'You are a business development expert.'
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    description: 'Analyze client feedback for emotional context.',
    category: 'Client',
    icon: <Eye className="w-5 h-5" />,
    gradient: 'from-cyan-500 to-blue-600',
    systemInstruction: 'Analyze provided text for sentiment and core emotional drivers.'
  },
  {
    id: 'client-comms-assistant',
    name: 'Client Comms Assistant',
    description: 'Professional client management communication.',
    category: 'Client',
    icon: <Mail className="w-5 h-5" />,
    gradient: 'from-blue-400 to-indigo-500',
    systemInstruction: 'Draft professional, empathetic, and clear client communications.'
  },
  {
    id: 'project-brief-builder',
    name: 'Project Brief Builder',
    description: 'Standardize creative briefs for better delivery.',
    category: 'Productivity',
    icon: <FileText className="w-5 h-5" />,
    gradient: 'from-gray-600 to-gray-800',
    systemInstruction: 'Structure information into professional creative briefs.'
  },
  {
    id: 'creative-director-ai',
    name: 'Creative Director AI',
    description: 'Critical feedback on creative concepts.',
    category: 'Strategy',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-pink-500 to-rose-600',
    systemInstruction: 'Provide constructive, high-level creative direction.'
  },
  {
    id: 'client-persona-automator',
    name: 'Client Persona Automator',
    description: 'Data-driven buyer persona generation.',
    category: 'Strategy',
    icon: <Users className="w-5 h-5" />,
    gradient: 'from-blue-700 to-indigo-700',
    systemInstruction: 'Create detailed psychological profiles for target audiences.'
  },
  {
    id: 'seo-content-strategist',
    name: 'SEO Content Strategist',
    description: 'Keyword-driven content planning.',
    category: 'Creation',
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: 'from-emerald-500 to-green-700',
    systemInstruction: 'Design content strategies optimized for search engines.'
  },
  {
    id: 'budget-projection-ai',
    name: 'Budget Projection AI',
    description: 'Forecasting media spend and performance.',
    category: 'Productivity',
    icon: <ZapIcon className="w-5 h-5" />,
    gradient: 'from-amber-500 to-yellow-600',
    systemInstruction: 'Provide data-driven budget allocations and ROI forecasts.'
  },
  {
    id: 'ab-test-copy-generator',
    name: 'A/B Test Copy Gen',
    description: 'Generate multivariate copy variations.',
    category: 'Creation',
    icon: <MousePointer2 className="w-5 h-5" />,
    gradient: 'from-violet-500 to-purple-700',
    systemInstruction: 'Generate distinct A/B test variations for specific messaging goals.'
  },
  {
    id: 'social-calendar-automator',
    name: 'Social Calendar Automator',
    description: 'Automated social media scheduling plans.',
    category: 'Productivity',
    icon: <ClipboardList className="w-5 h-5" />,
    gradient: 'from-sky-500 to-blue-500',
    systemInstruction: 'Plan social media content calendars with engagement-focused hooks.'
  },
  {
    id: 'presentation-weaver-ai',
    name: 'Presentation Weaver',
    description: 'Storyline development for complex decks.',
    category: 'Productivity',
    icon: <Presentation className="w-5 h-5" />,
    gradient: 'from-slate-700 to-slate-900',
    systemInstruction: 'Weave data and insights into compelling presentation narratives.'
  }
];

// Recipes (workflow automations)
export const ALL_RECIPES: Recipe[] = [
  {
    id: 'brand-launch',
    name: 'Brand Launch Kit',
    description: 'The standard sequence for new client on-boarding.',
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-brand-violet to-brand-royal-blue',
    toolIds: ['market-insight-ai', 'brand-essence-extractor', 'campaign-architect']
  },
  {
    id: 'growth-sprint',
    name: 'Growth Sprint',
    description: 'Quickly scale performance for existing clients.',
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: 'from-brand-neon-green to-brand-aqua',
    toolIds: ['client-persona-automator', 'seo-content-strategist', 'ab-test-copy-generator']
  }
];
