import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile } from '../types.ts';
import { useAIAssets, useCurrentUser } from '../hooks/useAppStore';
import {
  Sparkles, Image as ImageIcon, Download, Wand2,
  Loader2, Maximize2, Layers, Palette, RefreshCcw,
  Trash2, Monitor, Share2, Upload, X, History, ArrowRight,
  Fingerprint, Zap, Plus, MessageSquare, Edit3, Save,
  Check, FolderPlus, Star, Clock
} from 'lucide-react';

interface MediaModuleProps {
  user: UserProfile;
}

interface MediaAsset {
  id: string;
  url: string;
  prompt: string;
  timestamp: string;
  style: string;
  aspectRatio: string;
  isReference?: boolean;
  isSaved?: boolean;
}

interface MediaSession {
  id: string;
  title: string;
  assets: MediaAsset[];
  createdAt: string;
  updatedAt: string;
}

const MAX_ASSETS_PER_SESSION = 25;
const STORAGE_KEY = 'recipe-labs-media-studio-sessions';

// Official Recipe Labs Brand Colors
const BRAND_COLORS = {
  lemon: '#F5D547',           // Vibrant Lemon Yellow - Primary Accent
  lemonLight: '#F7E07A',      // Light Lemon - Hover States
  lemonDark: '#D4B83A',       // Dark Lemon/Gold - Secondary Accent
  forest: '#4A7C4E',          // Forest Green - Tertiary Accent
  mint: '#9AA590',            // Mint Green - Supporting
  sage: '#6B8E6B',            // Sage Green - Supporting
  bgPrimary: '#0f1410',       // Primary Dark Background
  bgSecondary: '#141a16',     // Secondary Dark Background
  bgTertiary: '#1a211c'       // Tertiary Dark Background
};

// Official Recipe Labs branded style presets (matching backend)
const STYLE_PRESETS = [
  {
    id: 'recipe-labs-premium',
    name: 'Recipe Labs Premium',
    description: 'Official brand design with gold and green',
    preset: 'recipe-labs-premium',
    colors: { primary: '#F5D547', secondary: '#D4B83A', tertiary: '#4A7C4E', background: '#0f1410' },
    gradient: 'from-[#F5D547]/20 via-[#D4B83A]/10 to-[#4A7C4E]/20'
  },
  {
    id: 'corporate-gold',
    name: 'Corporate Gold',
    description: 'Professional business design with gold emphasis',
    preset: 'corporate-gold',
    colors: { primary: '#D4B83A', secondary: '#F5D547', tertiary: '#4A7C4E', background: '#141a16' },
    gradient: 'from-[#D4B83A]/20 to-[#141a16]'
  },
  {
    id: 'tech-noir',
    name: 'Tech Noir',
    description: 'Dark tech-forward with subtle accents',
    preset: 'tech-noir',
    colors: { primary: '#4A7C4E', secondary: '#F5D547', tertiary: '#D4B83A', background: '#0f1410' },
    gradient: 'from-[#4A7C4E]/20 to-[#0f1410]'
  },
  {
    id: 'forest-elegance',
    name: 'Forest Elegance',
    description: 'Nature-inspired with green emphasis',
    preset: 'forest-elegance',
    colors: { primary: '#4A7C4E', secondary: '#6B8E6B', tertiary: '#F5D547', background: '#0f1410' },
    gradient: 'from-[#4A7C4E]/20 via-[#6B8E6B]/10 to-[#0f1410]'
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm golden design with premium feel',
    preset: 'golden-hour',
    colors: { primary: '#F5D547', secondary: '#F7E07A', tertiary: '#D4B83A', background: '#1a211c' },
    gradient: 'from-[#F5D547]/30 via-[#F7E07A]/20 to-[#1a211c]'
  },
  {
    id: 'midnight-lemon',
    name: 'Midnight Lemon',
    description: 'High contrast dark with vibrant yellow',
    preset: 'midnight-lemon',
    colors: { primary: '#F5D547', secondary: '#0f1410', tertiary: '#4A7C4E', background: '#0f1410' },
    gradient: 'from-[#F5D547]/30 to-[#0f1410]'
  }
];

// Helper functions
const generateId = () => `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateTitle = (prompt: string): string => {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  return cleaned.length > 35 ? cleaned.substring(0, 35) + '...' : cleaned;
};

const MediaModule: React.FC<MediaModuleProps> = ({ user }) => {
  const { saveAsset } = useAIAssets();
  const { user: currentUser } = useCurrentUser();

  // State
  const [prompt, setPrompt] = useState('');
  const [activeStyle, setActiveStyle] = useState(STYLE_PRESETS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessions, setSessions] = useState<MediaSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeReference, setActiveReference] = useState<MediaAsset | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saveModalAsset, setSaveModalAsset] = useState<MediaAsset | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current session's assets
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const generatedImages = activeSession?.assets || [];

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          setActiveSessionId(data.activeSessionId || (data.sessions.length > 0 ? data.sessions[0].id : null));
        }
      }
    } catch (e) {
      console.error('Failed to load media sessions:', e);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessions,
        activeSessionId
      }));
    } catch (e) {
      console.error('Failed to save media sessions:', e);
    }
  }, [sessions, activeSessionId]);

  // Create a new session
  const createNewSession = useCallback(() => {
    const newSession: MediaSession = {
      id: generateId(),
      title: 'New Project',
      assets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    setShowDeleteConfirm(null);
  }, [activeSessionId]);

  // Rename a session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title: newTitle.trim() || 'Untitled', updatedAt: new Date().toISOString() } : s
    ));
    setEditingSessionId(null);
    setEditTitle('');
  }, []);

  // Update assets in active session
  const updateActiveSessionAssets = useCallback((newAssets: MediaAsset[]) => {
    if (!activeSessionId) return;

    const limitedAssets = newAssets.slice(-MAX_ASSETS_PER_SESSION);

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        let title = s.title;
        if (title === 'New Project' && limitedAssets.length > 0) {
          const firstAsset = limitedAssets[0];
          if (firstAsset && !firstAsset.isReference) {
            title = generateTitle(firstAsset.prompt);
          }
        }
        return { ...s, assets: limitedAssets, title, updatedAt: new Date().toISOString() };
      }
      return s;
    }));
  }, [activeSessionId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setActiveReference({
        id: `ref-${Date.now()}`,
        url: base64,
        prompt: 'Imported Reference',
        timestamp: new Date().toISOString(),
        style: 'None',
        aspectRatio: '1:1',
        isReference: true
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRevise = (asset: MediaAsset) => {
    setActiveReference({ ...asset, isReference: true });
    setPrompt(asset.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveToLibrary = (asset: MediaAsset) => {
    setSaveModalAsset(asset);
    setSaveName(generateTitle(asset.prompt));
    setSaveTags('media-studio, ' + asset.style.toLowerCase().replace(/\s+/g, '-'));
  };

  const confirmSaveToLibrary = () => {
    if (!saveModalAsset || !saveName.trim()) return;

    saveAsset({
      name: saveName,
      type: 'image',
      content: saveModalAsset.url,
      prompt: saveModalAsset.prompt,
      model: 'Recipe Labs Media Studio',
      tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
      isShared: true
    });

    // Mark as saved in session
    updateActiveSessionAssets(
      generatedImages.map(img =>
        img.id === saveModalAsset.id ? { ...img, isSaved: true } : img
      )
    );

    setSaveSuccess(saveModalAsset.id);
    setTimeout(() => setSaveSuccess(null), 2000);
    setSaveModalAsset(null);
    setSaveName('');
    setSaveTags('');
  };

  const handleDownload = (asset: MediaAsset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `recipe-labs-${asset.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    // Create a new session if none exists
    if (!activeSessionId) {
      const newSession: MediaSession = {
        id: generateId(),
        title: 'New Project',
        assets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setIsGenerating(true);

    try {
      // Call backend API for image generation with brand preset
      // The backend will apply the full Recipe Labs brand specifications
      const response = await fetch('/api/v1/media/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          preset: activeStyle.preset || activeStyle.id,  // Use official brand preset
          style: activeStyle.name,
          aspectRatio,
          referenceImage: activeReference?.url || null,
          context: {
            user: user.name,
            agency: user.agencyCoreCompetency
          }
        })
      });

      if (!response.ok) {
        // Fallback: create placeholder with official brand colors
        const placeholderAsset: MediaAsset = {
          id: generateId(),
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
              <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:${BRAND_COLORS.bgSecondary}"/>
                  <stop offset="100%" style="stop-color:${BRAND_COLORS.bgPrimary}"/>
                </linearGradient>
                <linearGradient id="brand" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:${BRAND_COLORS.lemon}"/>
                  <stop offset="50%" style="stop-color:${BRAND_COLORS.lemonDark}"/>
                  <stop offset="100%" style="stop-color:${BRAND_COLORS.forest}"/>
                </linearGradient>
              </defs>
              <rect fill="url(#bg)" width="512" height="512"/>
              <text x="256" y="230" text-anchor="middle" fill="url(#brand)" font-family="Orbitron, Arial" font-size="28" font-weight="bold">RCPE LAB</text>
              <text x="256" y="270" text-anchor="middle" fill="${BRAND_COLORS.sage}" font-family="Montserrat, Arial" font-size="14">${prompt.substring(0, 35)}...</text>
              <rect x="156" y="310" width="200" height="4" rx="2" fill="url(#brand)" opacity="0.6"/>
              <text x="256" y="360" text-anchor="middle" fill="${BRAND_COLORS.mint}" font-family="Arial" font-size="10">Generating with AI...</text>
            </svg>
          `)}`,
          prompt: prompt,
          timestamp: new Date().toISOString(),
          style: activeStyle.name,
          aspectRatio
        };

        updateActiveSessionAssets([placeholderAsset, ...generatedImages]);
        setActiveReference(null);
        return;
      }

      const data = await response.json();

      if (data.imageUrl) {
        const newAsset: MediaAsset = {
          id: generateId(),
          url: data.imageUrl,
          prompt: prompt,
          timestamp: new Date().toISOString(),
          style: activeStyle.name,
          aspectRatio
        };
        updateActiveSessionAssets([newAsset, ...generatedImages]);
        setActiveReference(null);
      }
    } catch (err) {
      console.error('Generation failed:', err);
      // Show a branded placeholder on error with official colors
      const errorAsset: MediaAsset = {
        id: generateId(),
        url: `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <defs>
              <linearGradient id="errBrand" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${BRAND_COLORS.lemon}"/>
                <stop offset="100%" style="stop-color:${BRAND_COLORS.forest}"/>
              </linearGradient>
            </defs>
            <rect fill="${BRAND_COLORS.bgPrimary}" width="512" height="512"/>
            <text x="256" y="240" text-anchor="middle" fill="url(#errBrand)" font-family="Orbitron, Arial" font-size="22" font-weight="bold">RCPE LAB</text>
            <text x="256" y="275" text-anchor="middle" fill="${BRAND_COLORS.lemon}" font-family="Montserrat, Arial" font-size="14">Media Studio</text>
            <text x="256" y="310" text-anchor="middle" fill="${BRAND_COLORS.sage}" font-family="Arial" font-size="11">Generating with AI...</text>
          </svg>
        `)}`,
        prompt: prompt,
        timestamp: new Date().toISOString(),
        style: activeStyle.name,
        aspectRatio
      };
      updateActiveSessionAssets([errorAsset, ...generatedImages]);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteAsset = (assetId: string) => {
    updateActiveSessionAssets(generatedImages.filter(img => img.id !== assetId));
  };

  return (
    <div className="flex h-full animate-fadeIn overflow-hidden bg-[#050505]">
      {/* Sidebar - Project Sessions */}
      <div className="w-72 border-r border-white/5 flex flex-col bg-black/40">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Media Studio</h2>
              <p className="text-[10px] text-gray-500">AI Image Generation</p>
            </div>
          </div>
        </div>

        {/* New Project Button */}
        <div className="p-3 border-b border-white/5">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 text-brand-gold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Project</span>
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">
            Projects ({sessions.length})
          </h3>

          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">
              No projects yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative rounded-lg transition-all ${
                    activeSessionId === session.id
                      ? 'bg-white/10 border border-brand-gold/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {editingSessionId === session.id ? (
                    <div className="p-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameSession(session.id, editTitle);
                          if (e.key === 'Escape') { setEditingSessionId(null); setEditTitle(''); }
                        }}
                        onBlur={() => renameSession(session.id, editTitle)}
                        autoFocus
                        className="flex-1 bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-gold/50"
                      />
                    </div>
                  ) : showDeleteConfirm === session.id ? (
                    <div className="p-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-red-400">Delete?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-white/10 text-gray-400 rounded hover:bg-white/20"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveSessionId(session.id)}
                      className="w-full p-3 text-left flex items-start gap-3"
                    >
                      <ImageIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        activeSessionId === session.id ? 'text-brand-gold' : 'text-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${
                          activeSessionId === session.id ? 'text-white font-medium' : 'text-gray-300'
                        }`}>
                          {session.title}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {session.assets.length} assets
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTitle(session.title);
                            setEditingSessionId(session.id);
                          }}
                          className="p-1 text-gray-500 hover:text-white rounded"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(session.id);
                          }}
                          className="p-1 text-gray-500 hover:text-red-400 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Style Presets */}
        <div className="border-t border-white/5 p-3">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Brand Styles</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {STYLE_PRESETS.map(style => (
              <button
                key={style.id}
                onClick={() => setActiveStyle(style)}
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  activeStyle.id === style.id
                    ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold'
                    : 'bg-white/5 border-transparent text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <p className="text-[10px] font-bold uppercase truncate">{style.name}</p>
                <p className="text-[9px] opacity-60 truncate">{style.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/40">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-brand-gold animate-pulse' : 'bg-green-500'}`}></div>
            <div>
              <span className="text-sm font-medium text-white">
                {isGenerating ? 'Generating...' : (activeSession?.title || 'New Project')}
              </span>
              {activeSession && (
                <span className="text-[10px] text-gray-500 ml-2">
                  {generatedImages.length}/{MAX_ASSETS_PER_SESSION} assets
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-xs rounded-lg hover:bg-white/10 transition-all"
            >
              <Upload className="w-3 h-3" /> Import
            </button>
          </div>
        </div>

        {/* Generation Controls */}
        <div className="p-4 border-b border-white/5 bg-black/20">
          <div className="flex gap-4">
            {/* Reference Preview */}
            {activeReference && (
              <div className="w-24 h-24 rounded-xl overflow-hidden border border-brand-gold/30 relative flex-shrink-0">
                <img src={activeReference.url} className="w-full h-full object-cover" alt="Reference" />
                <button
                  onClick={() => setActiveReference(null)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500/60"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-brand-gold/80 text-black text-[8px] text-center py-0.5 font-bold">
                  REFERENCE
                </div>
              </div>
            )}

            {/* Prompt Input */}
            <div className="flex-1 space-y-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeReference ? "Describe the changes you want..." : "Describe your Recipe Labs branded design..."}
                className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30 transition-all resize-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Aspect Ratio */}
                  <div className="flex p-0.5 bg-black/40 rounded-lg border border-white/10">
                    {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                          aspectRatio === ratio ? 'bg-brand-gold text-black' : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>

                  {/* Active Style Badge */}
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    {activeStyle.name}
                  </span>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-black font-bold rounded-xl transition-all hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span className="text-xs">{activeReference ? 'Revise' : 'Generate'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {generatedImages.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-gold blur-3xl opacity-5 scale-150"></div>
                <div className="relative p-12 rounded-3xl bg-white/5 border border-dashed border-white/10">
                  <ImageIcon className="w-20 h-20 text-gray-700" />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <h4 className="text-xl font-bold text-white">Create Recipe Labs Branded Assets</h4>
                <p className="text-sm text-gray-500 max-w-md">
                  Generate premium marketing visuals with our brand styles. Describe your concept above.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isGenerating && (
                <div className="aspect-square rounded-2xl overflow-hidden border border-brand-gold/30 bg-brand-gold/5 flex flex-col items-center justify-center gap-4 animate-pulse">
                  <Loader2 className="w-10 h-10 text-brand-gold animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-brand-gold uppercase tracking-widest">Generating...</p>
                    <p className="text-[10px] text-gray-500 mt-1">{activeStyle.name}</p>
                  </div>
                </div>
              )}

              {generatedImages.map((img) => (
                <div key={img.id} className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-brand-gold/30 transition-all bg-black">
                  <img src={img.url} alt="Generated" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />

                  {/* Saved Badge */}
                  {img.isSaved && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-green-500/80 text-white text-[10px] font-bold rounded-lg">
                      <Check className="w-3 h-3" /> Saved
                    </div>
                  )}

                  {/* Success Animation */}
                  {saveSuccess === img.id && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center animate-pulse">
                      <div className="p-4 bg-green-500 rounded-full">
                        <Check className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] font-bold text-brand-gold uppercase tracking-widest">{img.style}</span>
                        <p className="text-xs text-white/90 leading-relaxed line-clamp-2 mt-1">"{img.prompt}"</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRevise(img)}
                          className="flex-1 py-2 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg hover:bg-brand-gold hover:text-black transition-all flex items-center justify-center gap-1"
                        >
                          <RefreshCcw className="w-3 h-3" /> Revise
                        </button>
                        <button
                          onClick={() => handleSaveToLibrary(img)}
                          className="flex-1 py-2 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg hover:bg-green-500 transition-all flex items-center justify-center gap-1"
                          disabled={img.isSaved}
                        >
                          <FolderPlus className="w-3 h-3" /> {img.isSaved ? 'Saved' : 'Library'}
                        </button>
                        <button
                          onClick={() => handleDownload(img)}
                          className="p-2 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAsset(img.id)}
                          className="p-2 bg-white/10 backdrop-blur-md text-white rounded-lg hover:bg-red-500/50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Meta Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[8px] font-bold text-black bg-brand-gold px-2 py-1 rounded-md uppercase tracking-wider">
                      {img.aspectRatio}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recipe Labs Media Engine</span>
            </div>
            <div className="h-3 w-px bg-white/10"></div>
            <span className="text-[10px] font-mono text-gray-600">SESSION ASSETS: {generatedImages.length}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 text-[10px]">
            <Clock className="w-3 h-3" />
            {activeSession ? new Date(activeSession.updatedAt).toLocaleTimeString() : '--:--'}
          </div>
        </div>
      </div>

      {/* Save to Library Modal */}
      {saveModalAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-gold/10">
                  <FolderPlus className="w-5 h-5 text-brand-gold" />
                </div>
                <h3 className="text-lg font-bold text-white">Save to Asset Library</h3>
              </div>
              <button onClick={() => setSaveModalAsset(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                <img src={saveModalAsset.url} alt="Preview" className="w-full h-full object-cover" />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Asset Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="E.g., Campaign Hero Image"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Tags (comma separated)</label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="campaign, hero, social..."
                />
              </div>

              {/* Metadata */}
              <div className="p-3 bg-white/5 rounded-xl space-y-1">
                <p className="text-[10px] text-gray-500">Style: {saveModalAsset.style}</p>
                <p className="text-[10px] text-gray-500">Aspect: {saveModalAsset.aspectRatio}</p>
                <p className="text-[10px] text-gray-500 truncate">Prompt: {saveModalAsset.prompt}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSaveModalAsset(null)}
                  className="flex-1 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveToLibrary}
                  disabled={!saveName.trim()}
                  className="flex-1 py-3 bg-brand-gold text-black font-bold rounded-lg hover:bg-brand-gold/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaModule;
