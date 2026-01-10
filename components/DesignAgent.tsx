import React, { useState, useEffect, useRef } from "react";
import {
  Wand2, Sparkles, Image as ImageIcon, Palette, Download, Share2, Save,
  RefreshCw, Settings, ChevronRight, Grid3X3, Layers, Zap, X, Plus,
  Heart, Bookmark, Copy, Check, ArrowRight, Maximize2, History, Star,
  Play, Pause, RotateCw, Trash2, Eye, Edit3, Tag, FolderPlus
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { wasabiService, ElevenViewsAsset } from "../services/wasabiService";
import { useCurrentUser, useAIAssets } from "../hooks/useAppStore";

interface GeneratedDesign {
  id: string;
  prompt: string;
  imageUrl: string;
  style: string;
  aspectRatio: string;
  createdAt: Date;
  isFavorite: boolean;
}

interface StylePreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  colors: string[];
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: "views-signature",
    name: "VIEWS Signature",
    description: "Premium gold on black luxury aesthetic",
    prompt: "Premium luxury design with rich gold (#F5C242) on pure black background, sleek modern aesthetic, subtle gold gradients and reflections, high-end production studio quality",
    colors: ["#F5C242", "#D4A520", "#0A0A0A"]
  },
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    description: "Maximum contrast bold statement",
    prompt: "Bold dramatic design with bright gold (#F5C242) on absolute black, high contrast, Times Square billboard quality, award-show ready",
    colors: ["#FFD700", "#F5C242", "#000000"]
  },
  {
    id: "champagne-elite",
    name: "Champagne Elite",
    description: "Soft sophisticated elegance",
    prompt: "Elegant sophisticated design with champagne and cream gold tones, soft luxury aesthetic, subtle gradients, refined European elegance",
    colors: ["#F7E7CE", "#D4AF37", "#1a1a1a"]
  },
  {
    id: "bronze-dynasty",
    name: "Bronze Dynasty",
    description: "Old money timeless prestige",
    prompt: "Classic old money aesthetic with deep bronze and antique gold, timeless elegance, vintage luxury feel, Bentley and champagne vibes",
    colors: ["#CD7F32", "#B8860B", "#0f0f0f"]
  },
  {
    id: "tech-noir",
    name: "Tech Noir",
    description: "Futuristic cyberpunk luxury",
    prompt: "Futuristic tech-noir design with amber gold highlights on pure black, sleek cyberpunk elements, gold circuit patterns, luxury watches meets technology",
    colors: ["#D4A017", "#F5C242", "#050505"]
  },
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Warm cinematic Hollywood",
    prompt: "Warm cinematic golden hour design, rich amber and gold tones, dramatic backlighting, Oscar-worthy production quality, red carpet luxury",
    colors: ["#F5C242", "#FFD700", "#FFA500"]
  }
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", width: 1024, height: 1024 },
  { id: "16:9", label: "Landscape", width: 1344, height: 768 },
  { id: "9:16", label: "Portrait", width: 768, height: 1344 },
  { id: "4:3", label: "Standard", width: 1152, height: 896 },
];

const DesignAgent: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>(STYLE_PRESETS[0]);
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [sessionDesigns, setSessionDesigns] = useState<GeneratedDesign[]>([]);
  const [previewDesign, setPreviewDesign] = useState<GeneratedDesign | null>(null);
  const [saveModalDesign, setSaveModalDesign] = useState<GeneratedDesign | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useCurrentUser();
  const { saveAsset } = useAIAssets();

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("views_design_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setGeneratedDesigns(parsed.map((d: any) => ({ ...d, createdAt: new Date(d.createdAt) })));
      } catch (e) {}
    }
  }, []);

  const saveHistory = (designs: GeneratedDesign[]) => {
    localStorage.setItem("views_design_history", JSON.stringify(designs));
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const ai = new GoogleGenAI({ apiKey });

      const stylePrompt = `Create a premium, high-end visual design with these specifications:

STYLE: ${selectedStyle.name}
STYLE DIRECTION: ${selectedStyle.prompt}
COLORS: Primary gold tones - ${selectedStyle.colors.join(', ')}
ASPECT: ${selectedRatio.id} (${selectedRatio.width}x${selectedRatio.height})

USER REQUEST: ${prompt}

Design requirements:
- Luxury aesthetic with gold (#F5C242) as primary accent
- Dark/black backgrounds for maximum contrast
- Premium production quality
- Modern, sleek visual style
- Perfect for billion-dollar brands

Generate a stunning, photorealistic image.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: { parts: [{ text: stylePrompt }] },
        config: { responseModalities: ['IMAGE', 'TEXT'] }
      });

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
        const newDesign: GeneratedDesign = {
          id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          prompt,
          imageUrl,
          style: selectedStyle.name,
          aspectRatio: selectedRatio.id,
          createdAt: new Date(),
          isFavorite: false
        };

        const updatedSession = [newDesign, ...sessionDesigns];
        setSessionDesigns(updatedSession);

        const updatedHistory = [newDesign, ...generatedDesigns];
        setGeneratedDesigns(updatedHistory);
        saveHistory(updatedHistory);
      } else {
        throw new Error('No image generated');
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate design");

      // Create placeholder on error
      const errorDesign: GeneratedDesign = {
        id: `design_${Date.now()}`,
        prompt,
        imageUrl: `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <defs>
              <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#F5C242"/>
                <stop offset="100%" style="stop-color:#B8860B"/>
              </linearGradient>
            </defs>
            <rect fill="#0A0A0A" width="512" height="512"/>
            <text x="256" y="240" text-anchor="middle" fill="url(#g)" font-family="Arial Black" font-size="28" font-weight="bold">VIEWS</text>
            <text x="256" y="275" text-anchor="middle" fill="#F5C242" font-family="Arial" font-size="12">Design Agent</text>
            <text x="256" y="310" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">Generating with AI...</text>
          </svg>
        `)}`,
        style: selectedStyle.name,
        aspectRatio: selectedRatio.id,
        createdAt: new Date(),
        isFavorite: false
      };
      setSessionDesigns([errorDesign, ...sessionDesigns]);
    }

    setIsGenerating(false);
  };

  const openSaveModal = (design: GeneratedDesign) => {
    setSaveModalDesign(design);
    setSaveName(`${selectedStyle.name} Design`);
    setSaveTags(design.style.toLowerCase().replace(/\s+/g, '-'));
  };

  const confirmSaveToLibrary = async () => {
    if (!saveModalDesign || !saveName.trim()) return;

    // Save to wasabiService for Asset Library
    const evAsset: ElevenViewsAsset = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key: `ai-designs/${Date.now()}-${saveName.replace(/\s+/g, '-').toLowerCase()}.png`,
      name: saveName,
      fileName: `${saveName.replace(/\s+/g, '-').toLowerCase()}.png`,
      fileType: 'image/png',
      fileSize: Math.round(saveModalDesign.imageUrl.length * 0.75),
      category: 'image',
      subcategory: 'ai-generated',
      url: saveModalDesign.imageUrl,
      thumbnailUrl: saveModalDesign.imageUrl,
      tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
      aiTags: ['ai-generated', 'design-agent', saveModalDesign.style.toLowerCase().replace(/\s+/g, '-')],
      metadata: {
        prompt: saveModalDesign.prompt,
        style: saveModalDesign.style,
        aspectRatio: saveModalDesign.aspectRatio,
        model: 'VIEWS Design Agent',
        generatedAt: saveModalDesign.createdAt.toISOString()
      },
      uploadedBy: user?.user?.id || 'system',
      uploadedByName: user?.user?.name || 'Design Agent',
      isShared: true,
      isFavorite: saveModalDesign.isFavorite,
      isClientVisible: false,
      createdAt: saveModalDesign.createdAt.toISOString(),
      updatedAt: new Date().toISOString()
    };

    wasabiService.saveAssetToStorage(evAsset);

    // Also save to AI assets
    saveAsset({
      name: saveName,
      type: 'image',
      content: saveModalDesign.imageUrl,
      prompt: saveModalDesign.prompt,
      model: 'VIEWS Design Agent',
      tags: evAsset.tags,
      isShared: true
    });

    setSaveModalDesign(null);
    setSaveName("");
    setSaveTags("");
  };

  const toggleFavorite = (designId: string) => {
    const updated = generatedDesigns.map(d =>
      d.id === designId ? { ...d, isFavorite: !d.isFavorite } : d
    );
    setGeneratedDesigns(updated);
    saveHistory(updated);

    // Also update session designs
    setSessionDesigns(sessionDesigns.map(d =>
      d.id === designId ? { ...d, isFavorite: !d.isFavorite } : d
    ));
  };

  const downloadDesign = (design: GeneratedDesign) => {
    const link = document.createElement("a");
    link.href = design.imageUrl;
    link.download = `views-design-${design.id}.png`;
    link.click();
  };

  const deleteDesign = (designId: string) => {
    setSessionDesigns(sessionDesigns.filter(d => d.id !== designId));
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-brand-dark">
      {/* Header - Media Studio Style */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-brand-dark/80 backdrop-blur-xl">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
                <Wand2 className="w-6 h-6 text-brand-gold" />
              </div>
              <div>
                <h1 className="text-2xl font-views font-bold tracking-wide text-white">
                  DESIGN <span className="text-brand-gold">AGENT</span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">AI-powered premium design generation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {sessionDesigns.length > 0 && (
                <span className="text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg">
                  {sessionDesigns.length} generated this session
                </span>
              )}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  showHistory ? "bg-brand-gold text-black" : "bg-white/[0.05] text-gray-400 hover:text-white"
                }`}
              >
                <History className="w-4 h-4" />
                History ({generatedDesigns.length})
              </button>
            </div>
          </div>

          {/* Quick Style Pills */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {STYLE_PRESETS.map(style => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedStyle.id === style.id
                    ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/30"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <div className="flex gap-0.5">
                  {style.colors.slice(0, 2).map((color, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  ))}
                </div>
                {style.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Controls */}
        <div className="w-80 border-r border-white/[0.06] bg-brand-card/50 overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Aspect Ratio */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Aspect Ratio</h3>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.id}
                    onClick={() => setSelectedRatio(ratio)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedRatio.id === ratio.id
                        ? "bg-brand-gold text-black"
                        : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Style Details */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                {selectedStyle.colors.map((color, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                ))}
              </div>
              <h4 className="text-sm font-medium text-white">{selectedStyle.name}</h4>
              <p className="text-xs text-gray-500 mt-1">{selectedStyle.description}</p>
            </div>

            {/* Prompt Input */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Describe Your Design</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A sleek logo for a music production company..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 resize-none"
              />
              <div className="text-right text-[10px] text-gray-600 mt-1">{prompt.length}/500</div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-black font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Design
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right - Generated Designs Gallery */}
        <div className="flex-1 overflow-y-auto p-6">
          {sessionDesigns.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                  <Wand2 className="w-10 h-10 text-brand-gold" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Ready to Create</h3>
                <p className="text-sm text-gray-500">
                  Select a style, describe your vision, and let VIEWS AI generate premium designs for your projects.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionDesigns.map(design => (
                <div
                  key={design.id}
                  className="group relative bg-brand-card border border-white/[0.06] rounded-xl overflow-hidden hover:border-brand-gold/30 transition-all"
                >
                  {/* Aspect Ratio Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2 py-1 bg-black/80 backdrop-blur-sm text-brand-gold text-[10px] font-bold rounded-lg">
                      {design.aspectRatio}
                    </span>
                  </div>

                  {/* Image */}
                  <div className="aspect-square bg-brand-dark flex items-center justify-center overflow-hidden">
                    <img
                      src={design.imageUrl}
                      alt={design.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs text-gray-300 mb-3 line-clamp-2">{design.prompt}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openSaveModal(design)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-gold text-black text-xs font-bold rounded-lg hover:bg-brand-gold/90 transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save
                        </button>
                        <button
                          onClick={() => setPreviewDesign(design)}
                          className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadDesign(design)}
                          className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleFavorite(design.id)}
                          className={`p-2 rounded-lg transition-all ${
                            design.isFavorite
                              ? "bg-red-500/20 text-red-400"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${design.isFavorite ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Style Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {design.isFavorite && (
                      <Heart className="w-4 h-4 text-red-400 fill-current" />
                    )}
                  </div>
                </div>
              ))}

              {/* Loading Card */}
              {isGenerating && (
                <div className="relative bg-brand-card border border-brand-gold/30 rounded-xl overflow-hidden">
                  <div className="aspect-square bg-brand-dark flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mx-auto mb-3" />
                      <p className="text-xs text-gray-400">Generating with AI...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewDesign && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="relative max-w-4xl max-h-full flex flex-col">
            <button
              onClick={() => setPreviewDesign(null)}
              className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={previewDesign.imageUrl}
              alt={previewDesign.prompt}
              className="max-h-[70vh] object-contain rounded-xl"
            />

            <div className="mt-4 p-4 bg-brand-card border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-brand-gold/10 text-brand-gold text-xs font-medium rounded">
                    {previewDesign.style}
                  </span>
                  <span className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded">
                    {previewDesign.aspectRatio}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      openSaveModal(previewDesign);
                      setPreviewDesign(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold text-black text-xs font-bold rounded-lg"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save to Library
                  </button>
                  <button
                    onClick={() => downloadDesign(previewDesign)}
                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-300">{previewDesign.prompt}</p>
              <p className="text-xs text-gray-500 mt-2">
                Generated {previewDesign.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {saveModalDesign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-brand-card border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-gold/10">
                  <Save className="w-5 h-5 text-brand-gold" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Save to Asset Library</h3>
                  <p className="text-xs text-gray-500">Add this design to your collection</p>
                </div>
              </div>
              <button onClick={() => setSaveModalDesign(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="p-5">
              <div className="flex gap-4">
                <img
                  src={saveModalDesign.imageUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-xl"
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Name</label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-gold/50"
                      placeholder="Design name..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tags</label>
                    <input
                      type="text"
                      value={saveTags}
                      onChange={(e) => setSaveTags(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-gold/50"
                      placeholder="tag1, tag2, tag3..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setSaveModalDesign(null)}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveToLibrary}
                disabled={!saveName.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-brand-gold text-black font-bold text-sm rounded-xl hover:bg-brand-gold/90 disabled:opacity-50 transition-all"
              >
                <Check className="w-4 h-4" />
                Save to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Panel (Slide-in) */}
      {showHistory && (
        <div className="fixed inset-y-0 right-0 w-96 bg-brand-dark border-l border-white/10 shadow-2xl z-40 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Generation History</h3>
            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {generatedDesigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No designs generated yet
              </div>
            ) : (
              generatedDesigns.map(design => (
                <div
                  key={design.id}
                  className="flex gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-brand-gold/30 transition-all cursor-pointer"
                  onClick={() => {
                    setPreviewDesign(design);
                    setShowHistory(false);
                  }}
                >
                  <img
                    src={design.imageUrl}
                    alt={design.prompt}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{design.prompt}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{design.style}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(design.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {design.isFavorite && (
                    <Heart className="w-4 h-4 text-red-400 fill-current flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignAgent;
