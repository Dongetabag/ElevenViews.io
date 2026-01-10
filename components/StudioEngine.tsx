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
                        className="group relative bg-brand-card border border-white/[0.06] rounded-2xl overflow-hidden cursor-pointer hover:border-brand-gold/30 transition-all hover:shadow-lg hover:shadow-brand-gold/5"
                      >
                        <div className="aspect-square bg-brand-surface flex items-center justify-center overflow-hidden">
                          {item.type === "image" && item.url ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-600">
                              {getTypeIcon(item.type)}
                              <span className="text-xs uppercase">{item.type}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm text-white font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(item.size)}</p>
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <Eye className="w-4 h-4 text-white" />
                          </button>
                          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <Download className="w-4 h-4 text-white" />
                          </button>
                          <button className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            <Heart className={`w-4 h-4 ${item.isFavorite ? "text-red-500 fill-current" : "text-white"}`} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setPreviewItem(item)}
                        className="flex items-center gap-4 p-4 bg-brand-card border border-white/[0.06] rounded-xl cursor-pointer hover:border-brand-gold/30 transition-all"
                      >
                        <div className="w-12 h-12 rounded-lg bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.type === "image" && item.url ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            getTypeIcon(item.type)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(item.size)} - {new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-500 hover:text-white transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-500 hover:text-white transition-colors">
                            <MoreVertical className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewItem(null)}>
          <div className="relative max-w-4xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewItem(null)} className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <div className="bg-brand-card border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center">
                {previewItem.type === "image" ? (
                  <img src={previewItem.url} alt={previewItem.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-gray-500">
                    {getTypeIcon(previewItem.type)}
                    <p className="mt-2">{previewItem.name}</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-white/[0.06]">
                <h3 className="text-lg font-semibold text-white mb-2">{previewItem.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{formatFileSize(previewItem.size)}</span>
                  <span>-</span>
                  <span>{new Date(previewItem.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-medium text-sm rounded-xl">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
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
    </div>
  );
};

export default StudioEngine;
