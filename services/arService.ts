// A&R Service - Manages demo submissions and review metadata
// Syncs audio files from Wasabi with A&R review data

const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';
const AR_STORAGE_KEY = 'elevenviews_ar_metadata';

export interface ARComment {
  id: string;
  oderId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  timestampSeconds?: number;
  createdAt: string;
}

export interface ARRatings {
  overall: number;
  production: number;
  vocals: number;
  lyrics: number;
  commercial: number;
}

export interface ARMetadata {
  id: string;
  key: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ratings: ARRatings;
  comments: ARComment[];
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  tags?: string[];
}

export interface DemoSubmission {
  id: string;
  key: string;
  title: string;
  artistName: string;
  artistEmail?: string;
  genre: string;
  audioUrl: string;
  duration: number;
  fileSize: number;
  submittedAt: string;
  submittedBy?: string;
  // A&R metadata
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ratings: ARRatings;
  comments: ARComment[];
  waveformData?: number[];
  // Additional metadata
  projectName?: string;
  subcategory?: string;
}

class ARService {
  private metadata: Map<string, ARMetadata> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // Load A&R metadata from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(AR_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.metadata = new Map(Object.entries(data));
      }
    } catch (err) {
      console.error('[ARService] Failed to load from storage:', err);
    }
  }

  // Save A&R metadata to localStorage
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.metadata);
      localStorage.setItem(AR_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[ARService] Failed to save to storage:', err);
    }
  }

  // Get default ratings
  private getDefaultRatings(): ARRatings {
    return {
      overall: 0,
      production: 0,
      vocals: 0,
      lyrics: 0,
      commercial: 0
    };
  }

  // Get or create metadata for a key
  getMetadata(key: string): ARMetadata | null {
    return this.metadata.get(key) || null;
  }

  // Update metadata for a demo
  updateMetadata(key: string, updates: Partial<ARMetadata>): ARMetadata {
    const existing = this.metadata.get(key) || {
      id: crypto.randomUUID(),
      key,
      status: 'pending' as const,
      priority: 'normal' as const,
      ratings: this.getDefaultRatings(),
      comments: []
    };

    const updated = { ...existing, ...updates };
    this.metadata.set(key, updated);
    this.saveToStorage();
    return updated;
  }

  // Add a comment to a demo
  addComment(key: string, comment: Omit<ARComment, 'id' | 'createdAt'>): ARComment {
    const newComment: ARComment = {
      ...comment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    const metadata = this.getMetadata(key) || {
      id: crypto.randomUUID(),
      key,
      status: 'pending' as const,
      priority: 'normal' as const,
      ratings: this.getDefaultRatings(),
      comments: []
    };

    metadata.comments = [...metadata.comments, newComment];
    this.metadata.set(key, metadata);
    this.saveToStorage();
    return newComment;
  }

  // Update ratings
  updateRatings(key: string, ratings: Partial<ARRatings>): ARRatings {
    const metadata = this.getMetadata(key) || {
      id: crypto.randomUUID(),
      key,
      status: 'pending' as const,
      priority: 'normal' as const,
      ratings: this.getDefaultRatings(),
      comments: []
    };

    metadata.ratings = { ...metadata.ratings, ...ratings };

    // Calculate overall as average if not explicitly set
    if (!ratings.overall) {
      const { production, vocals, lyrics, commercial } = metadata.ratings;
      const validRatings = [production, vocals, lyrics, commercial].filter(r => r > 0);
      if (validRatings.length > 0) {
        metadata.ratings.overall = Math.round(
          (validRatings.reduce((a, b) => a + b, 0) / validRatings.length) * 10
        ) / 10;
      }
    }

    this.metadata.set(key, metadata);
    this.saveToStorage();
    return metadata.ratings;
  }

  // Update status
  updateStatus(key: string, status: ARMetadata['status'], reviewedBy?: string): void {
    const metadata = this.getMetadata(key) || {
      id: crypto.randomUUID(),
      key,
      status: 'pending' as const,
      priority: 'normal' as const,
      ratings: this.getDefaultRatings(),
      comments: []
    };

    metadata.status = status;
    if (reviewedBy) {
      metadata.reviewedBy = reviewedBy;
      metadata.reviewedAt = new Date().toISOString();
    }

    this.metadata.set(key, metadata);
    this.saveToStorage();
  }

  // Parse artist name from filename/path
  private parseArtistFromPath(key: string, fileName: string): string {
    const pathParts = key.split('/');
    if (pathParts.length > 1) {
      // Use folder name as artist (e.g., "Simeon Views Music" -> "Simeon Views")
      return pathParts[0].replace(/-/g, ' ').replace(' Music', '').trim();
    }
    // Try to extract from filename
    const match = fileName.match(/^(.+?)[-_]/);
    return match ? match[1].trim() : 'Unknown Artist';
  }

  // Parse title from filename
  private parseTitle(fileName: string): string {
    // Remove extension
    const name = fileName.replace(/\.[^/.]+$/, '');
    // Remove track numbers (01-, 02, etc.)
    const withoutNumber = name.replace(/^\d{1,2}[-_.\s]/, '');
    // Convert dashes/underscores to spaces
    return withoutNumber.replace(/[-_]/g, ' ').trim() || name;
  }

  // Detect genre from path/tags
  private detectGenre(key: string, fileName: string): string {
    const lower = (key + fileName).toLowerCase();
    if (lower.includes('r&b') || lower.includes('rnb')) return 'R&B';
    if (lower.includes('hip-hop') || lower.includes('hiphop') || lower.includes('rap')) return 'Hip-Hop';
    if (lower.includes('pop')) return 'Pop';
    if (lower.includes('rock')) return 'Rock';
    if (lower.includes('electronic') || lower.includes('edm')) return 'Electronic';
    if (lower.includes('jazz')) return 'Jazz';
    if (lower.includes('beat')) return 'Beat/Instrumental';
    if (lower.includes('stem')) return 'Stems';
    return 'Alternative R&B'; // Default for Eleven Views
  }

  // Fetch all audio demos from MCP and merge with A&R metadata
  async fetchDemos(): Promise<DemoSubmission[]> {
    try {
      console.log('[ARService] Fetching audio files from MCP...');
      const response = await fetch(`${MCP_URL}/files?limit=500`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.files) {
        throw new Error('Invalid response from MCP');
      }

      // Filter for audio files only
      const audioFiles = data.files.filter((f: any) => {
        const ext = f.key.split('.').pop()?.toLowerCase();
        return ['mp3', 'wav', 'm4a', 'flac', 'aac', 'ogg', 'wma'].includes(ext || '');
      });

      console.log(`[ARService] Found ${audioFiles.length} audio files`);

      // Map to DemoSubmission with A&R metadata
      const demos: DemoSubmission[] = audioFiles.map((file: any) => {
        const fileName = file.key.split('/').pop() || file.key;
        const metadata = this.getMetadata(file.key);
        const pathParts = file.key.split('/');
        const projectName = pathParts.length > 1 ? pathParts[0].replace(/-/g, ' ') : undefined;

        return {
          id: metadata?.id || crypto.randomUUID(),
          key: file.key,
          title: this.parseTitle(fileName),
          artistName: this.parseArtistFromPath(file.key, fileName),
          genre: this.detectGenre(file.key, fileName),
          audioUrl: `${MCP_URL}/stream?key=${encodeURIComponent(file.key)}`,
          duration: file.duration || 180, // Default 3 min if unknown
          fileSize: file.size || 0,
          submittedAt: file.lastModified || new Date().toISOString(),
          submittedBy: file.uploadedBy,
          projectName,
          // A&R metadata (from storage or defaults)
          status: metadata?.status || 'pending',
          priority: metadata?.priority || 'normal',
          ratings: metadata?.ratings || this.getDefaultRatings(),
          comments: metadata?.comments || [],
          // Generate waveform data
          waveformData: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)
        };
      });

      // Sort by submission date (newest first)
      demos.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      return demos;
    } catch (err) {
      console.error('[ARService] Failed to fetch demos:', err);
      return [];
    }
  }

  // Get all metadata (for Asset Library)
  getAllMetadata(): Map<string, ARMetadata> {
    return this.metadata;
  }

  // Get stats
  getStats(demos: DemoSubmission[]): {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    avgRating: number;
  } {
    const withRatings = demos.filter(d => d.ratings.overall > 0);
    return {
      total: demos.length,
      pending: demos.filter(d => d.status === 'pending').length,
      underReview: demos.filter(d => d.status === 'under_review').length,
      approved: demos.filter(d => d.status === 'approved').length,
      rejected: demos.filter(d => d.status === 'rejected').length,
      avgRating: withRatings.length > 0
        ? Math.round((withRatings.reduce((acc, d) => acc + d.ratings.overall, 0) / withRatings.length) * 10) / 10
        : 0
    };
  }
}

// Singleton instance
export const arService = new ARService();
