// Metadata Editor Component - Edit media file metadata
import React, { useState, useEffect } from 'react';
import {
  X, Save, Tag, Music, Clock, FileType, Disc, User,
  Hash, Gauge, Film, Image, Calendar, RefreshCw, Loader2,
  Info, AlertCircle, Check
} from 'lucide-react';
import { Asset, MediaMetadata, AudioSubcategory, VideoSubcategory, ImageSubcategory } from '../types';

interface MetadataEditorProps {
  asset: Asset;
  onClose: () => void;
  onSave: (metadata: Partial<MediaMetadata>, tags: string[]) => void;
}

const SUBCATEGORY_OPTIONS: Record<string, { id: string; label: string }[]> = {
  audio: [
    { id: 'songs', label: 'Songs' },
    { id: 'beats', label: 'Beats' },
    { id: 'stems', label: 'Stems' },
    { id: 'masters', label: 'Masters' },
  ],
  video: [
    { id: 'raw', label: 'Raw Footage' },
    { id: 'edits', label: 'Edits' },
    { id: 'finals', label: 'Finals' },
    { id: 'thumbnails', label: 'Thumbnails' },
  ],
  image: [
    { id: 'photos', label: 'Photos' },
    { id: 'graphics', label: 'Graphics' },
    { id: 'thumbnails', label: 'Thumbnails' },
    { id: 'ai-generated', label: 'AI Generated' },
  ],
};

const MUSICAL_KEYS = [
  'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B',
  'Cm', 'C#m/Dbm', 'Dm', 'D#m/Ebm', 'Em', 'Fm', 'F#m/Gbm', 'Gm', 'G#m/Abm', 'Am', 'A#m/Bbm', 'Bm',
];

const MetadataEditor: React.FC<MetadataEditorProps> = ({ asset, onClose, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [title, setTitle] = useState(asset.name || '');
  const [subcategory, setSubcategory] = useState(asset.subcategory || asset.metadata?.subcategory || '');
  const [tags, setTags] = useState<string[]>(asset.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [artist, setArtist] = useState(asset.metadata?.artist || '');
  const [album, setAlbum] = useState(asset.metadata?.album || '');
  const [bpm, setBpm] = useState<number | undefined>(asset.metadata?.bpm);
  const [musicalKey, setMusicalKey] = useState(asset.metadata?.key || '');
  const [duration, setDuration] = useState<number | undefined>(asset.duration || asset.metadata?.duration);

  // Determine which fields to show based on type
  const isAudio = asset.type === 'audio';
  const isVideo = asset.type === 'video';
  const isImage = asset.type === 'image';

  // Get available subcategories
  const availableSubcategories = SUBCATEGORY_OPTIONS[asset.type] || [];

  // Add tag
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Handle key press in tag input
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulated detection results
      if (isAudio) {
        setBpm(120);
        setMusicalKey('Am');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Failed to auto-detect metadata');
    } finally {
      setIsDetecting(false);
    }
  };

  // Save metadata
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const metadata: Partial<MediaMetadata> = {
        subcategory,
        tags,
        title: title.trim() || asset.name,
      };

      if (isAudio) {
        if (artist) metadata.artist = artist;
        if (album) metadata.album = album;
        if (bpm) metadata.bpm = bpm;
        if (musicalKey) metadata.key = musicalKey;
        // Smart organization: add artist as tag for filtering
        if (artist && !tags.includes(artist.toLowerCase())) {
          metadata.tags = [...tags, artist.toLowerCase()];
        }
      }

      if (duration) metadata.duration = duration;

      onSave(metadata, tags);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      setError('Failed to save metadata');
    } finally {
      setIsSaving(false);
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Edit Metadata</h3>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{asset.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
              <Check className="w-4 h-4 text-green-400" />
              <p className="text-sm text-green-400">Saved successfully!</p>
            </div>
          )}

          {/* Title / Song Name - Prominent for audio */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              {isAudio ? 'Song Title' : isVideo ? 'Video Title' : 'File Name'}
            </label>
            <div className="relative">
              {isAudio && <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
              {isVideo && <Film className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />}
              {isImage && <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isAudio ? 'Enter song title' : 'Enter file name'}
                className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-base placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
              />
            </div>
          </div>

          {/* Category Info */}
          <div className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl">
            <div className="p-2 rounded-lg bg-white/5">
              {isAudio && <Music className="w-5 h-5 text-green-400" />}
              {isVideo && <Film className="w-5 h-5 text-purple-400" />}
              {isImage && <Image className="w-5 h-5 text-pink-400" />}
            </div>
            <div>
              <p className="text-sm text-white capitalize">{asset.type}</p>
              <p className="text-xs text-gray-500">
                {asset.size ? `${(asset.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
              </p>
            </div>
            {duration && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(duration)}</span>
              </div>
            )}
          </div>

          {/* Subcategory */}
          {availableSubcategories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                Subcategory
              </label>
              <div className="grid grid-cols-4 gap-2">
                {availableSubcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSubcategory(sub.id)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      subcategory === sub.id
                        ? 'bg-brand-gold text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-brand-gold/10 text-brand-gold text-sm rounded-lg"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyPress}
                placeholder="Add tag and press Enter"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
              >
                Add
              </button>
            </div>
          </div>

          {/* Audio-specific fields */}
          {isAudio && (
            <>
              {/* Artist & Album */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Artist
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="Artist name"
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Album
                  </label>
                  <div className="relative">
                    <Disc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      placeholder="Album name"
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>
                </div>
              </div>

              {/* BPM & Key */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    BPM
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={bpm || ''}
                      onChange={(e) => setBpm(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g., 120"
                      min={20}
                      max={300}
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Musical Key
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                      value={musicalKey}
                      onChange={(e) => setMusicalKey(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white appearance-none focus:outline-none focus:border-brand-gold/50"
                    >
                      <option value="">Select key</option>
                      {MUSICAL_KEYS.map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Auto-detect button */}
              <button
                onClick={handleAutoDetect}
                disabled={isDetecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
              >
                {isDetecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Auto-detect BPM & Key
                  </>
                )}
              </button>
            </>
          )}

          {/* File info */}
          <div className="p-3 bg-white/[0.02] rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">File Type</span>
              <span className="text-white">{asset.type?.toUpperCase()}</span>
            </div>
            {asset.dimensions && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Dimensions</span>
                <span className="text-white">{asset.dimensions.width} x {asset.dimensions.height}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Created</span>
              <span className="text-white">{new Date(asset.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 disabled:opacity-50 transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditor;
