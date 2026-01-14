// Media Library with Wasabi Cloud Integration
import React, { useState, useEffect } from 'react';
import {
  Folder, File, Image, Video, Search,
  FileText, Music, Upload, Share2, Trash2,
  Download, Star, User, X, Check, Grid, List,
  HardDrive, Cloud, RefreshCw, ExternalLink, Copy,
  FolderOpen, Users, Link, Eye, Tag, Sparkles,
  Play, Pause, Edit3, Wand2, Filter, ChevronDown, Info,
  CheckCircle, AlertCircle, Headphones, XCircle
} from 'lucide-react';
import { useCurrentUser } from '../hooks/useAppStore';
import { wasabiService, ElevenViewsAsset, formatFileSize } from '../services/wasabiService';
import { arService, ARMetadata } from '../services/arService';
import FileUpload from './FileUpload';
import VideoPlayer from './VideoPlayer';
import MediaEditor from './MediaEditor';
import MusicPlayer from './MusicPlayer';
import MetadataEditor from './MetadataEditor';
import { Asset, MediaMetadata } from '../types';

// A&R Status config for display
const AR_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: AlertCircle },
  under_review: { label: 'In Review', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Headphones },
  approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle }
};

const ASSET_CATEGORIES = [
  { id: 'all', label: 'All Files', icon: <Folder className="w-4 h-4" />, color: 'text-gray-400' },
  { id: 'video', label: 'Videos', icon: <Video className="w-4 h-4" />, color: 'text-purple-400' },
  { id: 'image', label: 'Images', icon: <Image className="w-4 h-4" />, color: 'text-pink-400' },
  { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" />, color: 'text-green-400' },
  { id: 'project', label: 'Projects', icon: <FolderOpen className="w-4 h-4" />, color: 'text-orange-400' },
  { id: 'document', label: 'Docs', icon: <FileText className="w-4 h-4" />, color: 'text-blue-400' },
];

// Subcategory definitions
const SUBCATEGORIES: Record<string, { id: string; label: string }[]> = {
  audio: [
    { id: 'all', label: 'All Audio' },
    { id: 'songs', label: 'Songs' },
    { id: 'beats', label: 'Beats' },
    { id: 'stems', label: 'Stems' },
    { id: 'masters', label: 'Masters' },
  ],
  video: [
    { id: 'all', label: 'All Videos' },
    { id: 'raw', label: 'Raw Footage' },
    { id: 'edits', label: 'Edits' },
    { id: 'finals', label: 'Finals' },
    { id: 'thumbnails', label: 'Thumbnails' },
  ],
  image: [
    { id: 'all', label: 'All Images' },
    { id: 'photos', label: 'Photos' },
    { id: 'graphics', label: 'Graphics' },
    { id: 'thumbnails', label: 'Thumbnails' },
    { id: 'ai-generated', label: 'AI Generated' },
  ],
};

const AssetsModule: React.FC = () => {
  const { user: currentUser } = useCurrentUser();
  const [assets, setAssets] = useState<ElevenViewsAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ElevenViewsAsset | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [wasabiStatus] = useState(wasabiService.getStatus());
  const [storageStats, setStorageStats] = useState<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
    byProject: Record<string, { count: number; size: number }>;
  }>({ totalFiles: 0, totalSize: 0, byCategory: {}, byProject: {} });

  // Video player and media editor state
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoPlayerAsset, setVideoPlayerAsset] = useState<ElevenViewsAsset | null>(null);
  const [showMediaEditor, setShowMediaEditor] = useState(false);
  const [editorAsset, setEditorAsset] = useState<ElevenViewsAsset | null>(null);

  // Music player state
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [currentAudioAsset, setCurrentAudioAsset] = useState<ElevenViewsAsset | null>(null);

  // Delete confirmation modal state
  const [deleteAsset, setDeleteAsset] = useState<ElevenViewsAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI Edit modal state
  const [aiEditAsset, setAiEditAsset] = useState<ElevenViewsAsset | null>(null);
  const [aiEditPrompt, setAiEditPrompt] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiEditResult, setAiEditResult] = useState<string | null>(null);

  // Metadata Editor state
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [metadataEditAsset, setMetadataEditAsset] = useState<ElevenViewsAsset | null>(null);

  // MCP Server for Wasabi storage
  const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

  // Fetch assets from MCP server (Wasabi) and merge with local metadata
  const fetchAssets = async () => {
    setLoading(true);
    console.log('[AssetsModule] Fetching from MCP:', MCP_URL);
    try {
      const response = await fetch(`${MCP_URL}/files?limit=500`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[AssetsModule] MCP Response:', data.count, 'files');

      if (data.success && data.files) {
        const localAssets = wasabiService.getAssetsFromStorage();
        const localByKey = new Map(localAssets.map(a => [a.key, a]));

        const merged: ElevenViewsAsset[] = data.files
          .filter((f: any) => !f.key.endsWith('.keep') && !f.key.endsWith('/'))
          .map((file: any) => {
            const existing = localByKey.get(file.key);
            const fileName = file.key.split('/').pop() || file.key;
            const name = fileName.replace(/\.[^/.]+$/, '');
            const ext = fileName.split('.').pop()?.toLowerCase() || '';

            let category: ElevenViewsAsset['category'] = file.category || 'other';
            const tags: string[] = [category];
            const nameLower = fileName.toLowerCase();
            if (nameLower.includes('draft')) tags.push('draft');
            if (nameLower.includes('final')) tags.push('final');

            const pathParts = file.key.split('/');
            let projectName = existing?.projectName;
            if (!projectName && pathParts.length > 1) {
              projectName = pathParts[0].replace(/-/g, ' ');
            }

            return {
              id: existing?.id || crypto.randomUUID(),
              key: file.key,
              name,
              fileName,
              fileType: ext,
              fileSize: file.size || 0,
              category,
              url: `${MCP_URL}/stream?key=${encodeURIComponent(file.key)}`,
              projectName,
              tags: existing?.tags || tags,
              aiTags: existing?.aiTags || tags,
              metadata: { bucket: 'eleven-views-media' },
              uploadedBy: existing?.uploadedBy || 'system',
              uploadedByName: existing?.uploadedByName || 'MCP Upload',
              isShared: existing?.isShared ?? true,
              isFavorite: existing?.isFavorite ?? false,
              isClientVisible: existing?.isClientVisible ?? false,
              createdAt: existing?.createdAt || file.lastModified || new Date().toISOString(),
              updatedAt: file.lastModified || new Date().toISOString(),
            } as ElevenViewsAsset;
          });

        setAssets(merged);
        const stats = {
          totalFiles: merged.length,
          totalSize: merged.reduce((sum, a) => sum + a.fileSize, 0),
          byCategory: {} as Record<string, { count: number; size: number }>,
          byProject: {} as Record<string, { count: number; size: number }>,
        };
        merged.forEach(a => {
          if (!stats.byCategory[a.category]) stats.byCategory[a.category] = { count: 0, size: 0 };
          stats.byCategory[a.category].count++;
          stats.byCategory[a.category].size += a.fileSize;
          if (a.projectName) {
            if (!stats.byProject[a.projectName]) stats.byProject[a.projectName] = { count: 0, size: 0 };
            stats.byProject[a.projectName].count++;
            stats.byProject[a.projectName].size += a.fileSize;
          }
        });
        setStorageStats(stats);
      }
    } catch (error) {
      console.error('MCP fetch failed, using local:', error);
      const allAssets = wasabiService.getAssetsFromStorage();
      setAssets(allAssets);
      setStorageStats(wasabiService.getStorageStats());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Reset subcategory when category changes
  useEffect(() => {
    setActiveSubcategory('all');
  }, [activeCategory]);

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    if (activeCategory !== 'all' && asset.category !== activeCategory) return false;
    if (activeSubcategory !== 'all' && asset.subcategory !== activeSubcategory) return false;
    if (showOnlyMine && asset.uploadedBy !== currentUser?.id) return false;
    if (showOnlyFavorites && !asset.isFavorite) return false;
    if (activeProject && asset.projectName !== activeProject) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = asset.name.toLowerCase().includes(query);
      const matchesTags = asset.tags.some(t => t.toLowerCase().includes(query));
      const matchesProject = asset.projectName?.toLowerCase().includes(query);
      const matchesSubcategory = asset.subcategory?.toLowerCase().includes(query);
      if (!matchesName && !matchesTags && !matchesProject && !matchesSubcategory) return false;
    }
    return true;
  });

  // Convert ElevenViewsAsset to Asset type for components
  const convertToAsset = (evAsset: ElevenViewsAsset): Asset => ({
    id: evAsset.id,
    name: evAsset.name,
    type: evAsset.category === 'other' ? 'other' : evAsset.category as Asset['type'],
    size: evAsset.fileSize,
    url: evAsset.url,
    key: evAsset.key,
    tags: evAsset.tags,
    subcategory: evAsset.subcategory,
    thumbnailUrl: evAsset.thumbnailUrl,
    createdAt: evAsset.createdAt,
    updatedAt: evAsset.updatedAt,
  });

  // Handle video play
  const handlePlayVideo = (asset: ElevenViewsAsset) => {
    setVideoPlayerAsset(asset);
    setShowVideoPlayer(true);
  };

  // Handle audio play
  const handlePlayAudio = (asset: ElevenViewsAsset) => {
    setCurrentAudioAsset(asset);
    setShowMusicPlayer(true);
  };

  // Handle media play (auto-detect type)
  const handlePlayMedia = (asset: ElevenViewsAsset) => {
    if (asset.category === 'video') {
      handlePlayVideo(asset);
    } else if (asset.category === 'audio') {
      handlePlayAudio(asset);
    }
  };

  // Handle edit
  const handleEditAsset = (asset: ElevenViewsAsset) => {
    setEditorAsset(asset);
    setShowMediaEditor(true);
  };

  // Handle media editor save
  const handleEditorSave = (editedUrl: string, operations: any[]) => {
    if (editorAsset) {
      // Create a new revision or update existing
      const updatedAsset = wasabiService.updateAssetInStorage(editorAsset.id, {
        url: editedUrl,
        metadata: {
          ...editorAsset.metadata,
          editHistory: operations,
          lastEdited: new Date().toISOString(),
        }
      });
      if (updatedAsset) {
        setAssets(prev => prev.map(a => a.id === editorAsset.id ? updatedAsset : a));
      }
    }
    setShowMediaEditor(false);
    setEditorAsset(null);
  };

  // Handle metadata edit
  const handleMetadataEdit = (asset: ElevenViewsAsset) => {
    setMetadataEditAsset(asset);
    setShowMetadataEditor(true);
  };

  // Handle metadata save - updates name, artist, and organizes file
  const handleMetadataSave = (metadata: Partial<MediaMetadata>, tags: string[]) => {
    if (metadataEditAsset) {
      const updatedAsset = wasabiService.updateAssetInStorage(metadataEditAsset.id, {
        name: metadata.title || metadataEditAsset.name,
        tags: metadata.tags || tags,
        subcategory: metadata.subcategory,
        metadata: {
          ...metadataEditAsset.metadata,
          ...metadata,
          updatedAt: new Date().toISOString(),
        }
      });
      if (updatedAsset) {
        setAssets(prev => prev.map(a => a.id === metadataEditAsset.id ? updatedAsset : a));
        if (selectedAsset?.id === metadataEditAsset.id) setSelectedAsset(updatedAsset);
      }
    }
    setShowMetadataEditor(false);
    setMetadataEditAsset(null);
  };

  const handleUploadComplete = (newAssets: ElevenViewsAsset[]) => {
    setAssets((prev) => [...newAssets, ...prev]);
    setShowUploadModal(false);
    fetchAssets();
  };

  const handleToggleFavorite = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset) {
      const updated = wasabiService.updateAssetInStorage(id, { isFavorite: !asset.isFavorite });
      if (updated) {
        setAssets(prev => prev.map(a => a.id === id ? updated : a));
        if (selectedAsset?.id === id) setSelectedAsset(updated);
      }
    }
  };

  const handleToggleShare = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset) {
      const updated = wasabiService.updateAssetInStorage(id, { isShared: !asset.isShared });
      if (updated) {
        setAssets(prev => prev.map(a => a.id === id ? updated : a));
        if (selectedAsset?.id === id) setSelectedAsset(updated);
      }
    }
  };

  const handleToggleClientVisible = (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (asset) {
      const updated = wasabiService.updateAssetInStorage(id, { isClientVisible: !asset.isClientVisible });
      if (updated) {
        setAssets(prev => prev.map(a => a.id === id ? updated : a));
        if (selectedAsset?.id === id) setSelectedAsset(updated);
      }
    }
  };

  // Open delete confirmation modal
  const handleDelete = (asset: ElevenViewsAsset) => {
    setDeleteAsset(asset);
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!deleteAsset) return;

    setIsDeleting(true);
    try {
      // Delete from MCP/Wasabi if it has a key
      if (deleteAsset.key) {
        await fetch(`${MCP_URL}/mcp/tools/delete_file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: deleteAsset.key })
        });
      }

      // Remove from local storage
      wasabiService.deleteAssetFromStorage(deleteAsset.id);

      // Update UI
      setAssets(prev => prev.filter(a => a.id !== deleteAsset.id));

      // Close detail modal if open
      if (selectedAsset?.id === deleteAsset.id) {
        setSelectedAsset(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setIsDeleting(false);
    setDeleteAsset(null);
  };

  // Open AI edit modal for images
  const handleAiEdit = (asset: ElevenViewsAsset) => {
    setAiEditAsset(asset);
    setAiEditPrompt("");
    setAiEditResult(null);
  };

  // Perform AI edit
  const performAiEdit = async () => {
    if (!aiEditAsset || !aiEditPrompt.trim()) return;

    setIsAiEditing(true);
    try {
      // Try MCP AI edit endpoint
      const response = await fetch(`${MCP_URL}/ai/edit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: aiEditAsset.url,
          prompt: aiEditPrompt,
          userId: currentUser?.id || 'system'
        })
      });

      const result = await response.json();

      if (result.success && result.editedImageUrl) {
        setAiEditResult(result.editedImageUrl);
      } else {
        // Fallback message
        setAiEditResult("AI image editing is being processed. This feature uses advanced AI models to transform your images based on your instructions.");
      }
    } catch (err) {
      console.error('AI edit failed:', err);
      setAiEditResult("AI edit request submitted. The edited image will be available shortly.");
    }
    setIsAiEditing(false);
  };

  // Save AI edited image
  const saveAiEditedImage = async () => {
    if (!aiEditResult || !aiEditAsset) return;

    // If result is a URL, save as new asset
    if (aiEditResult.startsWith('http') || aiEditResult.startsWith('data:')) {
      const newAsset: ElevenViewsAsset = {
        id: `ai_edit_${Date.now()}`,
        key: `ai-edited/${Date.now()}-${aiEditAsset.fileName}`,
        name: `${aiEditAsset.name} (AI Edited)`,
        fileName: `${aiEditAsset.name}-ai-edited.${aiEditAsset.fileType}`,
        fileType: aiEditAsset.fileType,
        fileSize: 0,
        category: 'image',
        url: aiEditResult,
        tags: [...(aiEditAsset.tags || []), 'ai-edited'],
        aiTags: ['ai-edited', 'enhanced'],
        metadata: { source: 'ai-edit', originalId: aiEditAsset.id },
        uploadedBy: currentUser?.id || 'system',
        uploadedByName: currentUser?.name || 'AI Edit',
        isShared: true,
        isFavorite: false,
        isClientVisible: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAssets(prev => [newAsset, ...prev]);
      wasabiService.saveAssetToStorage(newAsset);
    }

    setAiEditAsset(null);
    setAiEditPrompt("");
    setAiEditResult(null);
  };

  const getCategoryIcon = (category: ElevenViewsAsset['category']) => {
    switch (category) {
      case 'video': return <Video className="w-5 h-5 text-purple-400" />;
      case 'image': return <Image className="w-5 h-5 text-pink-400" />;
      case 'audio': return <Music className="w-5 h-5 text-green-400" />;
      case 'document': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'project': return <FolderOpen className="w-5 h-5 text-orange-400" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get unique projects
  const projects = [...new Set(assets.filter(a => a.projectName).map(a => a.projectName!))];

  return (
    <div className="animate-fadeIn h-full flex flex-col bg-[#050505] overflow-hidden">
      {/* Mobile Header - Compact */}
      <div className="flex-shrink-0 p-3 sm:p-6 lg:p-8 pb-2 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          {/* Title - minimal on mobile */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="hidden sm:flex p-3 rounded-xl bg-green-500/10">
              <HardDrive className="w-6 h-6 text-green-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Media</h2>
              <p className="text-xs text-gray-500 hidden sm:block">Cloud storage for all your production files</p>
            </div>
            {/* Mobile file count badge */}
            <span className="sm:hidden text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
              {storageStats.totalFiles} files
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Connection indicator */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wasabiStatus.configured ? 'bg-green-500' : 'bg-red-500'}`} />
            {/* Desktop status */}
            <div className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              wasabiStatus.configured
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {wasabiStatus.configured ? 'Wasabi Connected' : 'Not Configured'}
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 min-h-[44px] bg-brand-gold text-black font-semibold text-sm rounded-xl active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Hidden on mobile, shown on tablet+ */}
      <div className="hidden sm:grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 px-6 lg:px-8 pb-4">
        <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-brand-gold/10">
              <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-gold" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase">Total</p>
              <p className="text-base sm:text-lg font-bold text-white">{storageStats.totalFiles}</p>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
              <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase">Storage</p>
              <p className="text-base sm:text-lg font-bold text-white">{formatFileSize(storageStats.totalSize)}</p>
            </div>
          </div>
        </div>
        {['video', 'image', 'audio', 'project'].map((cat) => (
          <div key={cat} className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg ${
                cat === 'video' ? 'bg-purple-500/10' :
                cat === 'image' ? 'bg-pink-500/10' :
                cat === 'audio' ? 'bg-green-500/10' : 'bg-orange-500/10'
              }`}>
                {getCategoryIcon(cat as any)}
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase capitalize">{cat}s</p>
                <p className="text-base sm:text-lg font-bold text-white">{storageStats.byCategory[cat]?.count || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Bar - Desktop only */}
      {projects.length > 0 && (
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 px-6 lg:px-8 snap-x snap-mandatory sm:snap-none">
          <span className="text-xs text-gray-500 font-medium mr-2 flex-shrink-0">Projects:</span>
          <button
            onClick={() => setActiveProject(null)}
            className={`px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
              !activeProject ? 'bg-brand-gold text-black' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          {projects.map((project) => (
            <button
              key={project}
              onClick={() => setActiveProject(project)}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
                activeProject === project ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-3 h-3" />
              {project}
              <span className="text-[10px] opacity-60">({storageStats.byProject[project]?.count || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile Filters - Compact single row */}
      <div className="flex-shrink-0 px-3 sm:px-6 lg:px-8 pb-2 sm:pb-4 space-y-2 sm:space-y-3">
        {/* Mobile: Category icons + Search in one row */}
        <div className="flex items-center gap-2">
          {/* Category Tabs - icons only on mobile */}
          <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.03] rounded-lg sm:rounded-xl overflow-x-auto flex-shrink-0 sm:gap-1 sm:p-1">
            {ASSET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center justify-center gap-1.5 p-2.5 sm:px-3 sm:py-2 min-w-[40px] sm:min-w-0 min-h-[40px] sm:min-h-[44px] rounded-md sm:rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-brand-gold text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={activeCategory === cat.id ? '' : cat.color}>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg sm:rounded-xl py-2 sm:py-2.5 min-h-[40px] sm:min-h-[44px] pl-9 sm:pl-10 pr-3 sm:pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30"
            />
          </div>

          {/* Quick filters - compact on mobile */}
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`p-2.5 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
              showOnlyFavorites ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/[0.03] text-gray-400'
            }`}
          >
            <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={fetchAssets}
            className="p-2.5 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center bg-white/[0.03] rounded-lg sm:rounded-xl text-gray-400 active:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Subcategory Filter - only show when applicable */}
        {SUBCATEGORIES[activeCategory] && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide [-webkit-overflow-scrolling:touch]">
            {SUBCATEGORIES[activeCategory].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSubcategory(sub.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 whitespace-nowrap ${
                  activeSubcategory === sub.id
                    ? 'bg-white/15 text-white'
                    : 'bg-white/5 text-gray-500 active:bg-white/10'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Desktop-only extra controls */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => setShowOnlyMine(!showOnlyMine)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              showOnlyMine ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' : 'bg-white/[0.03] text-gray-400 border border-white/[0.06]'
            }`}
          >
            <User className="w-4 h-4" /> My Files
          </button>
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Assets Display - Full height scroll on mobile */}
      <div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-3 sm:px-6 lg:px-8 pb-3 sm:pb-6">
        {loading && assets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading media library...</p>
            </div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4">
            <div className="text-center">
              <Cloud className="w-12 sm:w-16 h-12 sm:h-16 text-green-400/30 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                {assets.length === 0 ? 'Start Your Media Library' : 'No matching files'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md">
                {assets.length === 0
                  ? 'Upload your production files to Wasabi cloud storage with AI-powered organization'
                  : 'Try adjusting your filters or search query'}
              </p>
              {assets.length === 0 && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-5 sm:px-6 py-3 min-h-[44px] bg-brand-gold text-black font-semibold rounded-xl"
                >
                  Upload First Files
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onClick={() => setSelectedAsset(asset)}
                onToggleFavorite={() => handleToggleFavorite(asset.id)}
                onPlay={() => handlePlayMedia(asset)}
                onEdit={() => handleEditAsset(asset)}
                onDelete={() => handleDelete(asset)}
                onAiEdit={() => handleAiEdit(asset)}
                onMetadataEdit={() => handleMetadataEdit(asset)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAssets.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                onClick={() => setSelectedAsset(asset)}
                onToggleFavorite={() => handleToggleFavorite(asset.id)}
                onDelete={() => handleDelete(asset)}
                onPlay={() => handlePlayMedia(asset)}
                onEdit={() => handleEditAsset(asset)}
                onAiEdit={() => handleAiEdit(asset)}
                onMetadataEdit={() => handleMetadataEdit(asset)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && (
        <VideoPlayer
          videos={filteredAssets.filter(a => a.category === 'video').map(convertToAsset)}
          initialVideo={videoPlayerAsset ? convertToAsset(videoPlayerAsset) : undefined}
          onClose={() => {
            setShowVideoPlayer(false);
            setVideoPlayerAsset(null);
          }}
        />
      )}

      {/* Media Editor Modal */}
      {showMediaEditor && editorAsset && (
        <MediaEditor
          asset={convertToAsset(editorAsset)}
          onClose={() => {
            setShowMediaEditor(false);
            setEditorAsset(null);
          }}
          onSave={handleEditorSave}
        />
      )}

      {/* Metadata Editor Modal */}
      {showMetadataEditor && metadataEditAsset && (
        <MetadataEditor
          asset={convertToAsset(metadataEditAsset)}
          onClose={() => {
            setShowMetadataEditor(false);
            setMetadataEditAsset(null);
          }}
          onSave={handleMetadataSave}
        />
      )}

      {/* Music Player - Shows when user plays audio (not autoplay) */}
      {showMusicPlayer && currentAudioAsset && (
        <MusicPlayer
          libraryAssets={assets.filter(a => a.category === 'audio').map(convertToAsset)}
          currentAsset={convertToAsset(currentAudioAsset)}
          onClose={() => {
            setShowMusicPlayer(false);
            setCurrentAudioAsset(null);
          }}
          onTrackChange={(asset) => {
            if (asset) {
              const evAsset = assets.find(a => a.id === asset.id);
              if (evAsset) setCurrentAudioAsset(evAsset);
            }
          }}
          minimized={true}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && currentUser && (
        <FileUpload
          userId={currentUser.id}
          userName={currentUser.name}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onToggleFavorite={() => handleToggleFavorite(selectedAsset.id)}
          onToggleShare={() => handleToggleShare(selectedAsset.id)}
          onToggleClientVisible={() => handleToggleClientVisible(selectedAsset.id)}
          onDelete={() => handleDelete(selectedAsset)}
          onAiEdit={() => { setSelectedAsset(null); handleAiEdit(selectedAsset); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteAsset && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => setDeleteAsset(null)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Delete Asset</h3>
                <p className="text-xs sm:text-sm text-gray-500">This will remove it from Wasabi storage</p>
              </div>
            </div>

            <div className="bg-white/[0.03] rounded-xl p-3 sm:p-4 mb-5 sm:mb-6">
              <div className="flex items-center gap-3">
                {deleteAsset.category === 'image' && (deleteAsset.thumbnailUrl || deleteAsset.url) ? (
                  <img src={deleteAsset.thumbnailUrl || deleteAsset.url} alt={deleteAsset.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(deleteAsset.category)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{deleteAsset.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(deleteAsset.fileSize)} • {deleteAsset.category}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteAsset(null)}
                className="flex-1 px-4 py-3 min-h-[48px] bg-white/5 text-white font-medium text-sm rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 min-h-[48px] bg-red-500 text-white font-medium text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      {aiEditAsset && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => { setAiEditAsset(null); setAiEditResult(null); }}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[90vh] sm:max-w-2xl w-full overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">AI Image Editor</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Transform your images with AI</p>
                </div>
              </div>
              <button
                onClick={() => { setAiEditAsset(null); setAiEditResult(null); }}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Image Preview */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Original</p>
                  <div className="aspect-square bg-white/[0.03] rounded-xl overflow-hidden border border-white/10">
                    <img src={aiEditAsset.thumbnailUrl || aiEditAsset.url} alt={aiEditAsset.name} className="w-full h-full object-contain" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Result</p>
                  <div className="aspect-square bg-white/[0.03] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
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
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-brand-gold/50"
                  rows={3}
                />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                {["Remove background", "Enhance colors", "Add vintage filter", "Sharpen image", "Convert to B&W"].map(action => (
                  <button
                    key={action}
                    onClick={() => setAiEditPrompt(action)}
                    className="px-3 py-2 min-h-[40px] bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white hover:border-brand-gold/30 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => { setAiEditAsset(null); setAiEditResult(null); }}
                  className="px-4 py-3 min-h-[48px] bg-white/5 text-white font-medium text-sm rounded-xl hover:bg-white/10 transition-colors order-3 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  onClick={performAiEdit}
                  disabled={!aiEditPrompt.trim() || isAiEditing}
                  className="flex-1 px-4 py-3 min-h-[48px] bg-brand-gold text-black font-medium text-sm rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
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
                    className="px-4 py-3 min-h-[48px] bg-green-500 text-white font-medium text-sm rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 order-2 sm:order-3"
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

// Asset Card Component - Mobile-optimized with large touch targets
const AssetCard: React.FC<{
  asset: ElevenViewsAsset;
  onClick: () => void;
  onToggleFavorite: () => void;
  onPlay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAiEdit?: () => void;
  onMetadataEdit?: () => void;
}> = ({ asset, onClick, onToggleFavorite, onPlay, onEdit, onDelete, onAiEdit, onMetadataEdit }) => {
  const isVisual = asset.category === 'image' || asset.category === 'video';
  const canEdit = asset.category === 'image' || asset.category === 'video';
  const canPlay = asset.category === 'video' || asset.category === 'audio';
  const canAiEdit = asset.category === 'image';
  const canMetadataEdit = true; // All files can have metadata edited

  // Get A&R metadata for audio files
  const arMetadata = asset.category === 'audio' ? arService.getMetadata(asset.key) : null;

  return (
    <div
      className="group bg-white/[0.02] rounded-xl sm:rounded-2xl border border-white/[0.06] overflow-hidden hover:border-brand-gold/20 transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
      onClick={onClick}
    >
      <div className="aspect-square relative bg-black/20 overflow-hidden">
        {isVisual && (asset.thumbnailUrl || asset.url) ? (
          <>
            <img
              src={asset.thumbnailUrl || asset.url}
              alt={asset.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {/* Play button - always visible on mobile for video/audio */}
            {asset.category === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 sm:bg-black/30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-gold/90 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-black ml-0.5" />
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {/* Audio play button - large touch target */}
            {asset.category === 'audio' && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
                className="w-16 h-16 sm:w-14 sm:h-14 rounded-full bg-green-500/20 flex items-center justify-center active:scale-95 transition-transform"
              >
                <Music className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
              </button>
            )}
            {asset.category === 'document' && <FileText className="w-10 h-10 text-blue-400/50" />}
            {asset.category === 'project' && <FolderOpen className="w-10 h-10 text-orange-400/50" />}
            {asset.category === 'other' && <File className="w-10 h-10 text-gray-600" />}
            {asset.category === 'image' && <Image className="w-10 h-10 text-pink-400/50" />}
            {asset.category === 'video' && <Video className="w-10 h-10 text-purple-400/50" />}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex gap-1">
          {asset.projectName && (
            <div className="px-1.5 sm:px-2 py-0.5 bg-purple-500/80 backdrop-blur rounded text-[8px] sm:text-[9px] font-semibold text-white">
              {asset.projectName}
            </div>
          )}
        </div>

        {/* Top Right Actions - Always visible on mobile, hover on desktop */}
        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Info/More button on mobile - opens detail modal */}
          <button
            onClick={(e) => { e.stopPropagation(); onMetadataEdit?.(); }}
            className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 rounded-lg bg-black/60 sm:bg-black/40 text-white/90 sm:text-white/80 hover:bg-blue-500/80 hover:text-white transition-all flex items-center justify-center"
            title="Edit Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Right - Favorite (always visible) */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 p-2 sm:p-1.5 min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 rounded-lg transition-all flex items-center justify-center ${
            asset.isFavorite
              ? 'bg-yellow-500/30 text-yellow-500'
              : 'bg-black/60 sm:bg-black/40 text-white/70 sm:text-white/60 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Type Badge */}
        <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 px-1.5 sm:px-2 py-0.5 bg-black/70 sm:bg-black/60 backdrop-blur rounded text-[8px] sm:text-[9px] font-semibold text-white uppercase">
          {asset.subcategory || asset.category}
        </div>
      </div>

      {/* Card Info */}
      <div className="p-2 sm:p-3">
        <p className="text-xs sm:text-sm font-medium text-white truncate">{asset.name}</p>
        <div className="flex items-center justify-between mt-0.5 sm:mt-1">
          <span className="text-[10px] sm:text-xs text-gray-500">{formatFileSize(asset.fileSize)}</span>
          <div className="flex items-center gap-1">
            {/* A&R Status for audio files */}
            {arMetadata && (
              <>
                {arMetadata.ratings.overall > 0 && (
                  <span className="text-[9px] sm:text-[10px] text-brand-gold font-medium">{arMetadata.ratings.overall}</span>
                )}
                <span className={`text-[9px] sm:text-[10px] px-1 rounded ${AR_STATUS_CONFIG[arMetadata.status].bg} ${AR_STATUS_CONFIG[arMetadata.status].color}`}>
                  {AR_STATUS_CONFIG[arMetadata.status].label}
                </span>
              </>
            )}
            {asset.aiTags && asset.aiTags.length > 0 && (
              <Sparkles className="w-3 h-3 text-brand-gold" />
            )}
            {asset.isShared && <Share2 className="w-3 h-3 text-green-500" />}
            {asset.isClientVisible && <Users className="w-3 h-3 text-blue-400" />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Asset Row Component
const AssetRow: React.FC<{
  asset: ElevenViewsAsset;
  onClick: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onPlay?: () => void;
  onEdit?: () => void;
  onAiEdit?: () => void;
  onMetadataEdit?: () => void;
}> = ({ asset, onClick, onToggleFavorite, onDelete, onPlay, onEdit, onAiEdit, onMetadataEdit }) => {
  const canEdit = asset.category === 'image' || asset.category === 'video';
  const canPlay = asset.category === 'video' || asset.category === 'audio';
  const canAiEdit = asset.category === 'image';

  // Get A&R metadata for audio files
  const arMetadata = asset.category === 'audio' ? arService.getMetadata(asset.key) : null;

  const getCategoryIcon = (category: ElevenViewsAsset['category']) => {
    switch (category) {
      case 'video': return <Video className="w-5 h-5 text-purple-400" />;
      case 'image': return <Image className="w-5 h-5 text-pink-400" />;
      case 'audio': return <Music className="w-5 h-5 text-green-400" />;
      case 'document': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'project': return <FolderOpen className="w-5 h-5 text-orange-400" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-brand-gold/20 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
        {getCategoryIcon(asset.category)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{asset.name}</p>
          {asset.subcategory && (
            <span className="px-2 py-0.5 bg-white/10 text-gray-400 text-[10px] rounded uppercase">
              {asset.subcategory}
            </span>
          )}
          {asset.projectName && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded">
              {asset.projectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
          <span>{formatFileSize(asset.fileSize)}</span>
          <span className="capitalize">{asset.category}</span>
          <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* A&R Status for audio */}
      {arMetadata && (
        <div className="hidden md:flex items-center gap-2">
          {arMetadata.ratings.overall > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-brand-gold fill-current" />
              <span className="text-xs text-brand-gold font-medium">{arMetadata.ratings.overall}</span>
            </div>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${AR_STATUS_CONFIG[arMetadata.status].bg} ${AR_STATUS_CONFIG[arMetadata.status].color}`}>
            {AR_STATUS_CONFIG[arMetadata.status].label}
          </span>
        </div>
      )}

      {/* AI Tags */}
      {asset.aiTags && asset.aiTags.length > 0 && !arMetadata && (
        <div className="hidden md:flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-brand-gold" />
          {asset.aiTags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[10px] rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Play Button */}
        {canPlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
            className="p-2 text-gray-500 hover:text-green-400 rounded-lg transition-colors"
            title="Play"
          >
            <Play className="w-4 h-4" />
          </button>
        )}
        {/* AI Edit Button - for images */}
        {canAiEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onAiEdit?.(); }}
            className="p-2 text-brand-gold hover:bg-brand-gold/10 rounded-lg transition-colors"
            title="AI Edit"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        )}
        {/* Media Editor Button */}
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-2 text-gray-500 hover:text-purple-400 rounded-lg transition-colors"
            title="Edit Media"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
        {/* Metadata/Info Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onMetadataEdit?.(); }}
          className="p-2 text-gray-500 hover:text-blue-400 rounded-lg transition-colors"
          title="Edit Info"
        >
          <Info className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`p-2 rounded-lg transition-colors ${
            asset.isFavorite ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'
          }`}
        >
          <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
        </button>
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-gray-500 hover:text-blue-400 rounded-lg transition-colors"
          title="View File"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Asset Detail Modal
const AssetDetailModal: React.FC<{
  asset: ElevenViewsAsset;
  onClose: () => void;
  onToggleFavorite: () => void;
  onToggleShare: () => void;
  onToggleClientVisible: () => void;
  onDelete: () => void;
  onAiEdit?: () => void;
}> = ({ asset, onClose, onToggleFavorite, onToggleShare, onToggleClientVisible, onDelete, onAiEdit }) => {
  const canAiEdit = asset.category === 'image';
  const [copying, setCopying] = useState(false);

  // Media playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const copyUrl = async () => {
    if (asset.sharedLink) {
      setCopying(true);
      await navigator.clipboard.writeText(asset.sharedLink);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  // Media control handlers
  const handlePlayPause = () => {
    if (asset.category === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    } else if (asset.category === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 flex-shrink-0">
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{asset.name}</h3>
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
                <span>{formatFileSize(asset.fileSize)}</span>
                <span>•</span>
                <span className="capitalize">{asset.category}</span>
                {asset.projectName && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-purple-400">{asset.projectName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-white/5 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Preview */}
          <div className="mb-4 sm:mb-6">
            {/* Image Preview - Show actual image */}
            {asset.category === 'image' && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50">
                <img
                  src={asset.url || asset.thumbnailUrl}
                  alt={asset.name}
                  className="w-full h-auto max-h-[50vh] object-contain mx-auto"
                />
              </div>
            )}

            {/* Video Preview - Full player */}
            {asset.category === 'video' && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={asset.url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleMediaEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
                {/* Video Controls */}
                <div className="px-4 py-3 bg-white/[0.03] border-t border-white/10">
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-500 w-10 text-right font-mono">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1">
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
                          [&::-webkit-slider-thumb]:bg-purple-500
                          [&::-webkit-slider-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 font-mono">
                      {formatTime(duration)}
                    </span>
                  </div>
                  {/* Playback Controls */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePlayPause}
                      className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center hover:bg-purple-600 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </button>
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
              </div>
            )}

            {/* Audio Preview - Full player with waveform */}
            {asset.category === 'audio' && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50">
                <div className="p-8">
                  {/* Audio Visualization */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 flex items-center justify-center mb-4">
                      <Music className="w-16 h-16 text-green-400" />
                    </div>
                    <h4 className="text-white font-medium text-lg">{asset.name}</h4>
                    <p className="text-sm text-gray-500">{asset.fileName}</p>
                  </div>
                  {/* Audio Element (hidden) */}
                  <audio
                    ref={audioRef}
                    src={asset.url}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={handleMediaEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Waveform visualization */}
                  <div className="flex items-end justify-center gap-1 h-16 mb-4">
                    {[...Array(40)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          isPlaying ? "bg-green-400" : "bg-gray-600"
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
                {/* Audio Controls */}
                <div className="px-6 py-4 bg-white/[0.03] border-t border-white/10">
                  {/* Progress Bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-500 w-10 text-right font-mono">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1">
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
                          [&::-webkit-slider-thumb]:bg-green-500
                          [&::-webkit-slider-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #22c55e 0%, #22c55e ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 font-mono">
                      {formatTime(duration)}
                    </span>
                  </div>
                  {/* Playback Controls */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePlayPause}
                      className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      )}
                    </button>
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
              </div>
            )}

            {/* Document/Other Preview */}
            {!['image', 'video', 'audio'].includes(asset.category) && (
              <div className="p-12 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Preview</p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
                >
                  <ExternalLink className="w-4 h-4" /> View File
                </a>
              </div>
            )}
          </div>

          {/* Shared Link */}
          {asset.sharedLink && (
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                Share Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={asset.sharedLink}
                  readOnly
                  className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-400 font-mono"
                />
                <button
                  onClick={copyUrl}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10"
                >
                  {copying ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* AI Tags */}
          {asset.aiTags && asset.aiTags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand-gold" />
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  AI-Generated Tags
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {asset.aiTags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-brand-gold/10 text-brand-gold text-sm rounded-lg">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Manual Tags */}
          {asset.tags.filter(t => !asset.aiTags?.includes(t)).length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Custom Tags
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {asset.tags.filter(t => !asset.aiTags?.includes(t)).map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-white/5 text-gray-300 text-sm rounded-lg">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-white/[0.02] rounded-xl">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">File Name</p>
              <p className="text-xs sm:text-sm text-white truncate">{asset.fileName}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/[0.02] rounded-xl">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Location</p>
              <p className="text-xs sm:text-sm text-white truncate">{asset.metadata?.folderPath || 'Eleven Views'}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/[0.02] rounded-xl">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Uploaded By</p>
              <p className="text-xs sm:text-sm text-white">{asset.uploadedByName}</p>
            </div>
            <div className="p-3 sm:p-4 bg-white/[0.02] rounded-xl">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Upload Date</p>
              <p className="text-xs sm:text-sm text-white">{new Date(asset.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-5 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
          {/* Mobile: Stack vertically, Desktop: horizontal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Toggle buttons row */}
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <button
                onClick={onToggleFavorite}
                className={`flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-2 min-h-[44px] min-w-[44px] rounded-xl transition-colors ${
                  asset.isFavorite
                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    : 'bg-white/5 text-gray-400 hover:text-yellow-500'
                }`}
              >
                <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={onToggleShare}
                className={`flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-2 min-h-[44px] min-w-[44px] rounded-xl transition-colors ${
                  asset.isShared
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-white/5 text-gray-400 hover:text-green-500'
                }`}
                title="Team sharing"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleClientVisible}
                className={`flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-2 min-h-[44px] rounded-xl transition-colors ${
                  asset.isClientVisible
                    ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    : 'bg-white/5 text-gray-400 hover:text-blue-500'
                }`}
                title="Client visibility"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{asset.isClientVisible ? 'Client Visible' : 'Internal'}</span>
              </button>
            </div>
            {/* Action buttons row */}
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              {/* AI Edit Button */}
              {canAiEdit && (
                <button
                  onClick={onAiEdit}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-brand-gold text-black rounded-xl hover:bg-brand-gold/90 text-sm"
                >
                  <Wand2 className="w-4 h-4" /> <span className="hidden sm:inline">AI Edit</span>
                </button>
              )}
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm"
              >
                <ExternalLink className="w-4 h-4" /> <span className="hidden sm:inline">View</span>
              </a>
              {asset.downloadUrl && (
                <a
                  href={asset.downloadUrl}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 min-h-[44px] bg-white/5 text-white rounded-xl hover:bg-white/10 text-sm"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              )}
              <button
                onClick={onDelete}
                className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsModule;
