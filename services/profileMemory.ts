// Profile Memory Service for Eleven Views
// Handles persistent storage for user settings, chat history, generated images, and imports
// Uses both localStorage for offline access and Supabase for cloud sync

import { supabase } from './supabaseService';

const STORAGE_KEYS = {
  USER_PROFILE: 'ev_user_profile',
  USER_SETTINGS: 'ev_user_settings',
  CHAT_HISTORY: 'ev_chat_history',
  GENERATED_IMAGES: 'ev_generated_images',
  IMPORT_HISTORY: 'ev_import_history',
  AI_CONVERSATIONS: 'ev_ai_conversations',
  FAVORITES: 'ev_favorites',
  RECENT_ASSETS: 'ev_recent_assets',
};

// Types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  company?: string;
  phone?: string;
  bio?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowAnalytics: boolean;
  };
  workspace: {
    defaultView: 'grid' | 'list';
    sidebarCollapsed: boolean;
    showWelcome: boolean;
  };
  ai: {
    defaultModel: string;
    autoSave: boolean;
    historyEnabled: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens?: number;
    toolsUsed?: string[];
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  module?: string;
  tags?: string[];
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  thumbnailUrl?: string;
  model: string;
  style?: string;
  size?: string;
  createdAt: string;
  isFavorite: boolean;
  tags?: string[];
  wasabiKey?: string;
}

export interface ImportRecord {
  id: string;
  type: 'file' | 'url' | 'api' | 'integration';
  source: string;
  fileName?: string;
  fileSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  accentColor: '#FFD700',
  notifications: {
    email: true,
    push: true,
    sound: true,
  },
  privacy: {
    showOnlineStatus: true,
    allowAnalytics: true,
  },
  workspace: {
    defaultView: 'grid',
    sidebarCollapsed: false,
    showWelcome: true,
  },
  ai: {
    defaultModel: 'gemini-2.0-flash',
    autoSave: true,
    historyEnabled: true,
  },
};

class ProfileMemoryService {
  private userId: string | null = null;

  // Initialize with user ID
  init(userId: string) {
    this.userId = userId;
    this.syncFromCloud();
  }

  // Get storage key with user ID prefix
  private getKey(key: string): string {
    return this.userId ? `${key}_${this.userId}` : key;
  }

  // ============ USER PROFILE ============

  saveProfile(profile: UserProfile): void {
    localStorage.setItem(this.getKey(STORAGE_KEYS.USER_PROFILE), JSON.stringify(profile));
    this.syncProfileToCloud(profile);
  }

  getProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.USER_PROFILE));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  // ============ USER SETTINGS ============

  saveSettings(settings: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(this.getKey(STORAGE_KEYS.USER_SETTINGS), JSON.stringify(merged));
    this.syncSettingsToCloud(merged);
    return merged;
  }

  getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.USER_SETTINGS));
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  // ============ CHAT HISTORY ============

  saveConversation(conversation: ChatConversation): void {
    const conversations = this.getConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);

    if (index >= 0) {
      conversations[index] = { ...conversation, updatedAt: new Date().toISOString() };
    } else {
      conversations.unshift(conversation);
    }

    // Keep only last 100 conversations
    const trimmed = conversations.slice(0, 100);
    localStorage.setItem(this.getKey(STORAGE_KEYS.CHAT_HISTORY), JSON.stringify(trimmed));
    this.syncConversationsToCloud(trimmed);
  }

  getConversations(): ChatConversation[] {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.CHAT_HISTORY));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getConversation(id: string): ChatConversation | null {
    return this.getConversations().find(c => c.id === id) || null;
  }

  deleteConversation(id: string): void {
    const conversations = this.getConversations().filter(c => c.id !== id);
    localStorage.setItem(this.getKey(STORAGE_KEYS.CHAT_HISTORY), JSON.stringify(conversations));
  }

  addMessageToConversation(conversationId: string, message: ChatMessage): ChatConversation | null {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return null;

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    this.saveConversation(conversation);
    return conversation;
  }

  createConversation(title: string, module?: string): ChatConversation {
    const conversation: ChatConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      module,
    };
    this.saveConversation(conversation);
    return conversation;
  }

  // ============ GENERATED IMAGES ============

  saveGeneratedImage(image: GeneratedImage): void {
    const images = this.getGeneratedImages();
    images.unshift(image);

    // Keep only last 500 images
    const trimmed = images.slice(0, 500);
    localStorage.setItem(this.getKey(STORAGE_KEYS.GENERATED_IMAGES), JSON.stringify(trimmed));
    this.syncImagesToCloud(trimmed);
  }

  getGeneratedImages(): GeneratedImage[] {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.GENERATED_IMAGES));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  toggleImageFavorite(id: string): GeneratedImage | null {
    const images = this.getGeneratedImages();
    const image = images.find(i => i.id === id);
    if (image) {
      image.isFavorite = !image.isFavorite;
      localStorage.setItem(this.getKey(STORAGE_KEYS.GENERATED_IMAGES), JSON.stringify(images));
      return image;
    }
    return null;
  }

  deleteGeneratedImage(id: string): void {
    const images = this.getGeneratedImages().filter(i => i.id !== id);
    localStorage.setItem(this.getKey(STORAGE_KEYS.GENERATED_IMAGES), JSON.stringify(images));
  }

  getFavoriteImages(): GeneratedImage[] {
    return this.getGeneratedImages().filter(i => i.isFavorite);
  }

  // ============ IMPORT HISTORY ============

  saveImport(record: ImportRecord): void {
    const imports = this.getImports();
    const index = imports.findIndex(i => i.id === record.id);

    if (index >= 0) {
      imports[index] = record;
    } else {
      imports.unshift(record);
    }

    // Keep only last 200 imports
    const trimmed = imports.slice(0, 200);
    localStorage.setItem(this.getKey(STORAGE_KEYS.IMPORT_HISTORY), JSON.stringify(trimmed));
  }

  getImports(): ImportRecord[] {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.IMPORT_HISTORY));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  updateImportStatus(id: string, status: ImportRecord['status'], resultUrl?: string, error?: string): void {
    const imports = this.getImports();
    const record = imports.find(i => i.id === id);
    if (record) {
      record.status = status;
      if (resultUrl) record.resultUrl = resultUrl;
      if (error) record.error = error;
      if (status === 'completed' || status === 'failed') {
        record.completedAt = new Date().toISOString();
      }
      localStorage.setItem(this.getKey(STORAGE_KEYS.IMPORT_HISTORY), JSON.stringify(imports));
    }
  }

  // ============ RECENT ASSETS ============

  addRecentAsset(assetId: string, assetType: string): void {
    const recent = this.getRecentAssets();
    const filtered = recent.filter(r => r.id !== assetId);
    filtered.unshift({ id: assetId, type: assetType, viewedAt: new Date().toISOString() });
    const trimmed = filtered.slice(0, 50);
    localStorage.setItem(this.getKey(STORAGE_KEYS.RECENT_ASSETS), JSON.stringify(trimmed));
  }

  getRecentAssets(): Array<{ id: string; type: string; viewedAt: string }> {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.RECENT_ASSETS));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // ============ FAVORITES ============

  addFavorite(itemId: string, itemType: string): void {
    const favorites = this.getFavorites();
    if (!favorites.some(f => f.id === itemId)) {
      favorites.push({ id: itemId, type: itemType, addedAt: new Date().toISOString() });
      localStorage.setItem(this.getKey(STORAGE_KEYS.FAVORITES), JSON.stringify(favorites));
    }
  }

  removeFavorite(itemId: string): void {
    const favorites = this.getFavorites().filter(f => f.id !== itemId);
    localStorage.setItem(this.getKey(STORAGE_KEYS.FAVORITES), JSON.stringify(favorites));
  }

  getFavorites(): Array<{ id: string; type: string; addedAt: string }> {
    try {
      const data = localStorage.getItem(this.getKey(STORAGE_KEYS.FAVORITES));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  isFavorite(itemId: string): boolean {
    return this.getFavorites().some(f => f.id === itemId);
  }

  // ============ CLOUD SYNC (Supabase) ============

  private async syncProfileToCloud(profile: UserProfile): Promise<void> {
    if (!this.userId) return;
    try {
      await supabase.from('user_profiles').upsert({
        user_id: this.userId,
        profile_data: profile,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync profile to cloud:', error);
    }
  }

  private async syncSettingsToCloud(settings: UserSettings): Promise<void> {
    if (!this.userId) return;
    try {
      await supabase.from('user_settings').upsert({
        user_id: this.userId,
        settings_data: settings,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync settings to cloud:', error);
    }
  }

  private async syncConversationsToCloud(conversations: ChatConversation[]): Promise<void> {
    if (!this.userId) return;
    try {
      await supabase.from('chat_history').upsert({
        user_id: this.userId,
        conversations: conversations.slice(0, 50), // Only sync last 50
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync conversations to cloud:', error);
    }
  }

  private async syncImagesToCloud(images: GeneratedImage[]): Promise<void> {
    if (!this.userId) return;
    try {
      await supabase.from('generated_images').upsert({
        user_id: this.userId,
        images: images.slice(0, 100), // Only sync last 100
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to sync images to cloud:', error);
    }
  }

  private async syncFromCloud(): Promise<void> {
    if (!this.userId) return;

    try {
      // Sync profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('profile_data')
        .eq('user_id', this.userId)
        .single();

      if (profileData?.profile_data) {
        const localProfile = this.getProfile();
        if (!localProfile || new Date(profileData.profile_data.lastLoginAt) > new Date(localProfile.lastLoginAt)) {
          localStorage.setItem(this.getKey(STORAGE_KEYS.USER_PROFILE), JSON.stringify(profileData.profile_data));
        }
      }

      // Sync settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('settings_data')
        .eq('user_id', this.userId)
        .single();

      if (settingsData?.settings_data) {
        const currentSettings = this.getSettings();
        const merged = { ...currentSettings, ...settingsData.settings_data };
        localStorage.setItem(this.getKey(STORAGE_KEYS.USER_SETTINGS), JSON.stringify(merged));
      }

      // Sync chat history
      const { data: chatData } = await supabase
        .from('chat_history')
        .select('conversations')
        .eq('user_id', this.userId)
        .single();

      if (chatData?.conversations) {
        const localConversations = this.getConversations();
        const cloudConversations = chatData.conversations as ChatConversation[];

        // Merge - prefer newer versions
        const merged = [...localConversations];
        cloudConversations.forEach(cloudConv => {
          const localIndex = merged.findIndex(c => c.id === cloudConv.id);
          if (localIndex >= 0) {
            if (new Date(cloudConv.updatedAt) > new Date(merged[localIndex].updatedAt)) {
              merged[localIndex] = cloudConv;
            }
          } else {
            merged.push(cloudConv);
          }
        });

        merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        localStorage.setItem(this.getKey(STORAGE_KEYS.CHAT_HISTORY), JSON.stringify(merged.slice(0, 100)));
      }

      // Sync generated images
      const { data: imagesData } = await supabase
        .from('generated_images')
        .select('images')
        .eq('user_id', this.userId)
        .single();

      if (imagesData?.images) {
        const localImages = this.getGeneratedImages();
        const cloudImages = imagesData.images as GeneratedImage[];

        const merged = [...localImages];
        cloudImages.forEach(cloudImg => {
          if (!merged.some(i => i.id === cloudImg.id)) {
            merged.push(cloudImg);
          }
        });

        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        localStorage.setItem(this.getKey(STORAGE_KEYS.GENERATED_IMAGES), JSON.stringify(merged.slice(0, 500)));
      }
    } catch (error) {
      console.error('Failed to sync from cloud:', error);
    }
  }

  // ============ EXPORT/IMPORT ============

  exportAllData(): string {
    const data = {
      profile: this.getProfile(),
      settings: this.getSettings(),
      conversations: this.getConversations(),
      generatedImages: this.getGeneratedImages(),
      imports: this.getImports(),
      favorites: this.getFavorites(),
      recentAssets: this.getRecentAssets(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      if (data.profile) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.USER_PROFILE), JSON.stringify(data.profile));
      }
      if (data.settings) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.USER_SETTINGS), JSON.stringify(data.settings));
      }
      if (data.conversations) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.CHAT_HISTORY), JSON.stringify(data.conversations));
      }
      if (data.generatedImages) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.GENERATED_IMAGES), JSON.stringify(data.generatedImages));
      }
      if (data.imports) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.IMPORT_HISTORY), JSON.stringify(data.imports));
      }
      if (data.favorites) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.FAVORITES), JSON.stringify(data.favorites));
      }
      if (data.recentAssets) {
        localStorage.setItem(this.getKey(STORAGE_KEYS.RECENT_ASSETS), JSON.stringify(data.recentAssets));
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all user data
  clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(this.getKey(key));
    });
  }
}

// Export singleton
export const profileMemory = new ProfileMemoryService();

// React hook for profile memory
export const useProfileMemory = () => {
  return profileMemory;
};

export default profileMemory;
