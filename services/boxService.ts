// Box Cloud Storage Service for Eleven Views
// Provides smart file management, AI-powered organization, and client sharing
// With automatic OAuth token refresh for production use

const BOX_CLIENT_ID = import.meta.env.VITE_BOX_CLIENT_ID || '';
const BOX_CLIENT_SECRET = import.meta.env.VITE_BOX_CLIENT_SECRET || '';
const BOX_DEVELOPER_TOKEN = import.meta.env.VITE_BOX_DEVELOPER_TOKEN || '';
const BOX_API_BASE = 'https://api.box.com/2.0';
const BOX_UPLOAD_BASE = 'https://upload.box.com/api/2.0';
const BOX_OAUTH_BASE = 'https://api.box.com/oauth2';

// Token storage keys
const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'box_access_token',
  REFRESH_TOKEN: 'box_refresh_token',
  EXPIRES_AT: 'box_token_expires_at',
};

// Token buffer - refresh 5 minutes before expiry
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

interface BoxTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Types
export interface BoxFile {
  id: string;
  type: 'file';
  name: string;
  size: number;
  created_at: string;
  modified_at: string;
  content_created_at: string;
  content_modified_at: string;
  sha1: string;
  parent: { id: string; name: string };
  path_collection: { entries: Array<{ id: string; name: string }> };
  shared_link?: BoxSharedLink;
  metadata?: Record<string, any>;
  representations?: any;
  extension?: string;
}

export interface BoxFolder {
  id: string;
  type: 'folder';
  name: string;
  created_at: string;
  modified_at: string;
  parent: { id: string; name: string } | null;
  path_collection: { entries: Array<{ id: string; name: string }> };
  item_collection?: {
    entries: Array<BoxFile | BoxFolder>;
    total_count: number;
  };
}

export interface BoxSharedLink {
  url: string;
  download_url: string;
  vanity_url?: string;
  effective_access: string;
  effective_permission: string;
  is_password_enabled: boolean;
  download_count: number;
  preview_count: number;
}

export interface BoxUploadResult {
  entries: BoxFile[];
}

export interface ElevenViewsAsset {
  id: string;
  boxFileId: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'video' | 'image' | 'audio' | 'document' | 'project' | 'other';
  subcategory?: string;
  boxUrl: string;
  previewUrl?: string;
  downloadUrl?: string;
  sharedLink?: string;
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
  ROOT: '0', // Box root
  PRODUCTIONS: 'Productions',
  CLIENTS: 'Clients',
  MUSIC: 'Music',
  RAW_FOOTAGE: 'Raw Footage',
  EXPORTS: 'Exports',
  GRAPHICS: 'Graphics',
  DOCUMENTS: 'Documents',
  ARCHIVE: 'Archive',
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

  // Resolution/quality tags (from filename patterns)
  if (nameLower.includes('4k') || nameLower.includes('2160')) tags.push('4k');
  if (nameLower.includes('1080') || nameLower.includes('hd')) tags.push('1080p');
  if (nameLower.includes('720')) tags.push('720p');
  if (nameLower.includes('prores')) tags.push('prores');
  if (nameLower.includes('h264') || nameLower.includes('h.264')) tags.push('h264');

  // Date tags (extract from filename)
  const dateMatch = nameLower.match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\d{2}[-_]\d{2}[-_]\d{4})/);
  if (dateMatch) tags.push('dated');

  return [...new Set(tags)]; // Remove duplicates
};

// Box API Service Class with Auto Token Refresh
class BoxService {
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiresAt: number = 0;
  private folderCache: Map<string, string> = new Map(); // name -> id mapping
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  // Load tokens from localStorage
  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN) || BOX_DEVELOPER_TOKEN;
    this.refreshToken = localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN) || '';
    const expiresAt = localStorage.getItem(TOKEN_STORAGE_KEYS.EXPIRES_AT);
    this.tokenExpiresAt = expiresAt ? parseInt(expiresAt, 10) : 0;
  }

  // Save tokens to localStorage
  private saveTokensToStorage(tokens: BoxTokens): void {
    const expiresAt = Date.now() + (tokens.expires_in * 1000);

    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.tokenExpiresAt = expiresAt;

    localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
    localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
    localStorage.setItem(TOKEN_STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  }

  // Clear tokens (logout)
  clearTokens(): void {
    this.accessToken = '';
    this.refreshToken = '';
    this.tokenExpiresAt = 0;
    localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.EXPIRES_AT);
  }

  // Check if token is expired or about to expire
  private isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) return false; // Developer token (no expiry tracked)
    return Date.now() >= (this.tokenExpiresAt - TOKEN_EXPIRY_BUFFER);
  }

  // Check if we have a refresh token available
  hasRefreshToken(): boolean {
    return !!this.refreshToken;
  }

  // Get current access token
  getAccessToken(): string {
    return this.accessToken;
  }

  // Check if authenticated (has valid token)
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Get authentication status details
  getAuthStatus(): {
    authenticated: boolean;
    hasRefreshToken: boolean;
    expiresAt: number | null;
    isExpired: boolean;
    usingDevToken: boolean;
  } {
    return {
      authenticated: this.isAuthenticated(),
      hasRefreshToken: this.hasRefreshToken(),
      expiresAt: this.tokenExpiresAt || null,
      isExpired: this.isTokenExpired(),
      usingDevToken: !this.refreshToken && !!this.accessToken,
    };
  }

  // OAuth URL for authentication
  getAuthUrl(redirectUri?: string): string {
    const redirect = redirectUri || `${window.location.origin}/box-callback`;
    const state = crypto.randomUUID();
    localStorage.setItem('box_oauth_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: BOX_CLIENT_ID,
      redirect_uri: redirect,
      state,
    });
    return `https://account.box.com/api/oauth2/authorize?${params}`;
  }

  // Exchange auth code for tokens
  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<BoxTokens> {
    const redirect = redirectUri || `${window.location.origin}/box-callback`;

    const response = await fetch(`${BOX_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: BOX_CLIENT_ID,
        client_secret: BOX_CLIENT_SECRET,
        redirect_uri: redirect,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || 'Failed to exchange code for token');
    }

    const tokens: BoxTokens = await response.json();
    this.saveTokensToStorage(tokens);
    return tokens;
  }

  // Refresh the access token
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('[Box] Refreshing access token...');

        const response = await fetch(`${BOX_OAUTH_BASE}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken,
            client_id: BOX_CLIENT_ID,
            client_secret: BOX_CLIENT_SECRET,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          // If refresh fails, clear tokens and require re-auth
          if (response.status === 400 || response.status === 401) {
            this.clearTokens();
            throw new Error('Session expired. Please reconnect to Box.');
          }
          throw new Error(error.error_description || 'Failed to refresh token');
        }

        const tokens: BoxTokens = await response.json();
        this.saveTokensToStorage(tokens);
        console.log('[Box] Token refreshed successfully');
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Ensure we have a valid token before making requests
  private async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired() && this.hasRefreshToken()) {
      await this.refreshAccessToken();
    }
  }

  // API request helper with automatic token refresh
  private async request<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    // Ensure token is valid before request
    await this.ensureValidToken();

    const url = endpoint.startsWith('http') ? endpoint : `${BOX_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle 401 - try refresh and retry once
    if (response.status === 401 && retryCount === 0 && this.hasRefreshToken()) {
      console.log('[Box] Got 401, attempting token refresh...');
      await this.refreshAccessToken();
      return this.request<T>(endpoint, options, retryCount + 1);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error_description || `Box API error: ${response.status}`);
    }

    return response.json();
  }

  // Get current user info
  async getCurrentUser(): Promise<any> {
    return this.request('/users/me');
  }

  // Get folder contents
  async getFolderContents(folderId: string = '0', limit: number = 100): Promise<BoxFolder> {
    return this.request(`/folders/${folderId}?fields=id,name,created_at,modified_at,parent,path_collection,item_collection&limit=${limit}`);
  }

  // Create folder
  async createFolder(name: string, parentId: string = '0'): Promise<BoxFolder> {
    return this.request('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent: { id: parentId } }),
    });
  }

  // Get or create folder (with caching)
  async getOrCreateFolder(name: string, parentId: string = '0'): Promise<string> {
    const cacheKey = `${parentId}:${name}`;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    try {
      // Check if folder exists
      const parent = await this.getFolderContents(parentId);
      const existing = parent.item_collection?.entries.find(
        item => item.type === 'folder' && item.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        this.folderCache.set(cacheKey, existing.id);
        return existing.id;
      }

      // Create new folder
      const newFolder = await this.createFolder(name, parentId);
      this.folderCache.set(cacheKey, newFolder.id);
      return newFolder.id;
    } catch (error) {
      console.error(`Failed to get/create folder ${name}:`, error);
      throw error;
    }
  }

  // Initialize Eleven Views folder structure
  async initializeFolderStructure(): Promise<Record<string, string>> {
    const structure: Record<string, string> = {};

    // Create root "Eleven Views" folder
    const rootId = await this.getOrCreateFolder('Eleven Views');
    structure['root'] = rootId;

    // Create main folders
    for (const [key, name] of Object.entries(ELEVEN_VIEWS_FOLDERS)) {
      if (key === 'ROOT') continue;
      const folderId = await this.getOrCreateFolder(name, rootId);
      structure[key.toLowerCase()] = folderId;
    }

    return structure;
  }

  // Upload file with auto token refresh
  async uploadFile(
    file: File,
    folderId: string,
    onProgress?: (percent: number) => void,
    retryCount = 0
  ): Promise<BoxFile> {
    // Ensure token is valid before upload
    await this.ensureValidToken();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('attributes', JSON.stringify({
      name: file.name,
      parent: { id: folderId },
    }));

    const response = await fetch(`${BOX_UPLOAD_BASE}/files/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    // Handle 401 - try refresh and retry once
    if (response.status === 401 && retryCount === 0 && this.hasRefreshToken()) {
      console.log('[Box] Upload got 401, attempting token refresh...');
      await this.refreshAccessToken();
      return this.uploadFile(file, folderId, onProgress, retryCount + 1);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error_description || 'Upload failed');
    }

    const result: BoxUploadResult = await response.json();
    return result.entries[0];
  }

  // Upload file with smart organization
  async smartUpload(
    file: File,
    options: {
      projectName?: string;
      clientName?: string;
      customFolder?: string;
      tags?: string[];
      userId: string;
      userName: string;
    }
  ): Promise<ElevenViewsAsset> {
    // Initialize folder structure
    const folders = await this.initializeFolderStructure();

    // Detect file category
    const { category, subcategory } = detectFileCategory(file.name, file.type);

    // Determine target folder based on category and options
    let targetFolderId = folders['root'];
    let folderPath = ['Eleven Views'];

    if (options.projectName) {
      // Project-based organization
      const projectFolderId = await this.getOrCreateFolder(options.projectName, folders['productions']);
      targetFolderId = projectFolderId;
      folderPath.push('Productions', options.projectName);

      // Create category subfolder within project
      const categoryFolder = category === 'video' ? 'Footage' :
                            category === 'audio' ? 'Audio' :
                            category === 'image' ? 'Graphics' : 'Assets';
      targetFolderId = await this.getOrCreateFolder(categoryFolder, projectFolderId);
      folderPath.push(categoryFolder);
    } else if (options.clientName) {
      // Client-based organization
      const clientFolderId = await this.getOrCreateFolder(options.clientName, folders['clients']);
      targetFolderId = clientFolderId;
      folderPath.push('Clients', options.clientName);
    } else {
      // Category-based organization
      switch (category) {
        case 'video':
          targetFolderId = subcategory === 'raw' ?
            await this.getOrCreateFolder('Raw', folders['raw_footage']) :
            folders['exports'];
          folderPath.push(subcategory === 'raw' ? 'Raw Footage/Raw' : 'Exports');
          break;
        case 'audio':
          targetFolderId = folders['music'];
          folderPath.push('Music');
          break;
        case 'image':
          targetFolderId = folders['graphics'];
          folderPath.push('Graphics');
          break;
        case 'document':
          targetFolderId = folders['documents'];
          folderPath.push('Documents');
          break;
        default:
          targetFolderId = folders['root'];
      }
    }

    // Upload file
    const boxFile = await this.uploadFile(file, targetFolderId);

    // Generate smart tags
    const smartTags = generateSmartTags(file.name, category);
    const allTags = [...new Set([...smartTags, ...(options.tags || [])])];

    // Create shared link for preview
    const sharedLink = await this.createSharedLink(boxFile.id);

    // Build asset record
    const asset: ElevenViewsAsset = {
      id: crypto.randomUUID(),
      boxFileId: boxFile.id,
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category,
      subcategory,
      boxUrl: `https://app.box.com/file/${boxFile.id}`,
      previewUrl: sharedLink?.url,
      downloadUrl: sharedLink?.download_url,
      sharedLink: sharedLink?.url,
      projectId: options.projectName ? crypto.randomUUID() : undefined,
      projectName: options.projectName,
      clientId: options.clientName ? crypto.randomUUID() : undefined,
      clientName: options.clientName,
      tags: allTags,
      aiTags: smartTags,
      metadata: {
        folderPath: folderPath.join('/'),
        boxParentId: targetFolderId,
        subcategory,
        originalName: file.name,
      },
      uploadedBy: options.userId,
      uploadedByName: options.userName,
      isShared: true,
      isFavorite: false,
      isClientVisible: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to local storage (can be replaced with Supabase for persistence)
    this.saveAssetToStorage(asset);

    return asset;
  }

  // Create shared link
  async createSharedLink(fileId: string, access: 'open' | 'company' | 'collaborators' = 'open'): Promise<BoxSharedLink | null> {
    try {
      const result = await this.request<BoxFile>(`/files/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify({
          shared_link: {
            access,
            permissions: { can_download: true, can_preview: true },
          },
        }),
      });
      return result.shared_link || null;
    } catch (error) {
      console.error('Failed to create shared link:', error);
      return null;
    }
  }

  // Get file info
  async getFile(fileId: string): Promise<BoxFile> {
    return this.request(`/files/${fileId}?fields=id,name,size,created_at,modified_at,parent,path_collection,shared_link,representations`);
  }

  // Delete file
  async deleteFile(fileId: string): Promise<void> {
    await fetch(`${BOX_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.getAccessToken()}` },
    });
  }

  // Get thumbnail/preview URL
  async getThumbnail(fileId: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<string | null> {
    try {
      const dimensions = { small: '94x94', medium: '320x320', large: '1024x1024' };
      const response = await fetch(
        `${BOX_API_BASE}/files/${fileId}/thumbnail.png?min_height=320&min_width=320`,
        { headers: { 'Authorization': `Bearer ${this.getAccessToken()}` } }
      );

      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch {
      return null;
    }
  }

  // Search files
  async searchFiles(query: string, options?: {
    type?: 'file' | 'folder';
    fileExtensions?: string[];
    ancestorFolderIds?: string[];
  }): Promise<Array<BoxFile | BoxFolder>> {
    const params = new URLSearchParams({ query });
    if (options?.type) params.append('type', options.type);
    if (options?.fileExtensions) params.append('file_extensions', options.fileExtensions.join(','));
    if (options?.ancestorFolderIds) params.append('ancestor_folder_ids', options.ancestorFolderIds.join(','));

    const result = await this.request<{ entries: Array<BoxFile | BoxFolder> }>(`/search?${params}`);
    return result.entries;
  }

  // Local storage helpers for assets
  private getStorageKey(): string {
    return 'eleven_views_box_assets';
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
}

// Export singleton instance
export const boxService = new BoxService();

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default boxService;
