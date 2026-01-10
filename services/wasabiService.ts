// Wasabi Cloud Storage Service for Eleven Views
// S3-compatible object storage with 1TB for $6.99/month
// No OAuth needed - simple API key authentication

const WASABI_ACCESS_KEY = import.meta.env.VITE_WASABI_ACCESS_KEY || '';
const WASABI_SECRET_KEY = import.meta.env.VITE_WASABI_SECRET_KEY || '';
const WASABI_REGION = import.meta.env.VITE_WASABI_REGION || 'us-east-1';
const WASABI_BUCKET = import.meta.env.VITE_WASABI_BUCKET || 'eleven-views-media';
const WASABI_ENDPOINT = `https://s3.${WASABI_REGION}.wasabisys.com`;

// Types
export interface WasabiFile {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType?: string;
}

export interface ElevenViewsAsset {
  id: string;
  key: string; // S3 key (path in bucket)
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'video' | 'image' | 'audio' | 'document' | 'project' | 'other';
  subcategory?: string;
  url: string;
  thumbnailUrl?: string;
  projectId?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  tags: string[];
  aiTags?: string[];
  metadata: Record<string, any>;
  uploadedBy: string;
  uploadedByName: string;
  isShared: boolean;
  isFavorite: boolean;
  isClientVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

// Folder structure for Eleven Views
export const ELEVEN_VIEWS_FOLDERS = {
  PRODUCTIONS: 'productions',
  CLIENTS: 'clients',
  MUSIC: 'music',
  RAW_FOOTAGE: 'raw-footage',
  EXPORTS: 'exports',
  GRAPHICS: 'graphics',
  DOCUMENTS: 'documents',
  ARCHIVE: 'archive',
};

// File category detection with subcategories
export const detectFileCategory = (fileName: string, mimeType: string): { category: ElevenViewsAsset['category']; subcategory?: string } => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Video files
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'prproj', 'aep', 'drp'].includes(ext)) {
    if (['prproj', 'aep', 'drp'].includes(ext)) return { category: 'project', subcategory: 'video-project' };
    if (['mp4', 'mov', 'webm'].includes(ext)) return { category: 'video', subcategory: 'export' };
    return { category: 'video', subcategory: 'raw' };
  }

  // Image files
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'raw', 'cr2', 'nef', 'psd', 'ai'].includes(ext)) {
    if (['psd', 'ai'].includes(ext)) return { category: 'project', subcategory: 'graphics-project' };
    if (['raw', 'cr2', 'nef'].includes(ext)) return { category: 'image', subcategory: 'raw' };
    return { category: 'image', subcategory: 'export' };
  }

  // Audio files
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'aiff', 'flac', 'm4a', 'ogg', 'aup3', 'sesx'].includes(ext)) {
    if (['aup3', 'sesx'].includes(ext)) return { category: 'project', subcategory: 'audio-project' };
    if (['wav', 'aiff', 'flac'].includes(ext)) return { category: 'audio', subcategory: 'lossless' };
    return { category: 'audio', subcategory: 'compressed' };
  }

  // Document files
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext)) {
    return { category: 'document', subcategory: ext };
  }

  return { category: 'other' };
};

// Smart tag generation based on file analysis
export const generateSmartTags = (fileName: string, category: string, metadata?: Record<string, any>): string[] => {
  const tags: string[] = [];
  const nameLower = fileName.toLowerCase();

  // Category tags
  tags.push(category);

  // Production stage tags
  if (nameLower.includes('raw') || nameLower.includes('original')) tags.push('raw');
  if (nameLower.includes('edit') || nameLower.includes('cut')) tags.push('edit');
  if (nameLower.includes('final') || nameLower.includes('master')) tags.push('final');
  if (nameLower.includes('draft')) tags.push('draft');
  if (nameLower.includes('review')) tags.push('needs-review');
  if (nameLower.includes('approved')) tags.push('approved');

  // Content type tags
  if (nameLower.includes('broll') || nameLower.includes('b-roll')) tags.push('b-roll');
  if (nameLower.includes('interview')) tags.push('interview');
  if (nameLower.includes('music') || nameLower.includes('track')) tags.push('music');
  if (nameLower.includes('sfx') || nameLower.includes('sound')) tags.push('sfx');
  if (nameLower.includes('logo')) tags.push('logo');
  if (nameLower.includes('thumbnail')) tags.push('thumbnail');
  if (nameLower.includes('poster')) tags.push('poster');

  // Resolution/quality tags
  if (nameLower.includes('4k') || nameLower.includes('2160')) tags.push('4k');
  if (nameLower.includes('1080') || nameLower.includes('hd')) tags.push('1080p');
  if (nameLower.includes('720')) tags.push('720p');
  if (nameLower.includes('prores')) tags.push('prores');
  if (nameLower.includes('h264') || nameLower.includes('h.264')) tags.push('h264');

  return [...new Set(tags)];
};

// AWS Signature V4 signing utilities
class AWSSignerV4 {
  private accessKey: string;
  private secretKey: string;
  private region: string;
  private service: string = 's3';

  constructor(accessKey: string, secretKey: string, region: string) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.region = region;
  }

  private async sha256(message: string | ArrayBuffer): Promise<ArrayBuffer> {
    const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    return await crypto.subtle.digest('SHA-256', data);
  }

  private async hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  }

  private toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getAmzDate(): { amzDate: string; dateStamp: string } {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    return { amzDate, dateStamp };
  }

  async sign(method: string, url: URL, headers: Record<string, string>, payload: string | ArrayBuffer = ''): Promise<Record<string, string>> {
    const { amzDate, dateStamp } = this.getAmzDate();
    const host = url.host;
    const path = url.pathname;
    const query = url.search.slice(1);

    // Payload hash
    const payloadHash = this.toHex(await this.sha256(payload));

    // Canonical headers
    const signedHeaders = ['host', 'x-amz-content-sha256', 'x-amz-date'];
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeadersStr = signedHeaders.join(';');

    // Canonical request
    const canonicalRequest = [
      method,
      path,
      query,
      canonicalHeaders,
      signedHeadersStr,
      payloadHash
    ].join('\n');

    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      this.toHex(await this.sha256(canonicalRequest))
    ].join('\n');

    // Signing key
    const kDate = await this.hmac(new TextEncoder().encode('AWS4' + this.secretKey), dateStamp);
    const kRegion = await this.hmac(kDate, this.region);
    const kService = await this.hmac(kRegion, this.service);
    const kSigning = await this.hmac(kService, 'aws4_request');

    // Signature
    const signature = this.toHex(await this.hmac(kSigning, stringToSign));

    // Authorization header
    const authorization = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    return {
      ...headers,
      'Authorization': authorization,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };
  }
}
class WasabiService {
  private signer: AWSSignerV4;
  private endpoint: string;
  private bucket: string;
  private isConfigured: boolean;

  constructor() {
    this.signer = new AWSSignerV4(WASABI_ACCESS_KEY, WASABI_SECRET_KEY, WASABI_REGION);
    this.endpoint = WASABI_ENDPOINT;
    this.bucket = WASABI_BUCKET;
    this.isConfigured = !!(WASABI_ACCESS_KEY && WASABI_SECRET_KEY);
  }

  // Check if service is configured
  isReady(): boolean {
    return this.isConfigured;
  }

  // Get configuration status
  getStatus(): { configured: boolean; bucket: string; region: string; endpoint: string } {
    return {
      configured: this.isConfigured,
      bucket: this.bucket,
      region: WASABI_REGION,
      endpoint: this.endpoint,
    };
  }

  // Generate S3 key (path) for file
  private generateKey(file: File, options: { projectName?: string; clientName?: string; folder?: string }): string {
    const { category } = detectFileCategory(file.name, file.type);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    let basePath = '';

    if (options.projectName) {
      basePath = `${ELEVEN_VIEWS_FOLDERS.PRODUCTIONS}/${options.projectName.toLowerCase().replace(/\s+/g, '-')}`;
    } else if (options.clientName) {
      basePath = `${ELEVEN_VIEWS_FOLDERS.CLIENTS}/${options.clientName.toLowerCase().replace(/\s+/g, '-')}`;
    } else if (options.folder) {
      basePath = options.folder;
    } else {
      // Auto-organize by category
      switch (category) {
        case 'video': basePath = ELEVEN_VIEWS_FOLDERS.RAW_FOOTAGE; break;
        case 'audio': basePath = ELEVEN_VIEWS_FOLDERS.MUSIC; break;
        case 'image': basePath = ELEVEN_VIEWS_FOLDERS.GRAPHICS; break;
        case 'document': basePath = ELEVEN_VIEWS_FOLDERS.DOCUMENTS; break;
        default: basePath = 'misc';
      }
    }

    return `${basePath}/${timestamp}-${randomStr}-${sanitizedName}`;
  }

  // Get public URL for a file
  getPublicUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  // Upload file to Wasabi
  async uploadFile(
    file: File,
    options: {
      projectName?: string;
      clientName?: string;
      folder?: string;
      tags?: string[];
      userId: string;
      userName: string;
      onProgress?: (percent: number) => void;
    }
  ): Promise<ElevenViewsAsset> {
    const key = this.generateKey(file, options);
    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Sign the request
    const headers = await this.signer.sign('PUT', url, {
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': file.size.toString(),
    }, arrayBuffer);

    // Upload with fetch (no progress for now, would need XHR for progress)
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers,
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wasabi upload error:', errorText);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    // Detect category and generate tags
    const { category, subcategory } = detectFileCategory(file.name, file.type);
    const smartTags = generateSmartTags(file.name, category);
    const allTags = [...new Set([...smartTags, ...(options.tags || [])])];

    // Build asset record
    const asset: ElevenViewsAsset = {
      id: crypto.randomUUID(),
      key,
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category,
      subcategory,
      url: this.getPublicUrl(key),
      projectName: options.projectName,
      clientName: options.clientName,
      tags: allTags,
      aiTags: smartTags,
      metadata: {
        bucket: this.bucket,
        region: WASABI_REGION,
        originalName: file.name,
        lastModified: file.lastModified,
      },
      uploadedBy: options.userId,
      uploadedByName: options.userName,
      isShared: true,
      isFavorite: false,
      isClientVisible: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to local storage
    this.saveAssetToStorage(asset);

    return asset;
  }

  // Delete file from Wasabi
  async deleteFile(key: string): Promise<boolean> {
    try {
      const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);
      const headers = await this.signer.sign('DELETE', url, {});

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers,
      });

      return response.ok || response.status === 204;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  // List files in a folder
  async listFiles(prefix: string = '', maxKeys: number = 1000): Promise<WasabiFile[]> {
    try {
      const url = new URL(`${this.endpoint}/${this.bucket}`);
      if (prefix) url.searchParams.set('prefix', prefix);
      url.searchParams.set('max-keys', maxKeys.toString());

      const headers = await this.signer.sign('GET', url, {});

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) throw new Error('List failed');

      const xml = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');

      const files: WasabiFile[] = [];
      const contents = doc.querySelectorAll('Contents');

      contents.forEach((item) => {
        const key = item.querySelector('Key')?.textContent || '';
        const size = parseInt(item.querySelector('Size')?.textContent || '0', 10);
        const lastModified = new Date(item.querySelector('LastModified')?.textContent || '');
        const etag = item.querySelector('ETag')?.textContent?.replace(/"/g, '') || '';

        files.push({ key, size, lastModified, etag });
      });

      return files;
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  // Check if bucket exists / is accessible
  async checkBucket(): Promise<boolean> {
    try {
      const url = new URL(`${this.endpoint}/${this.bucket}`);
      const headers = await this.signer.sign('HEAD', url, {});

      const response = await fetch(url.toString(), {
        method: 'HEAD',
        headers,
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Create bucket if not exists
  async createBucket(): Promise<boolean> {
    try {
      const url = new URL(`${this.endpoint}/${this.bucket}`);
      const headers = await this.signer.sign('PUT', url, {});

      const response = await fetch(url.toString(), {
        method: 'PUT',
        headers,
      });

      return response.ok || response.status === 409; // 409 = bucket already exists
    } catch (error) {
      console.error('Failed to create bucket:', error);
      return false;
    }
  }

  // Local storage helpers for asset metadata
  private getStorageKey(): string {
    return 'eleven_views_wasabi_assets';
  }

  saveAssetToStorage(asset: ElevenViewsAsset): void {
    const assets = this.getAssetsFromStorage();
    const index = assets.findIndex(a => a.id === asset.id);
    if (index >= 0) {
      assets[index] = asset;
    } else {
      assets.unshift(asset);
    }
    localStorage.setItem(this.getStorageKey(), JSON.stringify(assets));
  }

  getAssetsFromStorage(): ElevenViewsAsset[] {
    try {
      return JSON.parse(localStorage.getItem(this.getStorageKey()) || '[]');
    } catch {
      return [];
    }
  }

  deleteAssetFromStorage(assetId: string): void {
    const assets = this.getAssetsFromStorage().filter(a => a.id !== assetId);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(assets));
  }

  updateAssetInStorage(assetId: string, updates: Partial<ElevenViewsAsset>): ElevenViewsAsset | null {
    const assets = this.getAssetsFromStorage();
    const index = assets.findIndex(a => a.id === assetId);
    if (index >= 0) {
      assets[index] = { ...assets[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.getStorageKey(), JSON.stringify(assets));
      return assets[index];
    }
    return null;
  }

  // Get storage stats
  getStorageStats(): {
    totalFiles: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
    byProject: Record<string, { count: number; size: number }>;
  } {
    const assets = this.getAssetsFromStorage();
    const stats = {
      totalFiles: assets.length,
      totalSize: 0,
      byCategory: {} as Record<string, { count: number; size: number }>,
      byProject: {} as Record<string, { count: number; size: number }>,
    };

    assets.forEach(asset => {
      stats.totalSize += asset.fileSize;

      // By category
      if (!stats.byCategory[asset.category]) {
        stats.byCategory[asset.category] = { count: 0, size: 0 };
      }
      stats.byCategory[asset.category].count++;
      stats.byCategory[asset.category].size += asset.fileSize;

      // By project
      if (asset.projectName) {
        if (!stats.byProject[asset.projectName]) {
          stats.byProject[asset.projectName] = { count: 0, size: 0 };
        }
        stats.byProject[asset.projectName].count++;
        stats.byProject[asset.projectName].size += asset.fileSize;
      }
    });

    return stats;
  }

  // MCP Server URL for uploads
  private mcpUrl = 'https://mcp.elevenviews.io';

  // Upload file via MCP server (uploads to actual Wasabi storage)
  async uploadViaMCP(file: File, options: {
    projectName?: string;
    clientName?: string;
    tags?: string[];
    userId?: string;
    userName?: string;
    folder?: string;
  } = {}): Promise<ElevenViewsAsset | null> {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const { category, subcategory } = detectFileCategory(file.name, file.type);

      // Build folder path
      let folder = options.folder || '';
      if (!folder) {
        if (options.projectName) {
          folder = `productions/${options.projectName.toLowerCase().replace(/\s+/g, '-')}`;
        } else if (options.clientName) {
          folder = `clients/${options.clientName.toLowerCase().replace(/\s+/g, '-')}`;
        } else {
          // Auto-organize by category
          const folderMap: Record<string, string> = {
            'video': 'video/uploads',
            'image': 'images/uploads',
            'audio': 'music/uploads',
            'document': 'documents',
            'project': 'projects',
          };
          folder = folderMap[category] || 'misc';
        }
      }

      const key = `${folder}/${timestamp}-${safeName}`;

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Upload via MCP
      const response = await fetch(`${this.mcpUrl}/mcp/tools/write_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          content: base64,
          contentType: file.type,
          isBase64: true,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      // Create asset metadata
      const asset: ElevenViewsAsset = {
        id: `ev_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        key,
        name: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileType: file.name.split('.').pop()?.toLowerCase() || '',
        fileSize: file.size,
        category,
        subcategory,
        url: result.url || `https://s3.us-east-1.wasabisys.com/eleven-views-media/${key}`,
        tags: options.tags || generateSmartTags(file.name, category),
        aiTags: generateSmartTags(file.name, category),
        metadata: {
          bucket: 'eleven-views-media',
          uploadedVia: 'mcp',
        },
        uploadedBy: options.userId || 'system',
        uploadedByName: options.userName || 'Upload',
        isShared: true,
        isFavorite: false,
        isClientVisible: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to localStorage for sync
      this.saveAssetToStorage(asset);

      return asset;
    } catch (error) {
      console.error('MCP upload failed:', error);
      return null;
    }
  }

  // Sync local assets with MCP server
  async syncWithMCP(): Promise<ElevenViewsAsset[]> {
    try {
      const response = await fetch(`${this.mcpUrl}/files?limit=500`);
      const data = await response.json();

      if (!data.success || !data.files) {
        return this.getAssetsFromStorage();
      }

      const localAssets = this.getAssetsFromStorage();
      const localByKey = new Map(localAssets.map(a => [a.key, a]));

      const syncedAssets: ElevenViewsAsset[] = data.files
        .filter((f: any) => !f.key.endsWith('.keep') && !f.key.endsWith('/'))
        .map((file: any) => {
          const existing = localByKey.get(file.key);
          const fileName = file.key.split('/').pop() || file.key;
          const name = fileName.replace(/\.[^/.]+$/, '');
          const { category, subcategory } = detectFileCategory(fileName, '');

          return {
            id: existing?.id || `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            key: file.key,
            name,
            fileName,
            fileType: fileName.split('.').pop()?.toLowerCase() || '',
            fileSize: file.size || 0,
            category,
            subcategory,
            url: file.url,
            tags: existing?.tags || generateSmartTags(fileName, category),
            aiTags: existing?.aiTags || generateSmartTags(fileName, category),
            metadata: { bucket: 'eleven-views-media' },
            uploadedBy: existing?.uploadedBy || 'system',
            uploadedByName: existing?.uploadedByName || 'MCP Sync',
            isShared: existing?.isShared ?? true,
            isFavorite: existing?.isFavorite ?? false,
            isClientVisible: existing?.isClientVisible ?? false,
            createdAt: existing?.createdAt || file.lastModified || new Date().toISOString(),
            updatedAt: file.lastModified || new Date().toISOString(),
          } as ElevenViewsAsset;
        });

      // Update localStorage with synced data
      localStorage.setItem(this.getStorageKey(), JSON.stringify(syncedAssets));

      return syncedAssets;
    } catch (error) {
      console.error('MCP sync failed:', error);
      return this.getAssetsFromStorage();
    }
  }
}

// Export singleton instance
export const wasabiService = new WasabiService();

// Get streaming URL for media files
const MCP_STREAM_URL = 'https://mcp.elevenviews.io/stream';

export const getAssetStreamUrl = (asset: { url?: string; key?: string }): string => {
  // Use MCP proxy to stream media files (avoids CORS and handles auth)
  if (asset.key) {
    return `${MCP_STREAM_URL}?key=${encodeURIComponent(asset.key)}`;
  }
  // Fall back to direct URL if no key
  if (asset.url) return asset.url;
  return '';
};

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default wasabiService;
