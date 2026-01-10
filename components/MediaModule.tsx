import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile } from '../types.ts';
import { useAIAssets, useCurrentUser } from '../hooks/useAppStore';
import { wasabiService, ElevenViewsAsset } from '../services/wasabiService';
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
const STORAGE_KEY = 'eleven-views-media-studio-sessions';

// Official Eleven Views Brand Colors - Premium Design System
// Extracted from official logo and brand guidelines
const BRAND_COLORS = {
  // Primary Gold Spectrum (from logo gradient)
  goldBright: '#F5C242',      // Bright Gold - Primary accent, headlines
  goldRich: '#D4A520',        // Rich Goldenrod - Premium feel
  goldDeep: '#B8860B',        // Deep Gold/Bronze - Depth and luxury
  goldAmber: '#D4A017',       // Amber Gold - Warmth

  // Secondary Gold Tones
  champagne: '#F7E7CE',       // Champagne - Elegant highlights
  creamGold: '#F5DEB3',       // Cream Gold - Soft accents
  antiqueGold: '#CFB53B',     // Antique Gold - Classic sophistication

  // Accent Colors
  bronze: '#B8860B',           // Deep Bronze - Rich warmth
  amber: '#D4A017',            // Amber - Luxury warmth accent
  copper: '#CD7F32',           // Copper - Supporting warm tones

  // Background System (Dark Mode)
  bgPrimary: '#0a0908',       // Near black with warm undertone
  bgSecondary: '#0f1410',     // Primary dark background
  bgTertiary: '#141a16',      // Card backgrounds
  bgElevated: '#1a211c',      // Elevated surfaces

  // Text & UI
  textPrimary: '#FFFFFF',     // Pure white for primary text
  textSecondary: '#9CA3AF',   // Gray for secondary text
  textMuted: '#6B7280',       // Muted text

  // Legacy compatibility
  lemon: '#F5C242',
  lemonLight: '#F7E07A',
  lemonDark: '#D4B83A',
};

// Official Eleven Views branded style presets (matching backend)
const STYLE_PRESETS = [
  // ═══════════════════════════════════════════════════════════════════
  // ELEVEN VIEWS MASTER TEMPLATE COLLECTION
  // Curated by our Senior Creative Director with 45 years experience
  // Working with: Apple, Nike, Rolex, Louis Vuitton, Ferrari
  // ═══════════════════════════════════════════════════════════════════

  {
    id: 'ev-signature',
    name: 'EV Signature',
    description: 'The official Eleven Views look - gold gradient mastery',
    preset: 'ev-signature',
    colors: { primary: '#F5C242', secondary: '#D4A520', tertiary: '#B8860B', background: '#000000' },
    gradient: 'from-[#F5C242]/25 via-[#D4A520]/15 to-[#000000]'
  },
  {
    id: 'black-gold-luxe',
    name: 'Black & Gold Luxe',
    description: 'Pure luxury - Rolex meets Versace elegance',
    preset: 'black-gold-luxe',
    colors: { primary: '#FFD700', secondary: '#F5C242', tertiary: '#CC9900', background: '#0a0a0a' },
    gradient: 'from-[#FFD700]/30 to-[#0a0a0a]'
  },
  {
    id: 'champagne-elite',
    name: 'Champagne Elite',
    description: 'Soft sophistication - Dom Pérignon aesthetic',
    preset: 'champagne-elite',
    colors: { primary: '#F7E7CE', secondary: '#D4AF37', tertiary: '#C5B358', background: '#1a1a1a' },
    gradient: 'from-[#F7E7CE]/20 via-[#D4AF37]/15 to-[#1a1a1a]'
  },
  {
    id: 'bronze-dynasty',
    name: 'Bronze Dynasty',
    description: 'Old money elegance - Bentley & vintage prestige',
    preset: 'bronze-dynasty',
    colors: { primary: '#CD7F32', secondary: '#B8860B', tertiary: '#8B7355', background: '#0f0f0f' },
    gradient: 'from-[#CD7F32]/25 via-[#B8860B]/15 to-[#0f0f0f]'
  },
  {
    id: 'amber-nightfall',
    name: 'Amber Nightfall',
    description: 'Warm cinematic - Oscar night red carpet glow',
    preset: 'amber-nightfall',
    colors: { primary: '#FFBF00', secondary: '#FF8C00', tertiary: '#D4A520', background: '#0a0a0a' },
    gradient: 'from-[#FFBF00]/30 via-[#FF8C00]/15 to-[#0a0a0a]'
  },
  {
    id: 'platinum-gold',
    name: 'Platinum Gold',
    description: 'Ultra premium - credit black card exclusivity',
    preset: 'platinum-gold',
    colors: { primary: '#E5E4E2', secondary: '#FFD700', tertiary: '#C0C0C0', background: '#050505' },
    gradient: 'from-[#E5E4E2]/20 via-[#FFD700]/25 to-[#050505]'
  },
  {
    id: 'honey-obsidian',
    name: 'Honey Obsidian',
    description: 'Rich warmth - artisanal luxury feel',
    preset: 'honey-obsidian',
    colors: { primary: '#EB9605', secondary: '#C77E0A', tertiary: '#8B6914', background: '#0a0a0a' },
    gradient: 'from-[#EB9605]/25 via-[#C77E0A]/15 to-[#0a0a0a]'
  },
  {
    id: 'gilded-noir',
    name: 'Gilded Noir',
    description: 'Art deco drama - Great Gatsby grandeur',
    preset: 'gilded-noir',
    colors: { primary: '#CFB53B', secondary: '#AA8C2C', tertiary: '#856D1C', background: '#000000' },
    gradient: 'from-[#CFB53B]/30 via-[#AA8C2C]/20 to-[#000000]'
  },
  {
    id: 'sunrise-premium',
    name: 'Sunrise Premium',
    description: 'Dawn energy - golden hour photography magic',
    preset: 'sunrise-premium',
    colors: { primary: '#FFE135', secondary: '#FFC125', tertiary: '#FFAA00', background: '#1a1410' },
    gradient: 'from-[#FFE135]/35 via-[#FFC125]/20 to-[#1a1410]'
  },
  {
    id: 'midnight-empire',
    name: 'Midnight Empire',
    description: 'Maximum impact - Times Square billboard power',
    preset: 'midnight-empire',
    colors: { primary: '#FFD700', secondary: '#FFC000', tertiary: '#E5B800', background: '#000000' },
    gradient: 'from-[#FFD700]/40 to-[#000000]'
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

  const confirmSaveToLibrary = async () => {
    if (!saveModalAsset || !saveName.trim()) return;

    try {
      // Convert base64 to File for upload
      const base64Data = saveModalAsset.url.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const fileName = `${saveName.replace(/\s+/g, '-').toLowerCase()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Upload to Wasabi via MCP server
      const uploadedAsset = await wasabiService.uploadViaMCP(file, {
        folder: 'ai-generated',
        tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
        userId: user?.email || 'system',
        userName: user?.name || 'Media Studio'
      });

      if (uploadedAsset) {
        // Update asset with AI metadata
        uploadedAsset.name = saveName;
        uploadedAsset.subcategory = 'ai-generated';
        uploadedAsset.aiTags = ['ai-generated', saveModalAsset.style, 'media-studio'];
        uploadedAsset.metadata = {
          ...uploadedAsset.metadata,
          prompt: saveModalAsset.prompt,
          style: saveModalAsset.style,
          aspectRatio: saveModalAsset.aspectRatio,
          model: 'Eleven Views Media Studio',
          generatedAt: saveModalAsset.timestamp
        };
        wasabiService.saveAssetToStorage(uploadedAsset);

        // Mark as saved in session
        updateActiveSessionAssets(
          generatedImages.map(img =>
            img.id === saveModalAsset.id ? { ...img, isSaved: true } : img
          )
        );

        setSaveSuccess(saveModalAsset.id);
        setTimeout(() => setSaveSuccess(null), 2000);
      } else {
        // Fallback: save locally with base64 if upload fails
        const evAsset: ElevenViewsAsset = {
          id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          key: `ai-generated/${Date.now()}-${saveName.replace(/\s+/g, '-').toLowerCase()}.png`,
          name: saveName,
          fileName: `${saveName.replace(/\s+/g, '-').toLowerCase()}.png`,
          fileType: 'image/png',
          fileSize: Math.round(saveModalAsset.url.length * 0.75),
          category: 'image',
          subcategory: 'ai-generated',
          url: saveModalAsset.url,
          thumbnailUrl: saveModalAsset.url,
          tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
          aiTags: ['ai-generated', saveModalAsset.style, 'media-studio'],
          metadata: {
            prompt: saveModalAsset.prompt,
            style: saveModalAsset.style,
            aspectRatio: saveModalAsset.aspectRatio,
            model: 'Eleven Views Media Studio',
            generatedAt: saveModalAsset.timestamp
          },
          uploadedBy: user?.email || 'system',
          uploadedByName: user?.name || 'Media Studio',
          isShared: true,
          isFavorite: false,
          isClientVisible: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        wasabiService.saveAssetToStorage(evAsset);

        updateActiveSessionAssets(
          generatedImages.map(img =>
            img.id === saveModalAsset.id ? { ...img, isSaved: true } : img
          )
        );

        setSaveSuccess(saveModalAsset.id);
        setTimeout(() => setSaveSuccess(null), 2000);
      }
    } catch (error) {
      console.error('Save to library failed:', error);
      alert('Failed to save to library. Please try again.');
    }

    // Also save to AI assets for backward compatibility
    saveAsset({
      name: saveName,
      type: 'image',
      content: saveModalAsset.url,
      prompt: saveModalAsset.prompt,
      model: 'Eleven Views Media Studio',
      tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
      isShared: true
    });

    setSaveModalAsset(null);
    setSaveName('');
    setSaveTags('');
  };

  const handleDownload = (asset: MediaAsset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `eleven-views-${asset.id}.png`;
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
      // Use Google AI for image generation
      const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const ai = new GoogleGenAI({ apiKey });

      // ELEVEN VIEWS MASTER DESIGN SYSTEM
      // 45 years of billion-dollar brand expertise distilled into AI prompts

      const brandGuidelines = `
        ELEVEN VIEWS - THE GOLD STANDARD IN VISUAL DESIGN

        CORE IDENTITY:
        - We are the Rolls-Royce of production studios
        - Gold is not just a color, it's our signature
        - Every pixel screams premium quality
        - Black backgrounds make our gold SHINE

        COLOR COMMANDMENTS:
        - PRIMARY: Always gold spectrum (#FFD700, #F5C242, #D4A520, #B8860B)
        - SECONDARY: Bronze, amber, honey, champagne tones
        - BACKGROUNDS: Pure black #000000 to charcoal #1a1a1a
        - FORBIDDEN: Green, teal, blue, red - NEVER use these

        DESIGN PHILOSOPHY:
        - Less is more, but what's there must be PERFECT
        - Gold gradients create depth and luxury
        - Negative space is as important as filled space
        - Every element earns its place

        INSPIRATION BRANDS:
        - Rolex: Timeless elegance, crown authority
        - Louis Vuitton: Pattern mastery, monogram power
        - Ferrari: Speed meets sophistication
        - Apple: Clean lines, premium materials
        - Cartier: Jewelry-level craftsmanship
      `;

      const designPrinciples = `
        DESIGN EXCELLENCE STANDARDS:
        1. VISUAL HIERARCHY: Bold focal point, supporting elements create flow
        2. COLOR MASTERY: Rich golds against dark backgrounds, never flat
        3. TYPOGRAPHY: Modern sans-serif, generous spacing, luxury kerning
        4. COMPOSITION: Rule of thirds, intentional white space, balance
        5. TEXTURE: Subtle gradients, soft glows, depth without clutter
        6. BRAND CONSISTENCY: Every element reflects premium production quality
      `;

      const styleInstructions: Record<string, string> = {
        'ev-signature': 'THE Eleven Views signature look: Rich gold gradient from bright #F5C242 to deep bronze #B8860B on pure black. Subtle gold lens flares, premium metallic sheen. This is our bread and butter - luxury production studio perfection.',
        'black-gold-luxe': 'Pure opulence: Bright gold (#FFD700) commanding attention on jet black. Think Rolex crown, Versace medusa - unapologetic luxury that demands respect. Bold, confident, impossibly elegant.',
        'champagne-elite': 'Soft sophistication: Creamy champagne tones with antique gold accents. The aesthetic of a $500 bottle of Dom Pérignon - subtle wealth, refined taste, European elegance.',
        'bronze-dynasty': 'Old money prestige: Deep bronze and burnished gold. The patina of inherited wealth - vintage Bentley, leather-bound books, generations of success. Timeless, not trendy.',
        'amber-nightfall': 'Cinematic warmth: Amber and orange-gold creating sunset drama. Red carpet at the Oscars, Hollywood premiere energy. Warm, inviting, but unmistakably premium.',
        'platinum-gold': 'Ultimate exclusivity: Cool platinum silver with gold accents. The Amex Centurion card aesthetic - reserved for those who have arrived. Minimal, powerful, elite.',
        'honey-obsidian': 'Artisanal richness: Deep honey gold on obsidian black. Craft luxury - small batch whiskey, bespoke tailoring. Warm but sophisticated, approachable yet premium.',
        'gilded-noir': 'Art Deco grandeur: Antique gold with dramatic black. The Great Gatsby, 1920s glamour reborn. Geometric patterns, bold contrasts, theatrical elegance.',
        'sunrise-premium': 'Golden hour magic: Bright yellows to warm oranges. The energy of a new day, optimism backed by success. Fresh, vibrant, full of possibility.',
        'midnight-empire': 'MAXIMUM IMPACT: Pure bright gold on absolute black. Times Square billboard, Super Bowl commercial, global brand launch. No subtlety - pure power and presence.'
      };

      const currentStyleGuide = styleInstructions[activeStyle.id] || styleInstructions['eleven-views-premium'];

      const stylePrompt = `You are the creative director at Eleven Views, a premium production studio known for creating iconic visual brands for Fortune 500 companies.

BRAND IDENTITY:
${brandGuidelines}

DESIGN STANDARDS:
${designPrinciples}

CURRENT STYLE: ${activeStyle.name}
STYLE DIRECTION: ${currentStyleGuide}

COLOR PALETTE:
- Primary: ${activeStyle.colors.primary} (use prominently)
- Secondary: ${activeStyle.colors.secondary} (supporting elements)
- Tertiary: ${activeStyle.colors.tertiary} (accents)
- Background: ${activeStyle.colors.background} (base layer)

ASPECT RATIO: ${aspectRatio}

CLIENT REQUEST: ${prompt}

Create a stunning, award-winning visual that:
1. Immediately communicates luxury and professionalism
2. Uses the gold color palette masterfully with rich gradients
3. Has perfect composition and visual balance
4. Would be at home in a Super Bowl commercial or Times Square billboard
5. Represents the pinnacle of modern graphic design
6. Makes the viewer feel they're looking at a million-dollar brand asset

Generate this as a photorealistic, high-quality image with impeccable attention to detail.`;

      // Try Gemini 2.0 Flash with image generation
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts: [{ text: stylePrompt }] },
        config: { responseModalities: ['IMAGE', 'TEXT'] }
      });

      // Extract image from response
      let imageUrl: string | null = null;
      const candidates = response.candidates || [];
      for (const candidate of candidates) {
        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (imageUrl) break;
      }

      if (imageUrl) {
        const newAsset: MediaAsset = {
          id: generateId(),
          url: imageUrl,
          prompt: prompt,
          timestamp: new Date().toISOString(),
          style: activeStyle.name,
          aspectRatio
        };
        updateActiveSessionAssets([newAsset, ...generatedImages]);
        setActiveReference(null);
      } else {
        throw new Error('No image generated');
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
                <stop offset="100%" style="stop-color:${BRAND_COLORS.goldDeep}"/>
              </linearGradient>
            </defs>
            <rect fill="${BRAND_COLORS.bgPrimary}" width="512" height="512"/>
            <text x="256" y="240" text-anchor="middle" fill="url(#errBrand)" font-family="Orbitron, Arial" font-size="22" font-weight="bold">ELEVEN VIEWS</text>
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
            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-brand-gold animate-pulse' : 'bg-brand-gold'}`}></div>
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
                placeholder={activeReference ? "Describe the changes you want..." : "Describe your Eleven Views branded design..."}
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
                <h4 className="text-xl font-bold text-white">Create Eleven Views Branded Assets</h4>
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
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-brand-gold/80 text-white text-[10px] font-bold rounded-lg">
                      <Check className="w-3 h-3" /> Saved
                    </div>
                  )}

                  {/* Success Animation */}
                  {saveSuccess === img.id && (
                    <div className="absolute inset-0 bg-brand-gold/20 flex items-center justify-center animate-pulse">
                      <div className="p-4 bg-brand-gold rounded-full">
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
                          className="flex-1 py-2 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg hover:bg-brand-gold transition-all flex items-center justify-center gap-1"
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
              <div className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Eleven Views Media Engine</span>
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
