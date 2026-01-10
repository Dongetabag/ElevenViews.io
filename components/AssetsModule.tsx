// Media Library with Wasabi Cloud Integration
import React, { useState, useEffect } from 'react';
import {
  Folder, File, Image, Video, Search,
  FileText, Music, Upload, Share2, Trash2,
  Download, Star, User, X, Check, Grid, List,
  HardDrive, Cloud, RefreshCw, ExternalLink, Copy,
  FolderOpen, Users, Link, Eye, Tag, Sparkles,
  Play, Edit3, Wand2, Filter, ChevronDown, Info
} from 'lucide-react';
import { useCurrentUser } from '../hooks/useAppStore';
import { wasabiService, ElevenViewsAsset, formatFileSize } from '../services/wasabiService';
import FileUpload from './FileUpload';
import VideoPlayer from './VideoPlayer';
import MediaEditor from './MediaEditor';
import MusicPlayer from './MusicPlayer';
import { Asset } from '../types';

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
              url: file.url,
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset? This will remove it from the library and Wasabi storage.')) return;
    wasabiService.deleteAssetFromStorage(id);
    setAssets(prev => prev.filter(a => a.id !== id));
    setSelectedAsset(null);
    fetchAssets();
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
    <div className="p-8 space-y-6 animate-fadeIn h-full flex flex-col bg-[#050505]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-500/10">
            <HardDrive className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Media Library</h2>
            <p className="text-sm text-gray-500">Powered by Wasabi • 1TB for $6.99/mo • No egress fees</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Wasabi Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
            wasabiStatus.configured
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <div className={`w-2 h-2 rounded-full ${wasabiStatus.configured ? 'bg-green-500' : 'bg-red-500'}`} />
            {wasabiStatus.configured ? (
              <span>Wasabi Connected</span>
            ) : (
              <span>Not Configured</span>
            )}
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold text-black font-semibold text-sm rounded-xl hover:scale-105 transition-all"
          >
            <Upload className="w-4 h-4" /> Smart Upload
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-gold/10">
              <HardDrive className="w-4 h-4 text-brand-gold" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Total</p>
              <p className="text-lg font-bold text-white">{storageStats.totalFiles}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Cloud className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Storage</p>
              <p className="text-lg font-bold text-white">{formatFileSize(storageStats.totalSize)}</p>
            </div>
          </div>
        </div>
        {['video', 'image', 'audio', 'project'].map((cat) => (
          <div key={cat} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                cat === 'video' ? 'bg-purple-500/10' :
                cat === 'image' ? 'bg-pink-500/10' :
                cat === 'audio' ? 'bg-green-500/10' : 'bg-orange-500/10'
              }`}>
                {getCategoryIcon(cat as any)}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase capitalize">{cat}s</p>
                <p className="text-lg font-bold text-white">{storageStats.byCategory[cat]?.count || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Bar */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs text-gray-500 font-medium mr-2">Projects:</span>
          <button
            onClick={() => setActiveProject(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              !activeProject ? 'bg-brand-gold text-black' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          {projects.map((project) => (
            <button
              key={project}
              onClick={() => setActiveProject(project)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
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

      {/* Filters Row */}
      <div className="flex items-center gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl">
          {ASSET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-brand-gold text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={activeCategory === cat.id ? '' : cat.color}>{cat.icon}</span>
              <span className="hidden lg:inline">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Subcategory Filter */}
        {SUBCATEGORIES[activeCategory] && (
          <div className="flex items-center gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06]">
            {SUBCATEGORIES[activeCategory].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveSubcategory(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeSubcategory === sub.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files, tags, projects..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30"
          />
        </div>

        {/* Filter Buttons */}
        <button
          onClick={() => setShowOnlyMine(!showOnlyMine)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
            showOnlyMine ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20' : 'bg-white/[0.03] text-gray-400 border border-white/[0.06]'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Mine
        </button>
        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
            showOnlyFavorites ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-white/[0.03] text-gray-400 border border-white/[0.06]'
          }`}
        >
          <Star className="w-3.5 h-3.5" /> Favorites
        </button>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={fetchAssets}
          className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-gray-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Assets Display */}
      <div className="flex-1 overflow-y-auto">
        {loading && assets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading media library...</p>
            </div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Cloud className="w-16 h-16 text-green-400/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">
                {assets.length === 0 ? 'Start Your Media Library' : 'No matching files'}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">
                {assets.length === 0
                  ? 'Upload your production files to Wasabi cloud storage with AI-powered organization'
                  : 'Try adjusting your filters or search query'}
              </p>
              {assets.length === 0 && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl"
                >
                  Upload First Files
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onClick={() => setSelectedAsset(asset)}
                onToggleFavorite={() => handleToggleFavorite(asset.id)}
                onPlay={() => handlePlayMedia(asset)}
                onEdit={() => handleEditAsset(asset)}
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
                onDelete={() => handleDelete(asset.id)}
                onPlay={() => handlePlayMedia(asset)}
                onEdit={() => handleEditAsset(asset)}
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

      {/* Music Player - Shows when audio is playing */}
      {showMusicPlayer && (
        <MusicPlayer
          libraryAssets={assets.filter(a => a.category === 'audio').map(convertToAsset)}
          currentAsset={currentAudioAsset ? convertToAsset(currentAudioAsset) : undefined}
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
          onDelete={() => handleDelete(selectedAsset.id)}
        />
      )}
    </div>
  );
};

// Asset Card Component
const AssetCard: React.FC<{
  asset: ElevenViewsAsset;
  onClick: () => void;
  onToggleFavorite: () => void;
  onPlay?: () => void;
  onEdit?: () => void;
}> = ({ asset, onClick, onToggleFavorite, onPlay, onEdit }) => {
  const isVisual = asset.category === 'image' || asset.category === 'video';
  const canEdit = asset.category === 'image' || asset.category === 'video';
  const canPlay = asset.category === 'video' || asset.category === 'audio';

  return (
    <div
      className="group bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden hover:border-brand-gold/20 transition-all cursor-pointer"
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
            {asset.category === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-14 h-14 rounded-full bg-brand-gold/90 flex items-center justify-center hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 text-black ml-1" />
                </div>
              </button>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {asset.category === 'audio' && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
                className="group/play"
              >
                <Music className="w-10 h-10 text-green-400/50 group-hover/play:text-green-400 transition-colors" />
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
        <div className="absolute top-2 left-2 flex gap-1">
          {asset.projectName && (
            <div className="px-2 py-0.5 bg-purple-500/80 backdrop-blur rounded text-[9px] font-semibold text-white">
              {asset.projectName}
            </div>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="absolute top-2 right-2 flex gap-1">
          {/* Edit Button */}
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1.5 rounded-lg bg-black/40 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-purple-500/80 hover:text-white transition-all"
              title="Edit with AI"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
          {/* Favorite */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-1.5 rounded-lg transition-all ${
              asset.isFavorite
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-black/40 text-white/60 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[9px] font-semibold text-white uppercase">
          {asset.subcategory || asset.category}
        </div>

        {/* Client Visible Badge */}
        {asset.isClientVisible && (
          <div className="absolute bottom-2 right-2 p-1 bg-green-500/80 backdrop-blur rounded">
            <Users className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-white truncate">{asset.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{formatFileSize(asset.fileSize)}</span>
          <div className="flex items-center gap-1">
            {asset.aiTags && asset.aiTags.length > 0 && (
              <Sparkles className="w-3 h-3 text-brand-gold" />
            )}
            {asset.isShared && <Share2 className="w-3 h-3 text-green-500" />}
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
}> = ({ asset, onClick, onToggleFavorite, onDelete, onPlay, onEdit }) => {
  const canEdit = asset.category === 'image' || asset.category === 'video';
  const canPlay = asset.category === 'video' || asset.category === 'audio';

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

      {/* AI Tags */}
      {asset.aiTags && asset.aiTags.length > 0 && (
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
        {/* Edit Button */}
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-2 text-gray-500 hover:text-purple-400 rounded-lg transition-colors"
            title="Edit with AI"
          >
            <Wand2 className="w-4 h-4" />
          </button>
        )}
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
}> = ({ asset, onClose, onToggleFavorite, onToggleShare, onToggleClientVisible, onDelete }) => {
  const [copying, setCopying] = useState(false);

  const copyUrl = async () => {
    if (asset.sharedLink) {
      setCopying(true);
      await navigator.clipboard.writeText(asset.sharedLink);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">{asset.name}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatFileSize(asset.fileSize)}</span>
                <span>•</span>
                <span className="capitalize">{asset.category}</span>
                {asset.projectName && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400">{asset.projectName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preview */}
          <div className="mb-6">
            {asset.category === 'image' && asset.previewUrl && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                <img src={asset.previewUrl} alt={asset.name} className="w-full h-auto max-h-[50vh] object-contain" />
              </div>
            )}
            {asset.category === 'video' && (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black text-center p-12">
                <Video className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Video preview available</p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Eye className="w-4 h-4" /> Preview
                </a>
              </div>
            )}
            {asset.category === 'audio' && (
              <div className="p-8 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                <Music className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-white font-medium">{asset.fileName}</p>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Eye className="w-4 h-4" /> Play
                </a>
              </div>
            )}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 mb-1">File Name</p>
              <p className="text-sm text-white truncate">{asset.fileName}</p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Location</p>
              <p className="text-sm text-white truncate">{asset.metadata?.folderPath || 'Eleven Views'}</p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Uploaded By</p>
              <p className="text-sm text-white">{asset.uploadedByName}</p>
            </div>
            <div className="p-4 bg-white/[0.02] rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Upload Date</p>
              <p className="text-sm text-white">{new Date(asset.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFavorite}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                asset.isFavorite
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'bg-white/5 text-gray-400 hover:text-yellow-500'
              }`}
            >
              <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onToggleShare}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                asset.isClientVisible
                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  : 'bg-white/5 text-gray-400 hover:text-blue-500'
              }`}
              title="Client visibility"
            >
              <Users className="w-4 h-4" />
              <span className="text-xs">{asset.isClientVisible ? 'Client Visible' : 'Internal'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
            >
              <ExternalLink className="w-4 h-4" /> View File
            </a>
            {asset.downloadUrl && (
              <a
                href={asset.downloadUrl}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-xl hover:bg-white/10"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
            <button
              onClick={onDelete}
              className="p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsModule;
