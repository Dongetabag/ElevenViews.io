// Media Optimizer Service for Eleven Views
// Handles client-side image optimization and server-side video optimization via MCP

const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

// Optimization settings
export const OPTIMIZATION_SETTINGS = {
  image: {
    maxWidth: 2048,         // Max width for web display
    maxHeight: 2048,        // Max height for web display
    quality: 0.85,          // WebP/JPEG quality (0-1)
    thumbnailSize: 300,     // Thumbnail dimension
    formats: ['webp', 'jpeg'] as const,
    preserveOriginal: true, // Always keep original
  },
  video: {
    qualities: ['1080p', '720p', '480p'] as const,
    formats: ['mp4', 'webm'] as const,
    thumbnailTime: 0.25,    // Extract thumbnail at 25% of duration
    codec: 'h264',          // Default video codec
  },
  audio: {
    webFormat: 'm4a',       // AAC for web
    webBitrate: 192,        // kbps for web
    preserveLossless: true, // Keep WAV/FLAC originals
  }
};

// Optimization result interface
export interface OptimizationResult {
  success: boolean;
  originalFile: File;
  originalSize: number;
  optimizedBlob?: Blob;
  optimizedSize?: number;
  savedBytes?: number;
  savedPercent?: number;
  thumbnail?: Blob;
  thumbnailUrl?: string;
  format?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  error?: string;
}

// Media info interface
export interface MediaInfo {
  width?: number;
  height?: number;
  duration?: number;
  codec?: string;
  bitrate?: number;
  format?: string;
  bpm?: number;
  key?: string;
}

// Canvas-based image optimization (client-side)
export async function optimizeImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): Promise<OptimizationResult> {
  const {
    maxWidth = OPTIMIZATION_SETTINGS.image.maxWidth,
    maxHeight = OPTIMIZATION_SETTINGS.image.maxHeight,
    quality = OPTIMIZATION_SETTINGS.image.quality,
    format = 'webp'
  } = options;

  try {
    // Load image
    const img = await loadImage(file);

    // Calculate new dimensions
    let { width, height } = img;
    const aspectRatio = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    // Round dimensions
    width = Math.round(width);
    height = Math.round(height);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const mimeType = format === 'webp' ? 'image/webp' : format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, mimeType, quality);

    // Generate thumbnail
    const thumbnail = await generateImageThumbnail(img);

    const savedBytes = file.size - blob.size;
    const savedPercent = (savedBytes / file.size) * 100;

    return {
      success: true,
      originalFile: file,
      originalSize: file.size,
      optimizedBlob: blob,
      optimizedSize: blob.size,
      savedBytes,
      savedPercent,
      thumbnail,
      thumbnailUrl: URL.createObjectURL(thumbnail),
      format,
      dimensions: { width, height }
    };
  } catch (error) {
    return {
      success: false,
      originalFile: file,
      originalSize: file.size,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Generate thumbnail from image
async function generateImageThumbnail(img: HTMLImageElement): Promise<Blob> {
  const size = OPTIMIZATION_SETTINGS.image.thumbnailSize;
  const canvas = document.createElement('canvas');

  // Calculate thumbnail dimensions (maintain aspect ratio)
  let width = size;
  let height = size;
  const aspectRatio = img.width / img.height;

  if (aspectRatio > 1) {
    height = size / aspectRatio;
  } else {
    width = size * aspectRatio;
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return canvasToBlob(canvas, 'image/webp', 0.8);
}

// Load image from file
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Convert canvas to blob
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      type,
      quality
    );
  });
}

// Video thumbnail generation (client-side using video element)
export async function generateVideoThumbnail(
  file: File,
  timePercent: number = OPTIMIZATION_SETTINGS.video.thumbnailTime
): Promise<{ thumbnail: Blob; thumbnailUrl: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');

    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.currentTime = duration * timePercent;
    };

    video.onseeked = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0);

      // Scale down for thumbnail
      const thumbCanvas = document.createElement('canvas');
      const size = OPTIMIZATION_SETTINGS.image.thumbnailSize;
      const aspectRatio = video.videoWidth / video.videoHeight;

      let width = size;
      let height = size;
      if (aspectRatio > 1) {
        height = size / aspectRatio;
      } else {
        width = size * aspectRatio;
      }

      thumbCanvas.width = width;
      thumbCanvas.height = height;

      const thumbCtx = thumbCanvas.getContext('2d');
      if (!thumbCtx) {
        reject(new Error('Could not get thumbnail canvas context'));
        return;
      }

      thumbCtx.drawImage(canvas, 0, 0, width, height);

      try {
        const thumbnail = await canvasToBlob(thumbCanvas, 'image/webp', 0.8);
        const thumbnailUrl = URL.createObjectURL(thumbnail);

        URL.revokeObjectURL(video.src);
        resolve({ thumbnail, thumbnailUrl, duration: video.duration });
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

// Server-side video optimization via MCP
export async function optimizeVideo(
  fileKey: string,
  options: {
    quality?: '1080p' | '720p' | '480p';
    format?: 'mp4' | 'webm';
  } = {}
): Promise<{ success: boolean; optimizedKey?: string; error?: string }> {
  try {
    const response = await fetch(`${MCP_URL}/mcp/tools/optimize_video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: fileKey,
        quality: options.quality || '1080p',
        format: options.format || 'mp4'
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    return {
      success: result.success,
      optimizedKey: result.optimizedKey,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to optimize video'
    };
  }
}

// Get media info from MCP server
export async function getMediaInfo(fileKey: string): Promise<MediaInfo | null> {
  try {
    const response = await fetch(`${MCP_URL}/mcp/tools/get_media_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: fileKey })
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.mediaInfo || null;
  } catch {
    return null;
  }
}

// Detect if file needs optimization
export function shouldOptimize(file: File): { shouldOptimize: boolean; reason?: string } {
  const type = file.type;
  const sizeMB = file.size / (1024 * 1024);

  // Images: optimize if larger than 500KB
  if (type.startsWith('image/')) {
    if (sizeMB > 0.5) {
      return { shouldOptimize: true, reason: `Image is ${sizeMB.toFixed(1)}MB, will be optimized` };
    }
    // Also optimize if not already WebP
    if (!type.includes('webp')) {
      return { shouldOptimize: true, reason: 'Converting to WebP for better compression' };
    }
  }

  // Videos: always suggest server-side optimization for web
  if (type.startsWith('video/')) {
    if (sizeMB > 50) {
      return { shouldOptimize: true, reason: `Video is ${sizeMB.toFixed(0)}MB, recommend optimization` };
    }
    return { shouldOptimize: false };
  }

  // Audio: suggest optimization if not already compressed
  if (type.startsWith('audio/')) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['wav', 'aiff', 'flac'].includes(ext || '')) {
      return { shouldOptimize: true, reason: 'Lossless audio will be converted to AAC for web' };
    }
  }

  return { shouldOptimize: false };
}

// Batch optimize multiple images
export async function optimizeImages(
  files: File[],
  onProgress?: (index: number, total: number, result: OptimizationResult) => void
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) {
      results.push({
        success: false,
        originalFile: file,
        originalSize: file.size,
        error: 'Not an image file'
      });
      continue;
    }

    const result = await optimizeImage(file);
    results.push(result);
    onProgress?.(i + 1, files.length, result);
  }

  return results;
}

// Get optimization stats summary
export function getOptimizationSummary(results: OptimizationResult[]): {
  totalOriginal: number;
  totalOptimized: number;
  totalSaved: number;
  averageReduction: number;
  successCount: number;
  failCount: number;
} {
  let totalOriginal = 0;
  let totalOptimized = 0;
  let successCount = 0;
  let failCount = 0;

  results.forEach(r => {
    totalOriginal += r.originalSize;
    if (r.success && r.optimizedSize) {
      totalOptimized += r.optimizedSize;
      successCount++;
    } else {
      totalOptimized += r.originalSize;
      failCount++;
    }
  });

  const totalSaved = totalOriginal - totalOptimized;
  const averageReduction = totalOriginal > 0 ? (totalSaved / totalOriginal) * 100 : 0;

  return {
    totalOriginal,
    totalOptimized,
    totalSaved,
    averageReduction,
    successCount,
    failCount
  };
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Smart upload with automatic optimization
export async function smartUpload(
  file: File,
  options: {
    optimize?: boolean;
    generateThumbnail?: boolean;
    preserveOriginal?: boolean;
  } = {}
): Promise<{
  original: File;
  optimized?: Blob;
  thumbnail?: Blob;
  thumbnailUrl?: string;
  stats: {
    originalSize: number;
    optimizedSize: number;
    savedBytes: number;
    savedPercent: number;
  };
}> {
  const { optimize = true, generateThumbnail = true, preserveOriginal = true } = options;

  const result: {
    original: File;
    optimized?: Blob;
    thumbnail?: Blob;
    thumbnailUrl?: string;
    stats: {
      originalSize: number;
      optimizedSize: number;
      savedBytes: number;
      savedPercent: number;
    };
  } = {
    original: file,
    stats: {
      originalSize: file.size,
      optimizedSize: file.size,
      savedBytes: 0,
      savedPercent: 0
    }
  };

  // Handle images
  if (file.type.startsWith('image/') && optimize) {
    const optimizationResult = await optimizeImage(file);
    if (optimizationResult.success && optimizationResult.optimizedBlob) {
      result.optimized = optimizationResult.optimizedBlob;
      result.thumbnail = optimizationResult.thumbnail;
      result.thumbnailUrl = optimizationResult.thumbnailUrl;
      result.stats = {
        originalSize: file.size,
        optimizedSize: optimizationResult.optimizedSize || file.size,
        savedBytes: optimizationResult.savedBytes || 0,
        savedPercent: optimizationResult.savedPercent || 0
      };
    }
  }

  // Handle videos
  if (file.type.startsWith('video/') && generateThumbnail) {
    try {
      const { thumbnail, thumbnailUrl, duration } = await generateVideoThumbnail(file);
      result.thumbnail = thumbnail;
      result.thumbnailUrl = thumbnailUrl;
    } catch (err) {
      console.warn('Could not generate video thumbnail:', err);
    }
  }

  return result;
}

export default {
  optimizeImage,
  optimizeImages,
  optimizeVideo,
  generateVideoThumbnail,
  getMediaInfo,
  shouldOptimize,
  smartUpload,
  getOptimizationSummary,
  formatBytes,
  OPTIMIZATION_SETTINGS
};
