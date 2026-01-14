import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types.ts';
import { GoogleGenAI } from '@google/genai';
import { AI_MODELS, getGoogleAIKey } from '../services/aiConfig';
import {
  Bot, Zap, FileText, Video, Image, Mail, MessageSquare,
  Loader2, CheckCircle, Copy, RefreshCw, Sparkles, Database,
  Send, BarChart3, Users, Folder, Activity, Server, AlertCircle,
  ChevronRight, ExternalLink
} from 'lucide-react';

// Use environment variable for MCP URL
const MCP_API_BASE = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

interface ExecutiveAgentModuleProps {
  user: UserProfile;
}

interface DashboardData {
  storage: {
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    categories: Record<string, number>;
  };
  projects: {
    total: number;
    active: number;
  };
  recentActivity: Array<{
    key: string;
    size: number;
    modified: string;
    category: string;
  }>;
  services: {
    api: string;
    discord: string;
    storage: string;
  };
}

interface GeneratedContent {
  content: string;
  type: string;
  model: string;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
}

// localStorage key for content history
const EXECUTIVE_AGENT_STORAGE_KEY = "eleven-views-executive-agent-history";

interface ContentHistoryItem {
  id: string;
  content: string;
  type: string;
  model: string;
  prompt: string;
  createdAt: string;
}

const CONTENT_TYPES = [
  { id: 'marketing', label: 'Marketing Copy', icon: <Sparkles className="w-4 h-4" />, description: 'Promotional content and ads' },
  { id: 'script', label: 'Video Script', icon: <Video className="w-4 h-4" />, description: 'Commercial & music video scripts' },
  { id: 'proposal', label: 'Project Proposal', icon: <FileText className="w-4 h-4" />, description: 'Client proposals and quotes' },
  { id: 'social', label: 'Social Media', icon: <MessageSquare className="w-4 h-4" />, description: 'Posts for all platforms' },
  { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, description: 'Outreach and follow-ups' },
  { id: 'caption', label: 'Captions', icon: <Image className="w-4 h-4" />, description: 'Photo captions with hashtags' },
];

const CONTENT_PROMPTS: Record<string, string> = {
  marketing: `You are an expert marketing copywriter for Eleven Views, a premium creative production studio. Create compelling marketing copy that:
- Uses gold (#F5C242) as the brand accent color conceptually
- Emphasizes luxury, premium quality, and excellence
- Speaks to high-end clients and brands
- Is concise yet impactful`,

  script: `You are a professional video scriptwriter for Eleven Views production studio. Create engaging video scripts that:
- Include clear scene directions and timing
- Balance visual descriptions with dialogue/voiceover
- Maintain a premium, cinematic quality
- Are formatted with proper script conventions`,

  proposal: `You are a business development expert for Eleven Views creative studio. Create professional project proposals that:
- Clearly outline scope, deliverables, and timeline
- Emphasize value proposition and ROI
- Maintain a confident, premium tone
- Include clear next steps`,

  social: `You are a social media strategist for Eleven Views. Create engaging social content that:
- Is platform-optimized (specify which platform)
- Includes relevant hashtags
- Drives engagement and brand awareness
- Maintains the premium brand voice`,

  email: `You are a professional communications specialist for Eleven Views. Write effective emails that:
- Have compelling subject lines
- Are personalized and professional
- Have clear calls-to-action
- Maintain brevity while being thorough`,

  caption: `You are a creative content writer for Eleven Views. Write captivating photo captions that:
- Are concise and impactful
- Include strategic hashtags
- Tell a story or evoke emotion
- Align with the premium brand aesthetic`
};

const ExecutiveAgentModule: React.FC<ExecutiveAgentModuleProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'dashboard' | 'assets'>('generate');
  const [selectedType, setSelectedType] = useState('marketing');
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Google AI', status: 'checking' },
    { name: 'MCP Server', status: 'checking' },
    { name: 'Wasabi CDN', status: 'checking' },
  ]);

  // Load content history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXECUTIVE_AGENT_STORAGE_KEY);
      if (stored) {
        setContentHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load content history:", e);
    }
  }, []);

  // Check service status on mount
  useEffect(() => {
    checkServices();
  }, []);

  const checkServices = async () => {
    const updatedServices: ServiceStatus[] = [];

    // Check Google AI
    const apiKey = getGoogleAIKey();
    updatedServices.push({
      name: 'Google AI',
      status: apiKey ? 'online' : 'offline'
    });

    // Check MCP
    try {
      const start = performance.now();
      const mcpRes = await fetch(`${MCP_API_BASE}/health`, { method: 'GET' });
      const latency = performance.now() - start;
      updatedServices.push({
        name: 'MCP Server',
        status: mcpRes.ok ? 'online' : 'offline',
        latency: Math.round(latency)
      });
    } catch {
      updatedServices.push({ name: 'MCP Server', status: 'offline' });
    }

    // Check Wasabi (via MCP proxy or direct)
    try {
      const wasabiRes = await fetch(`${MCP_API_BASE}/mcp/tools/list_files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 1 })
      });
      updatedServices.push({
        name: 'Wasabi CDN',
        status: wasabiRes.ok ? 'online' : 'offline'
      });
    } catch {
      updatedServices.push({ name: 'Wasabi CDN', status: 'offline' });
    }

    setServices(updatedServices);
  };

  const fetchDashboard = async () => {
    setIsLoadingDashboard(true);
    setError(null);
    try {
      // Fetch storage stats from MCP
      const filesRes = await fetch(`${MCP_API_BASE}/mcp/tools/list_files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: '', limit: 100 })
      });

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        const files = filesData.files || [];

        // Calculate stats
        const categories: Record<string, number> = { image: 0, video: 0, audio: 0, document: 0 };
        let totalSize = 0;

        files.forEach((file: any) => {
          totalSize += file.size || 0;
          const ext = file.key?.split('.').pop()?.toLowerCase() || '';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) categories.image++;
          else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) categories.video++;
          else if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) categories.audio++;
          else categories.document++;
        });

        setDashboard({
          storage: {
            totalFiles: files.length,
            totalSize,
            totalSizeFormatted: formatBytes(totalSize),
            categories
          },
          projects: { total: 0, active: 0 },
          recentActivity: files.slice(0, 10).map((f: any) => ({
            key: f.key,
            size: f.size,
            modified: f.lastModified,
            category: getCategoryFromKey(f.key)
          })),
          services: { api: 'online', discord: 'online', storage: 'online' }
        });
      } else {
        throw new Error('Failed to fetch files');
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err);
      setError('Could not load dashboard data. MCP server may be unavailable.');
      // Set empty dashboard
      setDashboard({
        storage: { totalFiles: 0, totalSize: 0, totalSizeFormatted: '0 B', categories: {} },
        projects: { total: 0, active: 0 },
        recentActivity: [],
        services: { api: 'unknown', discord: 'unknown', storage: 'unknown' }
      });
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const getCategoryFromKey = (key: string): string => {
    const ext = key?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) return 'audio';
    return 'document';
  };

  const generateContent = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedContent(null);
    setError(null);

    try {
      const apiKey = getGoogleAIKey();
      if (!apiKey) {
        throw new Error('Google AI API key not configured');
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = CONTENT_PROMPTS[selectedType] || CONTENT_PROMPTS.marketing;

      const fullPrompt = `${systemPrompt}

Tone: ${tone}
${context ? `Context: ${context}` : ''}

User Request: ${prompt}

Please generate the requested content:`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.text.primary,
        contents: fullPrompt,
      });

      const text = response.text || '';

      if (text) {
        setGeneratedContent({
          content: text,
          type: selectedType,
          model: 'Gemini Pro'
        });
      } else {
        throw new Error('No content generated');
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(err.message || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-brand-dark overflow-hidden">
      {/* Header - Mobile optimized */}
      <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-semibold text-white">Executive Agent</h1>
              <p className="text-xs text-neutral-500 hidden sm:block">AI-powered content generation</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {[
              { id: 'generate', label: 'Generate', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'dashboard', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'dashboard' && !dashboard) fetchDashboard();
                }}
                className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-3 sm:p-6">
        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Content Type Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2 sm:mb-3">Content Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {CONTENT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${
                      selectedType === type.id
                        ? 'bg-amber-500/10 border-amber-500/30 text-white'
                        : 'bg-white/[0.02] border-white/5 text-neutral-400 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {type.icon}
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs opacity-60 hidden sm:block">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">What do you need?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what content you want to generate..."
                className="w-full h-28 sm:h-32 bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/30 resize-none text-sm"
              />
            </div>

            {/* Context & Tone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Context (optional)</label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., Client name, project..."
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-amber-500/30 text-sm"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="creative">Creative</option>
                  <option value="formal">Formal</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateContent}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-400 hover:to-orange-500 transition-all active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Content
                </>
              )}
            </button>

            {/* Generated Content */}
            {generatedContent && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs sm:text-sm text-neutral-400">
                      Generated with <span className="text-amber-400">{generatedContent.model}</span>
                    </span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-xs sm:text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 sm:p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {generatedContent.content}
                  </pre>
                </div>
              </div>
            )}

            {/* Service Status */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Services</h3>
                <button
                  onClick={checkServices}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {services.map(service => (
                  <div key={service.name} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'online' ? 'bg-green-400' :
                      service.status === 'checking' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                    }`} />
                    <span className="text-xs text-neutral-400">{service.name}</span>
                    {service.latency && (
                      <span className="text-[10px] text-neutral-600">{service.latency}ms</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {isLoadingDashboard ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
            ) : dashboard ? (
              <>
                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-xs text-yellow-400">{error}</p>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-2xl font-bold text-white">{dashboard.storage.totalFiles}</p>
                        <p className="text-xs text-neutral-500">Files</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Database className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-2xl font-bold text-white">{dashboard.storage.totalSizeFormatted}</p>
                        <p className="text-xs text-neutral-500">Storage</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-2xl font-bold text-white">{dashboard.storage.categories.video || 0}</p>
                        <p className="text-xs text-neutral-500">Videos</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Image className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-lg sm:text-2xl font-bold text-white">{dashboard.storage.categories.image || 0}</p>
                        <p className="text-xs text-neutral-500">Images</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Recent Files</h3>
                    <button
                      onClick={fetchDashboard}
                      className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 text-neutral-400 ${isLoadingDashboard ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {dashboard.recentActivity.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {dashboard.recentActivity.slice(0, 5).map((item, i) => (
                        <div key={i} className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              item.category === 'video' ? 'bg-green-500/10' :
                              item.category === 'image' ? 'bg-amber-500/10' :
                              item.category === 'audio' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                            }`}>
                              {item.category === 'video' ? <Video className="w-3.5 h-3.5 text-green-400" /> :
                               item.category === 'image' ? <Image className="w-3.5 h-3.5 text-amber-400" /> :
                               <FileText className="w-3.5 h-3.5 text-blue-400" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-white truncate">
                                {item.key.split('/').pop()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-neutral-500">{formatBytes(item.size)}</p>
                            </div>
                          </div>
                          <span className="text-[10px] sm:text-xs text-neutral-500 flex-shrink-0 ml-2">
                            {item.modified ? new Date(item.modified).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-neutral-500 text-sm">
                      No recent files found
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <Database className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-500 mb-4">Click refresh to load dashboard data</p>
                <button
                  onClick={fetchDashboard}
                  className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg"
                >
                  Load Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveAgentModule;
