import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FolderOpen, Wand2, Grid3X3, List, Search, Filter, Plus,
  Image as ImageIcon, Video, Music, FileText, MoreVertical, Star,
  Download, Share2, Trash2, Eye, Sparkles, Play, Pause, X, Check,
  ChevronRight, Folder, Tag, Calendar, Clock, Zap, Brain, MessageSquare,
  ArrowUpRight, RefreshCw, Settings, Maximize2, Heart, BookmarkPlus
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { wasabiService, ElevenViewsAsset } from "../services/wasabiService";
import { useCurrentUser, useAIAssets } from "../hooks/useAppStore";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "audio" | "document";
  url: string;
  thumbnail?: string;
  size: number;
  createdAt: string;
  tags: string[];
  isFavorite: boolean;
  folder?: string;
  metadata?: Record<string, any>;
}

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const StudioEngine: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"library" | "upload" | "assistant">("library");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media playback state
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Delete state
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI Edit state
  const [aiEditItem, setAiEditItem] = useState<MediaItem | null>(null);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiEditResult, setAiEditResult] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your VIEWS AI Assistant. I can help you organize your media library, suggest edits, find assets, or answer questions about your creative projects. What would you like to work on?",
      timestamp: new Date()
    }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const user = useCurrentUser();
  const { assets: aiAssets, saveAsset } = useAIAssets();

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const storedAssets = wasabiService.getAssetsFromStorage();
      const mappedItems: MediaItem[] = storedAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.category as MediaItem["type"],
        url: asset.url,
        thumbnail: asset.thumbnailUrl,
        size: asset.fileSize,
        createdAt: asset.createdAt,
        tags: asset.tags,
        isFavorite: asset.isFavorite,
        folder: asset.subcategory,
        metadata: asset.metadata
      }));
      setMediaItems(mappedItems);
    } catch (err) {
      console.error("Failed to load assets:", err);
    }
    setIsLoading(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    setUploadingFiles(files);
    setUploadProgress(0);
    setActiveTab("upload");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round(((i + 0.5) / files.length) * 100);
      setUploadProgress(progress);

      try {
        // Upload via MCP server to Wasabi
        const asset = await wasabiService.uploadViaMCP(file, {
          userId: user?.user?.id || 'system',
          userName: user?.user?.name || 'Studio Upload',
          folder: 'studio-uploads',
        });

        if (asset) {
          const newItem: MediaItem = {
            id: asset.id,
            name: asset.name,
            type: asset.category as MediaItem["type"],
            url: asset.url,
            thumbnail: asset.thumbnailUrl,
            size: asset.fileSize,
            createdAt: asset.createdAt,
            tags: asset.tags,
            isFavorite: false,
            folder: asset.subcategory || "uploads",
            metadata: asset.metadata
          };
          setMediaItems(prev => [newItem, ...prev]);
        }
      } catch (err) {
        console.error("Upload failed for", file.name, err);
        // Create local preview as fallback
        const fileType = file.type.startsWith("image") ? "image" :
                         file.type.startsWith("video") ? "video" :
                         file.type.startsWith("audio") ? "audio" : "document";

        const newItem: MediaItem = {
          id: "local_" + Date.now() + "_" + i,
          name: file.name,
          type: fileType,
          url: URL.createObjectURL(file),
          size: file.size,
          createdAt: new Date().toISOString(),
          tags: ["pending-upload"],
          isFavorite: false,
          folder: "uploads"
        };
        setMediaItems(prev => [newItem, ...prev]);
      }

      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploadingFiles([]);
    setTimeout(() => {
      setActiveTab("library");
      setUploadProgress(0);
    }, 1000);
  };

  const handleAISubmit = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage: AIMessage = {
      role: "user",
      content: aiInput,
      timestamp: new Date()
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput("");
    setAiLoading(true);

    try {
      const apiKey = (window as any).__ENV__?.VITE_GOOGLE_AI_API_KEY ||
                     import.meta.env?.VITE_GOOGLE_AI_API_KEY;

      if (!apiKey) {
        throw new Error("AI API key not configured");
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: aiInput,
        config: {
          systemInstruction: "You are the VIEWS AI Assistant, a creative partner for a premium production studio. Help users organize media, suggest creative edits, find assets, generate ideas, and answer production questions. Be concise, helpful, and creative with a professional but friendly tone."
        }
      });

      const assistantMessage: AIMessage = {
        role: "assistant",
        content: response.text || "I'm having trouble processing that. Could you try again?",
        timestamp: new Date()
      };

      setAiMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI error:", err);
      setAiMessages(prev => [...prev, {
        role: "assistant",
        content: "I encountered an error. Please try again in a moment.",
        timestamp: new Date()
      }]);
    }

    setAiLoading(false);
  };

  const filteredItems = mediaItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = selectedFilter === "all" || item.type === selectedFilter;
    const matchesFolder = !selectedFolder || item.folder === selectedFolder;
    return matchesSearch && matchesFilter && matchesFolder;
  });

  const folders = Array.from(new Set(mediaItems.map(item => item.folder).filter(Boolean)));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="w-4 h-4" />;
      case "video": return <Video className="w-4 h-4" />;
      case "audio": return <Music className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Media playback controls
  const handlePlayPause = (item: MediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (playingItemId === item.id && isPlaying) {
      // Pause current
      if (item.type === "audio" && audioRef.current) {
        audioRef.current.pause();
      } else if (item.type === "video" && videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    } else if (playingItemId === item.id && !isPlaying) {
      // Resume current
      if (item.type === "audio" && audioRef.current) {
        audioRef.current.play();
      } else if (item.type === "video" && videoRef.current) {
        videoRef.current.play();
      }
      setIsPlaying(true);
    } else {
      // Play new item
      setPlayingItemId(item.id);
      setPreviewItem(item);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const target = e.target as HTMLAudioElement | HTMLVideoElement;
    setCurrentTime(target.currentTime);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement | HTMLVideoElement>) => {
    const target = e.target as HTMLAudioElement | HTMLVideoElement;
    setDuration(target.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
    if (videoRef.current) videoRef.current.volume = newVolume;
  };

  const handleMediaEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const closePreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setPreviewItem(null);
    setPlayingItemId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // Delete asset
  const handleDelete = async (item: MediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setIsDeleting(true);
    try {
      // Delete from MCP/Wasabi if it has a key
      const asset = wasabiService.getAssetsFromStorage().find(a => a.id === deleteItem.id);
      if (asset?.key) {
        const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';
        await fetch(`${MCP_URL}/mcp/tools/delete_file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: asset.key })
        });
      }

      // Remove from local storage
      wasabiService.deleteAssetFromStorage(deleteItem.id);

      // Update UI
      setMediaItems(prev => prev.filter(i => i.id !== deleteItem.id));

      // Close preview if this item was being previewed
      if (previewItem?.id === deleteItem.id) {
        closePreview();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setIsDeleting(false);
    setDeleteItem(null);
  };

  // AI Edit image
  const handleAiEdit = (item: MediaItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setAiEditItem(item);
    setAiEditPrompt("");
    setAiEditResult(null);
  };

  const performAiEdit = async () => {
    if (!aiEditItem || !aiEditPrompt.trim()) return;

    setIsAiEditing(true);
    try {
      const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

      // Call MCP AI edit endpoint
      const response = await fetch(`${MCP_URL}/ai/edit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: aiEditItem.url,
          prompt: aiEditPrompt,
          userId: user?.user?.id || 'system'
        })
      });

      const result = await response.json();

      if (result.success && result.editedImageUrl) {
        setAiEditResult(result.editedImageUrl);
      } else {
        // Fallback: Use Google AI for image description/analysis
        const apiKey = (window as any).__ENV__?.VITE_GOOGLE_AI_API_KEY ||
                       import.meta.env?.VITE_GOOGLE_AI_API_KEY;

        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const aiResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: `Describe how you would edit this image based on the request: "${aiEditPrompt}". The image is named "${aiEditItem.name}". Provide a detailed description of the edits you would make.`,
          });

          setAiEditResult(aiResponse.text || "AI editing not available at this time.");
        } else {
          setAiEditResult("AI editing feature requires API configuration.");
        }
      }
    } catch (err) {
      console.error('AI edit failed:', err);
      setAiEditResult("Failed to process AI edit. Please try again.");
    }
    setIsAiEditing(false);
  };

  const saveAiEditedImage = async () => {
    if (!aiEditResult || !aiEditItem) return;

    // If result is a URL, save as new asset
    if (aiEditResult.startsWith('http') || aiEditResult.startsWith('data:')) {
      const newItem: MediaItem = {
        id: `ai_edit_${Date.now()}`,
        name: `${aiEditItem.name} (AI Edited)`,
        type: "image",
        url: aiEditResult,
        size: 0,
        createdAt: new Date().toISOString(),
        tags: [...(aiEditItem.tags || []), "ai-edited"],
        isFavorite: false,
        folder: "ai-edits"
      };
      setMediaItems(prev => [newItem, ...prev]);
    }

    setAiEditItem(null);
    setAiEditPrompt("");
    setAiEditResult(null);
  };

  return (
    <div className="h-full flex flex-col bg-brand-dark">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-brand-dark/80 backdrop-blur-xl">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-views font-bold tracking-wide text-white">
                STUDIO <span className="text-brand-gold">ENGINE</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Your creative command center</p>
            </div>

            <div className="flex items-center gap-2 bg-white/[0.03] rounded-2xl p-1.5">
              {[
                { id: "library", label: "Library", icon: FolderOpen },
                { id: "upload", label: "Upload", icon: Upload },
                { id: "assistant", label: "AI Assistant", icon: Brain }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-brand-gold text-black shadow-lg shadow-brand-gold/20"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "library" && (
          <div className="h-full flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/[0.06] bg-brand-card/50 flex-shrink-0">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Folders</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      !selectedFolder ? "bg-brand-gold/10 text-brand-gold" : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    All Files
                    <span className="ml-auto text-xs opacity-60">{mediaItems.length}</span>
                  </button>
                  {folders.map(folder => (
                    <button
                      key={folder}
                      onClick={() => setSelectedFolder(folder!)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedFolder === folder ? "bg-brand-gold/10 text-brand-gold" : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <Folder className="w-4 h-4" />
                      {folder}
                      <span className="ml-auto text-xs opacity-60">
                        {mediaItems.filter(i => i.folder === folder).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-white/[0.06]">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Filters</h3>
                <div className="space-y-1">
                  {["all", "image", "video", "audio", "document"].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedFilter === filter ? "bg-brand-gold/10 text-brand-gold" : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      {filter === "all" ? <Grid3X3 className="w-4 h-4" /> : getTypeIcon(filter)}
                      <span className="capitalize">{filter === "all" ? "All Types" : filter + "s"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.06] bg-brand-dark/50">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search your library..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-brand-gold text-black" : "text-gray-500 hover:text-white"}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-brand-gold text-black" : "text-gray-500 hover:text-white"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab("upload")}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-gold text-black font-semibold text-sm rounded-xl hover:bg-brand-gold/90 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Upload
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <FolderOpen className="w-16 h-16 text-gray-700 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No files found</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload your first file to get started</p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-medium text-sm rounded-xl"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Files
                    </button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setPreviewItem(item)}
                        className={`group relative bg-brand-card border rounded-2xl overflow-hidden cursor-pointer hover:border-brand-gold/30 transition-all hover:shadow-lg hover:shadow-brand-gold/5 ${
                          playingItemId === item.id ? "border-brand-gold/50 ring-2 ring-brand-gold/20" : "border-white/[0.06]"
                        }`}
                      >
                        <div className="aspect-square bg-brand-surface flex items-center justify-center overflow-hidden relative">
                          {item.type === "image" && item.url ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          ) : item.type === "video" ? (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-brand-surface flex flex-col items-center justify-center">
                              <Video className="w-10 h-10 text-purple-400 mb-2" />
                              <span className="text-xs text-gray-500 uppercase">Video</span>
                            </div>
                          ) : item.type === "audio" ? (
                            <div className="w-full h-full bg-gradient-to-br from-brand-gold/10 to-brand-surface flex flex-col items-center justify-center">
                              <Music className="w-10 h-10 text-brand-gold mb-2" />
                              <span className="text-xs text-gray-500 uppercase">Audio</span>
                              {playingItemId === item.id && isPlaying && (
                                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <div
                                      key={i}
                                      className="flex-1 bg-brand-gold rounded-full animate-pulse"
                                      style={{
                                        height: `${Math.random() * 20 + 10}px`,
                                        animationDelay: `${i * 0.1}s`
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-600">
                              <FileText className="w-10 h-10" />
                              <span className="text-xs uppercase">{item.type}</span>
                            </div>
                          )}
                          {/* Play button overlay for audio/video */}
                          {(item.type === "audio" || item.type === "video") && (
                            <button
                              onClick={(e) => handlePlayPause(item, e)}
                              className={`absolute inset-0 flex items-center justify-center transition-all ${
                                playingItemId === item.id
                                  ? "bg-black/40"
                                  : "bg-black/0 group-hover:bg-black/40"
                              }`}
                            >
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                                playingItemId === item.id && isPlaying
                                  ? "bg-brand-gold scale-100"
                                  : "bg-white/90 scale-0 group-hover:scale-100"
                              }`}>
                                {playingItemId === item.id && isPlaying ? (
                                  <Pause className="w-6 h-6 text-black" />
                                ) : (
                                  <Play className="w-6 h-6 text-black ml-1" />
                                )}
                              </div>
                            </button>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm text-white font-medium truncate">{item.name}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
                            {playingItemId === item.id && (
                              <span className="text-xs text-brand-gold font-medium">
                                {isPlaying ? "Playing" : "Paused"}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Hover overlay with actions */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity flex flex-col justify-end p-3 ${
                          item.type === "audio" || item.type === "video" ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
                        }`}>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {item.type === "image" && (
                              <button
                                onClick={(e) => handleAiEdit(item, e)}
                                className="p-2 bg-brand-gold/90 rounded-lg hover:bg-brand-gold transition-colors"
                                title="AI Edit"
                              >
                                <Wand2 className="w-4 h-4 text-black" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4 text-white" />
                            </button>
                            <a
                              href={item.url}
                              download={item.name}
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-white" />
                            </a>
                            <button
                              onClick={(e) => handleDelete(item, e)}
                              className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                        {/* Quick action buttons for audio/video */}
                        {(item.type === "audio" || item.type === "video") && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleDelete(item, e)}
                              className="p-1.5 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setPreviewItem(item)}
                        className={`flex items-center gap-4 p-4 bg-brand-card border rounded-xl cursor-pointer hover:border-brand-gold/30 transition-all ${
                          playingItemId === item.id ? "border-brand-gold/50 ring-1 ring-brand-gold/20" : "border-white/[0.06]"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                          {item.type === "image" && item.url ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          ) : item.type === "video" ? (
                            <Video className="w-5 h-5 text-purple-400" />
                          ) : item.type === "audio" ? (
                            <Music className="w-5 h-5 text-brand-gold" />
                          ) : (
                            getTypeIcon(item.type)
                          )}
                          {/* Play button overlay for audio/video in list view */}
                          {(item.type === "audio" || item.type === "video") && (
                            <button
                              onClick={(e) => handlePlayPause(item, e)}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {playingItemId === item.id && isPlaying ? (
                                <Pause className="w-5 h-5 text-white" />
                              ) : (
                                <Play className="w-5 h-5 text-white ml-0.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatFileSize(item.size)}</span>
                            <span>-</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            {playingItemId === item.id && (
                              <>
                                <span>-</span>
                                <span className="text-brand-gold font-medium">
                                  {isPlaying ? "▶ Playing" : "⏸ Paused"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {(item.type === "audio" || item.type === "video") && (
                            <button
                              onClick={(e) => handlePlayPause(item, e)}
                              className={`p-2 rounded-lg transition-colors ${
                                playingItemId === item.id && isPlaying
                                  ? "bg-brand-gold text-black"
                                  : "text-gray-500 hover:text-white hover:bg-white/10"
                              }`}
                              title={isPlaying ? "Pause" : "Play"}
                            >
                              {playingItemId === item.id && isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {item.type === "image" && (
                            <button
                              onClick={(e) => handleAiEdit(item, e)}
                              className="p-2 text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-colors"
                              title="AI Edit"
                            >
                              <Wand2 className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={item.url}
                            download={item.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="h-full flex items-center justify-center p-8">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`w-full max-w-2xl aspect-video border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${
                dragActive ? "border-brand-gold bg-brand-gold/5" : "border-white/10 hover:border-white/20"
              }`}
            >
              {uploadingFiles.length > 0 ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-gold/10 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-brand-gold animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Uploading...</h3>
                  <p className="text-gray-500 mb-4">{uploadingFiles.length} file(s)</p>
                  <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-6">
                    <Upload className="w-10 h-10 text-brand-gold" />
                  </div>
                  <h3 className="text-2xl font-views font-bold text-white mb-2">Drop files here</h3>
                  <p className="text-gray-500 mb-6">or click to browse from your computer</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 transition-colors"
                  >
                    Browse Files
                  </button>
                  <p className="text-xs text-gray-600 mt-4">Supports images, videos, audio, and documents up to 100MB</p>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "assistant" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {aiMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                    message.role === "user" ? "bg-brand-gold text-black" : "bg-brand-card border border-white/[0.06] text-white"
                  }`}>
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-brand-gold" />
                        </div>
                        <span className="text-xs font-medium text-brand-gold">VIEWS AI</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className={`text-xs mt-2 ${message.role === "user" ? "text-black/50" : "text-gray-500"}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-brand-card border border-white/[0.06] rounded-2xl px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-brand-gold rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 p-6 border-t border-white/[0.06] bg-brand-dark">
              <div className="flex items-center gap-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAISubmit()}
                    placeholder="Ask your AI assistant anything..."
                    className="w-full px-5 py-4 bg-brand-card border border-white/[0.06] rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                  />
                </div>
                <button
                  onClick={handleAISubmit}
                  disabled={!aiInput.trim() || aiLoading}
                  className="p-4 bg-brand-gold text-black rounded-2xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-600 text-center mt-3">Powered by VIEWS AI</p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closePreview}>
          <div className="relative max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={closePreview} className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <div className="bg-brand-card border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Media Display Area */}
              <div className={`bg-black flex items-center justify-center ${previewItem.type === "audio" ? "py-12" : "aspect-video"}`}>
                {previewItem.type === "image" ? (
                  <img src={previewItem.url} alt={previewItem.name} className="max-w-full max-h-full object-contain" />
                ) : previewItem.type === "video" ? (
                  <video
                    ref={videoRef}
                    src={previewItem.url}
                    className="w-full h-full object-contain"
                    autoPlay={isPlaying}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleMediaEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : previewItem.type === "audio" ? (
                  <div className="w-full px-8">
                    {/* Audio Visualization */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center mb-4">
                        <Music className="w-16 h-16 text-brand-gold" />
                      </div>
                      <h4 className="text-white font-medium text-lg">{previewItem.name}</h4>
                    </div>
                    {/* Audio Element (hidden) */}
                    <audio
                      ref={audioRef}
                      src={previewItem.url}
                      autoPlay={isPlaying}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleMediaEnded}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    {/* Waveform visualization placeholder */}
                    <div className="flex items-end justify-center gap-1 h-16 mb-4">
                      {[...Array(40)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-150 ${
                            isPlaying ? "bg-brand-gold" : "bg-gray-600"
                          }`}
                          style={{
                            height: isPlaying
                              ? `${Math.sin(i * 0.3 + currentTime * 2) * 30 + 35}%`
                              : `${Math.sin(i * 0.5) * 20 + 30}%`,
                            opacity: isPlaying ? 1 : 0.5
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg font-medium">{previewItem.name}</p>
                    <p className="text-sm mt-2">Document preview not available</p>
                  </div>
                )}
              </div>

              {/* Media Controls for Audio/Video */}
              {(previewItem.type === "audio" || previewItem.type === "video") && (
                <div className="px-6 py-4 bg-brand-surface border-t border-white/[0.06]">
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-500 w-10 text-right font-mono">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-4
                          [&::-webkit-slider-thumb]:h-4
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-brand-gold
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:shadow-lg
                          [&::-webkit-slider-thumb]:shadow-brand-gold/30"
                        style={{
                          background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 font-mono">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Play/Pause */}
                      <button
                        onClick={() => handlePlayPause(previewItem)}
                        className="w-12 h-12 rounded-full bg-brand-gold flex items-center justify-center hover:bg-brand-gold/90 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-black" />
                        ) : (
                          <Play className="w-5 h-5 text-black ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVolume(volume > 0 ? 0 : 1)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        {volume === 0 ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3
                          [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-white
                          [&::-webkit-slider-thumb]:cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* File Info & Actions */}
              <div className="p-6 border-t border-white/[0.06]">
                <h3 className="text-lg font-semibold text-white mb-2">{previewItem.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="capitalize">{previewItem.type}</span>
                  <span>•</span>
                  <span>{formatFileSize(previewItem.size)}</span>
                  <span>•</span>
                  <span>{new Date(previewItem.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <a
                    href={previewItem.url}
                    download={previewItem.name}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-medium text-sm rounded-xl hover:bg-brand-gold/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] text-white font-medium text-sm rounded-xl hover:bg-white/[0.1]">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setDeleteItem(null)}>
          <div className="bg-brand-card border border-white/[0.06] rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Asset</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-brand-surface rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                {deleteItem.type === "image" && deleteItem.url ? (
                  <img src={deleteItem.url} alt={deleteItem.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-brand-dark flex items-center justify-center">
                    {getTypeIcon(deleteItem.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{deleteItem.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(deleteItem.size)} • {deleteItem.type}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="flex-1 px-4 py-3 bg-white/[0.05] text-white font-medium text-sm rounded-xl hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-medium text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Edit Modal */}
      {aiEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => { setAiEditItem(null); setAiEditResult(null); }}>
          <div className="bg-brand-card border border-white/[0.06] rounded-2xl max-w-2xl w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-brand-gold" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Image Editor</h3>
                  <p className="text-xs text-gray-500">Powered by VIEWS AI</p>
                </div>
              </div>
              <button
                onClick={() => { setAiEditItem(null); setAiEditResult(null); }}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Image Preview */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Original</p>
                  <div className="aspect-square bg-brand-surface rounded-xl overflow-hidden">
                    <img src={aiEditItem.url} alt={aiEditItem.name} className="w-full h-full object-contain" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Result</p>
                  <div className="aspect-square bg-brand-surface rounded-xl overflow-hidden flex items-center justify-center">
                    {aiEditResult ? (
                      aiEditResult.startsWith('http') || aiEditResult.startsWith('data:') ? (
                        <img src={aiEditResult} alt="AI Edited" className="w-full h-full object-contain" />
                      ) : (
                        <div className="p-4 text-sm text-gray-400 overflow-y-auto max-h-full">
                          <p className="whitespace-pre-wrap">{aiEditResult}</p>
                        </div>
                      )
                    ) : isAiEditing ? (
                      <div className="text-center">
                        <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Processing...</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-600">
                        <Sparkles className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">AI result will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prompt Input */}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Edit Instructions
                </label>
                <textarea
                  value={aiEditPrompt}
                  onChange={(e) => setAiEditPrompt(e.target.value)}
                  placeholder="Describe how you want to edit this image... (e.g., 'Remove background', 'Add vintage filter', 'Enhance colors')"
                  className="w-full px-4 py-3 bg-brand-surface border border-white/[0.06] rounded-xl text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-brand-gold/50"
                  rows={3}
                />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mb-6">
                {["Remove background", "Enhance colors", "Add vintage filter", "Sharpen image", "Convert to B&W"].map(action => (
                  <button
                    key={action}
                    onClick={() => setAiEditPrompt(action)}
                    className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.06] rounded-lg text-xs text-gray-400 hover:text-white hover:border-brand-gold/30 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setAiEditItem(null); setAiEditResult(null); }}
                  className="px-4 py-3 bg-white/[0.05] text-white font-medium text-sm rounded-xl hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={performAiEdit}
                  disabled={!aiEditPrompt.trim() || isAiEditing}
                  className="flex-1 px-4 py-3 bg-brand-gold text-black font-medium text-sm rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAiEditing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Apply AI Edit
                    </>
                  )}
                </button>
                {aiEditResult && (aiEditResult.startsWith('http') || aiEditResult.startsWith('data:')) && (
                  <button
                    onClick={saveAiEditedImage}
                    className="px-4 py-3 bg-green-500 text-white font-medium text-sm rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioEngine;
