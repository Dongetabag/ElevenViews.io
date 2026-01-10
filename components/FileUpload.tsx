// Smart File Upload Component with Wasabi Integration
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, CheckCircle, AlertCircle, Loader2,
  Image, Video, Music, FileText, File, Cloud, Trash2,
  Folder, FolderPlus, Users, Tag, Sparkles, HardDrive,
  Zap, ArrowRight, TrendingDown, Settings2, ImageIcon
} from 'lucide-react';
import { wasabiService, ElevenViewsAsset, formatFileSize, detectFileCategory, generateSmartTags } from '../services/wasabiService';
import { optimizeImage, shouldOptimize, OptimizationResult, formatBytes, generateVideoThumbnail } from '../services/mediaOptimizer';

interface FileUploadProps {
  userId: string;
  userName: string;
  projectName?: string;
  clientName?: string;
  onUploadComplete?: (assets: ElevenViewsAsset[]) => void;
  onClose?: () => void;
  maxFiles?: number;
  maxFileSize?: number;
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'queued' | 'optimizing' | 'uploading' | 'complete' | 'error';
  progress: number;
  error?: string;
  asset?: ElevenViewsAsset;
  category?: string;
  subcategory?: string;
  aiTags?: string[];
  // Optimization fields
  shouldOptimize?: boolean;
  optimizationReason?: string;
  optimizedBlob?: Blob;
  optimizedSize?: number;
  savedBytes?: number;
  savedPercent?: number;
  thumbnailUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  userId,
  userName,
  projectName: initialProject,
  clientName: initialClient,
  onUploadComplete,
  onClose,
  maxFiles = 50,
  maxFileSize = 5 * 1024 * 1024 * 1024, // 5GB per file with Wasabi
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [tags, setTags] = useState('');
  const [projectName, setProjectName] = useState(initialProject || '');
  const [clientName, setClientName] = useState(initialClient || '');
  const [organizationType, setOrganizationType] = useState<'auto' | 'project' | 'client'>('auto');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [optimizationStats, setOptimizationStats] = useState<{
    totalOriginal: number;
    totalOptimized: number;
    totalSaved: number;
    filesOptimized: number;
  }>({ totalOriginal: 0, totalOptimized: 0, totalSaved: 0, filesOptimized: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const getFileIcon = (type: string, category?: string) => {
    const cat = category || detectFileCategory('', type).category;
    switch (cat) {
      case 'image': return <Image className="w-5 h-5 text-pink-400" />;
      case 'video': return <Video className="w-5 h-5 text-purple-400" />;
      case 'audio': return <Music className="w-5 h-5 text-green-400" />;
      case 'document': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'project': return <Folder className="w-5 h-5 text-orange-400" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File too large. Max size is ${formatFileSize(maxFileSize)}`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    const queuedFiles: QueuedFile[] = filesToAdd.map((file) => {
      const error = validateFile(file);
      const { category, subcategory } = detectFileCategory(file.name, file.type);
      const aiTags = generateSmartTags(file.name, category);
      const optimizationCheck = shouldOptimize(file);

      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: error ? 'error' : 'queued',
        progress: 0,
        error,
        category,
        subcategory,
        aiTags,
        shouldOptimize: optimizationCheck.shouldOptimize,
        optimizationReason: optimizationCheck.reason,
      };
    });

    setFiles((prev) => [...prev, ...queuedFiles]);
  }, [files.length, maxFiles, maxFileSize]);

  // Run optimization on files
  const runOptimization = async () => {
    const filesToOptimize = files.filter(f => f.status === 'queued' && f.shouldOptimize && f.file.type.startsWith('image/'));
    if (filesToOptimize.length === 0) return;

    setIsOptimizing(true);
    let totalOriginal = 0;
    let totalOptimized = 0;
    let filesOptimized = 0;

    for (const qf of filesToOptimize) {
      setFiles(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'optimizing' } : f));

      try {
        const result = await optimizeImage(qf.file);
        if (result.success && result.optimizedBlob) {
          totalOriginal += result.originalSize;
          totalOptimized += result.optimizedSize || result.originalSize;
          filesOptimized++;

          setFiles(prev => prev.map(f => f.id === qf.id ? {
            ...f,
            status: 'queued',
            optimizedBlob: result.optimizedBlob,
            optimizedSize: result.optimizedSize,
            savedBytes: result.savedBytes,
            savedPercent: result.savedPercent,
            thumbnailUrl: result.thumbnailUrl,
          } : f));
        } else {
          setFiles(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'queued' } : f));
        }
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'queued' } : f));
      }
    }

    // Generate video thumbnails
    const videosToProcess = files.filter(f => f.status === 'queued' && f.file.type.startsWith('video/'));
    for (const qf of videosToProcess) {
      try {
        const { thumbnailUrl } = await generateVideoThumbnail(qf.file);
        setFiles(prev => prev.map(f => f.id === qf.id ? { ...f, thumbnailUrl } : f));
      } catch (err) {
        // Video thumbnail generation failed, continue without it
      }
    }

    setOptimizationStats({
      totalOriginal,
      totalOptimized,
      totalSaved: totalOriginal - totalOptimized,
      filesOptimized,
    });
    setIsOptimizing(false);
  };

  // Auto-run optimization when files are added
  useEffect(() => {
    if (enableOptimization && files.some(f => f.status === 'queued' && f.shouldOptimize && !f.optimizedBlob)) {
      runOptimization();
    }
  }, [files.length, enableOptimization]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status === 'queued');
    if (validFiles.length === 0) return;

    setIsUploading(true);
    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const completedAssets: ElevenViewsAsset[] = [];

    for (const queuedFile of validFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === queuedFile.id ? { ...f, status: 'uploading', progress: 10 } : f
        )
      );

      try {
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === queuedFile.id && f.status === 'uploading' && f.progress < 90
                ? { ...f, progress: f.progress + 15 }
                : f
            )
          );
        }, 300);

        // Use optimized file if available, otherwise use original
        let fileToUpload: File | Blob = queuedFile.file;
        let fileName = queuedFile.file.name;

        if (enableOptimization && queuedFile.optimizedBlob) {
          // Convert blob to File with proper name (change extension to webp for optimized images)
          const newExt = queuedFile.file.type.startsWith('image/') ? '.webp' : '';
          const baseName = fileName.replace(/\.[^/.]+$/, '');
          fileName = baseName + (newExt || '.' + fileName.split('.').pop());
          fileToUpload = new File([queuedFile.optimizedBlob], fileName, {
            type: queuedFile.optimizedBlob.type
          });
        }

        const asset = await wasabiService.uploadViaMCP(fileToUpload as File, {
          projectName: organizationType === 'project' ? projectName : undefined,
          clientName: organizationType === 'client' ? clientName : undefined,
          tags: tagArray,
          userId,
          userName,
        });

        clearInterval(progressInterval);

        if (asset) {
          // Add optimization metadata and thumbnail
          if (queuedFile.thumbnailUrl) {
            asset.thumbnailUrl = queuedFile.thumbnailUrl;
          }
          if (queuedFile.subcategory) {
            asset.subcategory = queuedFile.subcategory;
          }
          if (queuedFile.optimizedBlob) {
            asset.metadata = {
              ...asset.metadata,
              isOptimized: true,
              originalSize: queuedFile.file.size,
              optimizedSize: queuedFile.optimizedSize,
              savedBytes: queuedFile.savedBytes,
            };
          }

          completedAssets.push(asset);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === queuedFile.id
                ? { ...f, status: 'complete', progress: 100, asset }
                : f
            )
          );
        } else {
          throw new Error('Upload failed');
        }
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id
              ? { ...f, status: 'error', error: error.message || 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    if (completedAssets.length > 0 && onUploadComplete) {
      onUploadComplete(completedAssets);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const validFilesCount = files.filter((f) => f.status === 'queued').length;
  const completedCount = files.filter((f) => f.status === 'complete').length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10">
              <HardDrive className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Smart Upload to Wasabi</h3>
              <p className="text-xs text-gray-500">1TB storage • No egress fees • S3-compatible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Organization Options */}
        <div className="p-5 border-b border-white/[0.06] bg-white/[0.02]">
          <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
            File Organization
          </label>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              onClick={() => setOrganizationType('auto')}
              className={`p-3 rounded-xl border transition-all text-left ${
                organizationType === 'auto'
                  ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold'
                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/20'
              }`}
            >
              <Sparkles className="w-5 h-5 mb-2" />
              <p className="text-sm font-medium">Auto-Organize</p>
              <p className="text-[10px] text-gray-500 mt-0.5">AI sorts by file type</p>
            </button>
            <button
              onClick={() => setOrganizationType('project')}
              className={`p-3 rounded-xl border transition-all text-left ${
                organizationType === 'project'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/20'
              }`}
            >
              <FolderPlus className="w-5 h-5 mb-2" />
              <p className="text-sm font-medium">By Project</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Group under production</p>
            </button>
            <button
              onClick={() => setOrganizationType('client')}
              className={`p-3 rounded-xl border transition-all text-left ${
                organizationType === 'client'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:border-white/20'
              }`}
            >
              <Users className="w-5 h-5 mb-2" />
              <p className="text-sm font-medium">By Client</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Organize for sharing</p>
            </button>
          </div>

          {/* Conditional inputs */}
          {organizationType === 'project' && (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name (e.g., Music Video 2026)"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
            />
          )}
          {organizationType === 'client' && (
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name (e.g., Atlantic Records)"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:border-green-500/50 focus:outline-none"
            />
          )}
        </div>

        {/* Optimization Toggle */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Smart Optimization</p>
                <p className="text-xs text-gray-500">Auto-compress images to WebP, save storage</p>
              </div>
            </div>
            <button
              onClick={() => setEnableOptimization(!enableOptimization)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                enableOptimization ? 'bg-blue-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  enableOptimization ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Optimization Stats */}
          {optimizationStats.filesOptimized > 0 && (
            <div className="mt-3 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  Saved {formatBytes(optimizationStats.totalSaved)}
                </span>
                <span className="text-xs text-gray-500">
                  ({Math.round((optimizationStats.totalSaved / optimizationStats.totalOriginal) * 100)}% reduction)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{formatBytes(optimizationStats.totalOriginal)}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="text-green-400">{formatBytes(optimizationStats.totalOptimized)}</span>
                <span className="text-gray-500">• {optimizationStats.filesOptimized} files optimized</span>
              </div>
            </div>
          )}

          {isOptimizing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Optimizing images...</span>
            </div>
          )}
        </div>

        {/* Drop Zone */}
        <div className="p-5">
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragging
                ? 'border-brand-gold bg-brand-gold/5'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className={`transition-transform ${isDragging ? 'scale-110' : ''}`}>
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-brand-gold' : 'text-gray-600'}`} />
              <p className="text-white font-medium mb-1">
                {isDragging ? 'Drop files here' : 'Drag & drop production files'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                All file types supported • Up to 5GB per file • 1TB storage
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 transition-all"
              >
                <Folder className="w-5 h-5" />
                Browse Files
              </button>
              <p className="text-xs text-gray-600 mt-3">
                or drag files anywhere in this area
              </p>
            </div>
          </div>
        </div>

        {/* Tags Input */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-gray-500" />
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Additional Tags
            </label>
          </div>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="client-review, final-cut, master..."
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:border-brand-gold/50 focus:outline-none"
          />
        </div>

        {/* Upload Action - Shows when files are queued */}
        {files.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
              <div className="text-sm text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{files.length} file{files.length !== 1 ? 's' : ''}</span>
                  <span className="text-gray-600">•</span>
                  <span>{formatFileSize(totalSize)}</span>
                  {completedCount > 0 && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-green-500">{completedCount} uploaded</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFiles([])}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleUpload}
                  disabled={validFilesCount === 0 || isUploading || (organizationType === 'project' && !projectName) || (organizationType === 'client' && !clientName)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      Upload {validFilesCount > 0 ? `(${validFilesCount})` : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto px-5 pb-3 max-h-64">
            <div className="space-y-2">
              {files.map((qf) => (
                <div
                  key={qf.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    qf.status === 'error'
                      ? 'bg-red-500/5 border-red-500/20'
                      : qf.status === 'complete'
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white/5">
                    {getFileIcon(qf.file.type, qf.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{qf.file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(qf.file.size)}</span>
                      {qf.optimizedBlob && (
                        <>
                          <ArrowRight className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">{formatBytes(qf.optimizedSize || 0)}</span>
                          <span className="text-green-500">(-{Math.round(qf.savedPercent || 0)}%)</span>
                        </>
                      )}
                      <span className="text-gray-600">•</span>
                      <span className="capitalize">{qf.subcategory || qf.category}</span>
                      {qf.status === 'uploading' && (
                        <span className="text-brand-gold">{qf.progress}%</span>
                      )}
                      {qf.status === 'optimizing' && (
                        <span className="text-blue-400">Optimizing...</span>
                      )}
                    </div>

                    {/* AI Tags Preview */}
                    {qf.aiTags && qf.aiTags.length > 0 && qf.status === 'queued' && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Sparkles className="w-3 h-3 text-brand-gold" />
                        <div className="flex gap-1 flex-wrap">
                          {qf.aiTags.slice(0, 4).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-brand-gold/10 text-brand-gold text-[9px] rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optimization indicator */}
                    {qf.shouldOptimize && !qf.optimizedBlob && qf.status === 'queued' && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-400">
                        <Zap className="w-3 h-3" />
                        <span>{qf.optimizationReason}</span>
                      </div>
                    )}

                    {qf.status === 'uploading' && (
                      <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-gold transition-all"
                          style={{ width: `${qf.progress}%` }}
                        />
                      </div>
                    )}

                    {qf.status === 'optimizing' && (
                      <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 animate-pulse w-full" />
                      </div>
                    )}

                    {qf.error && (
                      <p className="text-xs text-red-400 mt-1">{qf.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {qf.status === 'optimizing' && (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    )}
                    {qf.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 text-brand-gold animate-spin" />
                    )}
                    {qf.status === 'complete' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {qf.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    {qf.optimizedBlob && qf.status === 'queued' && (
                      <div className="p-1 bg-green-500/10 rounded" title="Optimized">
                        <Zap className="w-3 h-3 text-green-400" />
                      </div>
                    )}
                    {(qf.status === 'queued' || qf.status === 'error') && (
                      <button
                        onClick={() => removeFile(qf.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-gray-400 hover:text-white transition-colors"
            >
              {completedCount > 0 && completedCount === files.length ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
