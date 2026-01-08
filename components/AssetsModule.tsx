import React, { useState } from 'react';
import {
  Folder, File, Image, Video, MoreVertical, Search, Filter,
  Sparkles, FileText, Mail, Share2, BarChart2, Copy, Trash2,
  Download, Eye, Heart, Star, Clock, User, Plus, X, Check
} from 'lucide-react';
import { useAIAssets, useCurrentUser, useTeam } from '../hooks/useAppStore';
import { AIAsset } from '../services/appStore';

const ASSET_TYPES = [
  { id: 'all', label: 'All Assets', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'image', label: 'Images', icon: <Image className="w-4 h-4" /> },
  { id: 'copy', label: 'Copy', icon: <FileText className="w-4 h-4" /> },
  { id: 'email', label: 'Emails', icon: <Mail className="w-4 h-4" /> },
  { id: 'social', label: 'Social', icon: <Share2 className="w-4 h-4" /> },
  { id: 'strategy', label: 'Strategy', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'report', label: 'Reports', icon: <File className="w-4 h-4" /> }
];

const AssetsModule: React.FC = () => {
  const { assets, saveAsset, updateAsset, deleteAsset } = useAIAssets();
  const { user: currentUser } = useCurrentUser();
  const { users } = useTeam();

  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [showOnlyShared, setShowOnlyShared] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AIAsset | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    if (activeType !== 'all' && asset.type !== activeType) return false;
    if (showOnlyMine && asset.createdBy !== currentUser?.id) return false;
    if (showOnlyShared && !asset.isShared) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !asset.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: assets.length,
    mine: assets.filter(a => a.createdBy === currentUser?.id).length,
    shared: assets.filter(a => a.isShared).length,
    favorites: assets.filter(a => a.isFavorite).length
  };

  const handleToggleFavorite = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      updateAsset(assetId, { isFavorite: !asset.isFavorite });
    }
  };

  const handleToggleShare = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      updateAsset(assetId, { isShared: !asset.isShared });
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'copy': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'email': return <Mail className="w-5 h-5 text-green-400" />;
      case 'social': return <Share2 className="w-5 h-5 text-purple-400" />;
      case 'strategy': return <BarChart2 className="w-5 h-5 text-orange-400" />;
      case 'report': return <File className="w-5 h-5 text-red-400" />;
      case 'image': return <Image className="w-5 h-5 text-pink-400" />;
      default: return <Sparkles className="w-5 h-5 text-brand-gold" />;
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fadeIn h-full flex flex-col bg-[#050505]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">AI Asset Library</h2>
          <p className="text-sm text-gray-500">All AI-generated content from your team</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-xl hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" /> Save New Asset
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => { setShowOnlyMine(false); setShowOnlyShared(false); }}
          className={`p-4 rounded-xl border transition-all text-left ${!showOnlyMine && !showOnlyShared ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest ${!showOnlyMine && !showOnlyShared ? 'text-brand-gold' : 'text-gray-500'}`}>All Assets</p>
          <p className="text-xl font-bold text-white mt-1">{stats.total}</p>
        </button>
        <button
          onClick={() => { setShowOnlyMine(true); setShowOnlyShared(false); }}
          className={`p-4 rounded-xl border transition-all text-left ${showOnlyMine ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest ${showOnlyMine ? 'text-brand-gold' : 'text-gray-500'}`}>My Assets</p>
          <p className="text-xl font-bold text-white mt-1">{stats.mine}</p>
        </button>
        <button
          onClick={() => { setShowOnlyShared(true); setShowOnlyMine(false); }}
          className={`p-4 rounded-xl border transition-all text-left ${showOnlyShared ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest ${showOnlyShared ? 'text-brand-gold' : 'text-gray-500'}`}>Shared</p>
          <p className="text-xl font-bold text-white mt-1">{stats.shared}</p>
        </button>
        <div className="p-4 rounded-xl border bg-white/5 border-white/5 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Favorites</p>
          <p className="text-xl font-bold text-white mt-1">{stats.favorites}</p>
        </div>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {ASSET_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => setActiveType(type.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeType === type.id
                ? 'bg-brand-gold text-black'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
          />
        </div>
        <span className="text-xs text-gray-500">{filteredAssets.length} assets</span>
      </div>

      {/* Assets Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredAssets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No assets yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                {assets.length === 0
                  ? 'AI-generated content will appear here when you create it using AI Tools'
                  : 'No assets match your current filters'}
              </p>
              {assets.length === 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-brand-gold text-black font-medium rounded-xl"
                >
                  Save First Asset
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map(asset => (
              <div
                key={asset.id}
                className="bg-white/5 rounded-2xl border border-white/5 hover:border-brand-gold/30 transition-all overflow-hidden group"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white/5">
                        {getTypeIcon(asset.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{asset.name}</h4>
                        <p className="text-[10px] text-gray-500 capitalize">{asset.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(asset.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        asset.isFavorite ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Content Preview */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedAsset(asset)}
                >
                  {asset.type === 'image' && asset.content.startsWith('data:image') ? (
                    <div className="aspect-video rounded-lg overflow-hidden bg-black/20">
                      <img src={asset.content} alt={asset.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {asset.content.substring(0, 150)}...
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${asset.createdByName}`}
                      alt={asset.createdByName}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-[10px] text-gray-500">{asset.createdByName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyContent(asset.content)}
                      className="p-1.5 text-gray-600 hover:text-brand-gold rounded-lg transition-colors"
                      title="Copy content"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleShare(asset.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        asset.isShared ? 'text-green-500' : 'text-gray-600 hover:text-green-500'
                      }`}
                      title={asset.isShared ? 'Shared with team' : 'Share with team'}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      className="p-1.5 text-gray-600 hover:text-red-500 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {asset.tags && asset.tags.length > 0 && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1">
                    {asset.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onCopy={handleCopyContent}
          onToggleFavorite={handleToggleFavorite}
          onToggleShare={handleToggleShare}
          onDelete={deleteAsset}
        />
      )}

      {/* Create Asset Modal */}
      {showCreateModal && (
        <CreateAssetModal
          onClose={() => setShowCreateModal(false)}
          onSave={saveAsset}
        />
      )}
    </div>
  );
};

// Asset Detail Modal
const AssetDetailModal: React.FC<{
  asset: AIAsset;
  onClose: () => void;
  onCopy: (content: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleShare: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ asset, onClose, onCopy, onToggleFavorite, onToggleShare, onDelete }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="w-full max-w-2xl max-h-[90vh] bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-gold/10">
            <Sparkles className="w-5 h-5 text-brand-gold" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{asset.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{asset.type} • By {asset.createdByName}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {asset.type === 'image' && asset.content.startsWith('data:image') ? (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-white/10">
              <img src={asset.content} alt={asset.name} className="w-full h-auto" />
            </div>
            {asset.prompt && (
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Generation Prompt</p>
                <p className="text-xs text-gray-400">{asset.prompt}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{asset.content}</p>
            {asset.prompt && (
              <div className="mt-6 p-4 bg-white/5 rounded-xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Original Prompt</p>
                <p className="text-xs text-gray-400">{asset.prompt}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {new Date(asset.createdAt).toLocaleString()}
          {asset.usageCount > 0 && (
            <span className="ml-2">• Used {asset.usageCount} times</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(asset.id)}
            className={`p-2 rounded-lg transition-colors ${
              asset.isFavorite ? 'bg-yellow-500/20 text-yellow-500' : 'bg-white/5 text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star className={`w-4 h-4 ${asset.isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onToggleShare(asset.id)}
            className={`p-2 rounded-lg transition-colors ${
              asset.isShared ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-400 hover:text-green-500'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCopy(asset.content)}
            className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy
          </button>
          <button
            onClick={() => { onDelete(asset.id); onClose(); }}
            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Create Asset Modal
const CreateAssetModal: React.FC<{
  onClose: () => void;
  onSave: (asset: any) => void;
}> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'copy' | 'email' | 'social' | 'strategy' | 'report' | 'other'>('copy');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isShared, setIsShared] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    onSave({
      name,
      type,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isShared
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Save AI Asset</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Asset Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
              placeholder="E.g., Q1 Campaign Headlines"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
            >
              <option value="copy">Copy / Content</option>
              <option value="email">Email</option>
              <option value="social">Social Media</option>
              <option value="strategy">Strategy</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none min-h-[150px] resize-none"
              placeholder="Paste your AI-generated content here..."
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
              placeholder="campaign, headlines, q1..."
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsShared(!isShared)}
              className={`p-2 rounded-lg transition-colors ${
                isShared ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-400'
              }`}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400">
              {isShared ? 'Shared with team' : 'Private'}
            </span>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-brand-gold text-black font-bold rounded-lg hover:bg-brand-gold/90"
            >
              Save Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetsModule;
