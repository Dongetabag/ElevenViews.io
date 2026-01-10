// Eleven Views App Store - Unified state management with persistence
// Handles users, team, chat, documents, and AI assets
// Updated to use Supabase for user storage

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fiiiszodgngqbgkczfvd.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
  USERS_CACHE: 'eleven-views-users-cache',
  CURRENT_USER: 'eleven-views-current-user',
  MESSAGES: 'eleven-views-messages',
  DOCUMENTS: 'eleven-views-documents',
  AI_ASSETS: 'eleven-views-ai-assets',
  NOTIFICATIONS: 'eleven-views-notifications'
};

// Simple hash function for password storage
const simpleHash = async (str: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  department?: string;
  title?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  agencyCoreCompetency?: string;
  primaryClientIndustry?: string;
  joinedAt: string;
  lastActiveAt: string;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications: boolean;
  emailDigest: boolean;
  theme: 'dark' | 'light';
  timezone?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId?: string;
  channelId?: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  createdBy: string;
  createdAt: string;
  lastMessageAt?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'spreadsheet' | 'presentation' | 'image' | 'other';
  size: number;
  url?: string;
  content?: string;
  uploadedBy: string;
  uploadedByName: string;
  sharedWith: string[];
  folderId?: string;
  tags?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIAsset {
  id: string;
  name: string;
  type: 'copy' | 'image' | 'strategy' | 'email' | 'social' | 'report' | 'other';
  content: string;
  prompt?: string;
  model?: string;
  createdBy: string;
  createdByName: string;
  clientId?: string;
  campaignId?: string;
  tags?: string[];
  isFavorite?: boolean;
  isShared: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'mention' | 'document' | 'asset' | 'system';
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// Helper functions
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

// Storage helpers
const getStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

// Default channels
const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Company-wide announcements and discussions',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Creative team discussions and asset sharing',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  },
  {
    id: 'strategy',
    name: 'Strategy',
    description: 'Strategy and planning discussions',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  }
];

class AppStore {
  private usersCache: User[] = [];
  private currentUserId: string | null = null;
  private messages: Message[] = [];
  private channels: Channel[] = DEFAULT_CHANNELS;
  private documents: Document[] = [];
  private aiAssets: AIAsset[] = [];
  private notifications: Notification[] = [];
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.loadFromStorage();
    this.syncUsersFromSupabase();
  }

  private loadFromStorage() {
    this.usersCache = getStorage(STORAGE_KEYS.USERS_CACHE, []);
    this.currentUserId = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    this.messages = getStorage(STORAGE_KEYS.MESSAGES, []);
    this.documents = getStorage(STORAGE_KEYS.DOCUMENTS, []);
    this.aiAssets = getStorage(STORAGE_KEYS.AI_ASSETS, []);
    this.notifications = getStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  private saveToStorage() {
    setStorage(STORAGE_KEYS.USERS_CACHE, this.usersCache);
    setStorage(STORAGE_KEYS.CURRENT_USER, this.currentUserId);
    setStorage(STORAGE_KEYS.MESSAGES, this.messages);
    setStorage(STORAGE_KEYS.DOCUMENTS, this.documents);
    setStorage(STORAGE_KEYS.AI_ASSETS, this.aiAssets);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  private async syncUsersFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to sync users from Supabase:', error);
        return;
      }

      if (data) {
        this.usersCache = data.map(u => this.mapSupabaseUserToUser(u));
        this.saveToStorage();
        this.notify('users');
      }
    } catch (err) {
      console.error('Supabase sync error:', err);
    }
  }

  private mapSupabaseUserToUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      name: supabaseUser.name || '',
      email: supabaseUser.email,
      role: supabaseUser.role || 'user',
      avatar: supabaseUser.avatar,
      status: 'offline',
      joinedAt: supabaseUser.created_at,
      lastActiveAt: supabaseUser.updated_at || supabaseUser.created_at
    };
  }

  private notify(event: string) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener());
    }
    const allListeners = this.listeners.get('all');
    if (allListeners) {
      allListeners.forEach(listener => listener());
    }
  }

  subscribe(event: string, listener: () => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  // ==================== USER MANAGEMENT ====================

  async registerUser(userData: Omit<User, 'id' | 'joinedAt' | 'lastActiveAt' | 'status'>): Promise<User> {
    // Check if user exists in Supabase
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.email)
      .single();

    if (existing) {
      // Update existing user
      const { data: updated, error } = await supabase
        .from('users')
        .update({ name: userData.name, updated_at: now() })
        .eq('email', userData.email)
        .select()
        .single();

      if (error) throw error;
      
      const user = this.mapSupabaseUserToUser(updated);
      user.status = 'online';
      this.updateUserCache(user);
      this.currentUserId = user.id;
      this.saveToStorage();
      this.notify('users');
      return user;
    }

    // Create new user in Supabase (without password - use registerUserWithPassword for auth)
    const { data: newData, error } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        name: userData.name,
        role: userData.role || 'user',
        avatar: userData.avatar,
        password_hash: '', // Empty for OAuth/social login users
        created_at: now(),
        updated_at: now()
      })
      .select()
      .single();

    if (error) throw error;

    const newUser = this.mapSupabaseUserToUser(newData);
    newUser.status = 'online';
    this.usersCache.push(newUser);
    this.currentUserId = newUser.id;
    this.saveToStorage();
    this.notify('users');

    this.addMessage({
      senderId: 'system',
      senderName: 'System',
      channelId: 'general',
      content: `${newUser.name} has joined Eleven Views!`,
      type: 'system'
    });

    return newUser;
  }

  private updateUserCache(user: User) {
    const index = this.usersCache.findIndex(u => u.id === user.id);
    if (index >= 0) {
      this.usersCache[index] = user;
    } else {
      this.usersCache.push(user);
    }
  }

  getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    return this.usersCache.find(u => u.id === this.currentUserId) || null;
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
    const user = this.usersCache.find(u => u.id === userId);
    if (user) {
      user.status = 'online';
      user.lastActiveAt = now();
    }
    this.saveToStorage();
    this.notify('users');
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        avatar: updates.avatar,
        role: updates.role,
        updated_at: now()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update user:', error);
      return null;
    }

    const user = this.mapSupabaseUserToUser(data);
    Object.assign(user, updates);
    this.updateUserCache(user);
    this.saveToStorage();
    this.notify('users');
    return user;
  }

  getUsers(): User[] {
    return [...this.usersCache];
  }

  getUserById(id: string): User | null {
    return this.usersCache.find(u => u.id === id) || null;
  }

  getOnlineUsers(): User[] {
    return this.usersCache.filter(u => u.status === 'online');
  }

  setUserStatus(userId: string, status: 'online' | 'away' | 'offline') {
    const user = this.usersCache.find(u => u.id === userId);
    if (user) {
      user.status = status;
      user.lastActiveAt = now();
      this.saveToStorage();
      this.notify('users');
    }
  }

  // ==================== AUTHENTICATION ====================

  async registerUserWithPassword(
    userData: Omit<User, 'id' | 'joinedAt' | 'lastActiveAt' | 'status'>,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (existing) {
        return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
      }

      // Hash password
      const passwordHash = await simpleHash(password);

      // Create user in Supabase
      const { data: newData, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          name: userData.name,
          role: userData.role || 'user',
          avatar: userData.avatar,
          password_hash: passwordHash,
          created_at: now(),
          updated_at: now()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return { success: false, error: 'Failed to create account. Please try again.' };
      }

      const newUser = this.mapSupabaseUserToUser(newData);
      newUser.status = 'online';
      this.usersCache.push(newUser);
      this.currentUserId = newUser.id;
      this.saveToStorage();
      this.notify('users');

      this.addMessage({
        senderId: 'system',
        senderName: 'System',
        channelId: 'general',
        content: `${newUser.name} has joined Eleven Views!`,
        type: 'system'
      });

      return { success: true, user: newUser };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Get user from Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !userData) {
        return { success: false, error: 'No account found with this email. Please create an account first.' };
      }

      // Check password
      const passwordHash = await simpleHash(password);
      if (userData.password_hash !== passwordHash) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      // Login successful - update last active
      await supabase
        .from('users')
        .update({ updated_at: now() })
        .eq('id', userData.id);

      const user = this.mapSupabaseUserToUser(userData);
      user.status = 'online';
      this.updateUserCache(user);
      this.currentUserId = user.id;
      this.saveToStorage();
      this.notify('users');

      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async emailExists(email: string): Promise<boolean> {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
    return !!data;
  }


  // Reset password - generates a reset token and sends email (simulated)
  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string; resetToken?: string }> {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !userData) {
        // Don't reveal if email exists for security
        return { success: true }; // Always return success to prevent email enumeration
      }

      // Generate reset token (in production, this would be sent via email)
      const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour expiry

      // Store reset token in database
      await supabase
        .from('users')
        .update({
          reset_token: resetToken,
          reset_token_expiry: resetExpiry,
          updated_at: now()
        })
        .eq('email', email.toLowerCase());

      // In production, send email here
      console.log(`Password reset requested for ${email}. Token: ${resetToken}`);

      return { success: true, resetToken }; // Return token for demo purposes
    } catch (err) {
      console.error('Password reset request error:', err);
      return { success: false, error: 'Failed to process reset request.' };
    }
  }

  // Verify reset token and set new password
  async resetPasswordWithToken(email: string, token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error || !userData) {
        return { success: false, error: 'Invalid reset request.' };
      }

      // For demo: accept any token or check if token matches
      // In production, verify token and expiry
      if (userData.reset_token && userData.reset_token !== token) {
        // Check if token is expired
        if (userData.reset_token_expiry && new Date(userData.reset_token_expiry) < new Date()) {
          return { success: false, error: 'Reset token has expired. Please request a new one.' };
        }
      }

      // Hash new password and update
      const passwordHash = await simpleHash(newPassword);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          reset_token: null,
          reset_token_expiry: null,
          updated_at: now()
        })
        .eq('email', email.toLowerCase());

      if (updateError) {
        return { success: false, error: 'Failed to update password.' };
      }

      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { success: false, error: 'Failed to reset password.' };
    }
  }

  // Simple password reset without token (for admin/demo use)
  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const passwordHash = await simpleHash(newPassword);
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: now()
        })
        .eq('email', email.toLowerCase());

      if (error) {
        return { success: false, error: 'User not found or update failed.' };
      }

      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { success: false, error: 'Failed to reset password.' };
    }
  }

    getRegisteredEmails(): string[] {
    return this.usersCache.map(u => u.email);
  }

  logout() {
    if (this.currentUserId) {
      const user = this.usersCache.find(u => u.id === this.currentUserId);
      if (user) {
        user.status = 'offline';
      }
    }
    this.currentUserId = null;
    this.saveToStorage();
    this.notify('users');
  }

  async setPassword(email: string, password: string): Promise<boolean> {
    try {
      const passwordHash = await simpleHash(password);
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, updated_at: now() })
        .eq('email', email.toLowerCase());

      return !error;
    } catch {
      return false;
    }
  }

  // ==================== MESSAGING ====================

  addMessage(messageData: Omit<Message, 'id' | 'isRead' | 'createdAt'>): Message {
    const newMessage: Message = {
      ...messageData,
      id: generateId(),
      isRead: false,
      createdAt: now()
    };
    this.messages.push(newMessage);
    this.saveToStorage();
    this.notify('messages');

    if (messageData.recipientId && messageData.recipientId !== messageData.senderId) {
      this.addNotification({
        userId: messageData.recipientId,
        type: 'message',
        title: `New message from ${messageData.senderName}`,
        body: messageData.content.substring(0, 100),
        link: `/messages/${messageData.senderId}`
      });
    }

    return newMessage;
  }

  getMessages(options?: { channelId?: string; senderId?: string; recipientId?: string; limit?: number }): Message[] {
    let filtered = [...this.messages];

    if (options?.channelId) {
      filtered = filtered.filter(m => m.channelId === options.channelId);
    }
    if (options?.senderId && options?.recipientId) {
      filtered = filtered.filter(m =>
        (m.senderId === options.senderId && m.recipientId === options.recipientId) ||
        (m.senderId === options.recipientId && m.recipientId === options.senderId)
      );
    }

    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getChannels(): Channel[] {
    return [...this.channels];
  }

  markMessageAsRead(messageId: string) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.isRead = true;
      this.saveToStorage();
    }
  }

  getUnreadCount(userId: string): number {
    return this.messages.filter(m =>
      (m.recipientId === userId || (!m.recipientId && m.senderId !== userId)) &&
      !m.isRead
    ).length;
  }

  // ==================== DOCUMENTS ====================

  addDocument(docData: Omit<Document, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Document {
    const newDoc: Document = {
      ...docData,
      id: generateId(),
      version: 1,
      createdAt: now(),
      updatedAt: now()
    };
    this.documents.push(newDoc);
    this.saveToStorage();
    this.notify('documents');

    this.addMessage({
      senderId: docData.uploadedBy,
      senderName: docData.uploadedByName,
      channelId: 'general',
      content: `shared a document: ${docData.name}`,
      type: 'file',
      attachments: [{
        id: newDoc.id,
        name: newDoc.name,
        type: newDoc.type,
        size: newDoc.size,
        url: newDoc.url || ''
      }]
    });

    return newDoc;
  }

  getDocuments(options?: { uploadedBy?: string; sharedWith?: string; folderId?: string }): Document[] {
    let filtered = [...this.documents];

    if (options?.uploadedBy) {
      filtered = filtered.filter(d => d.uploadedBy === options.uploadedBy);
    }
    if (options?.sharedWith) {
      filtered = filtered.filter(d =>
        d.sharedWith.length === 0 || d.sharedWith.includes(options.sharedWith!)
      );
    }
    if (options?.folderId) {
      filtered = filtered.filter(d => d.folderId === options.folderId);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateDocument(docId: string, updates: Partial<Document>): Document | null {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return null;
    Object.assign(doc, updates, { updatedAt: now(), version: doc.version + 1 });
    this.saveToStorage();
    this.notify('documents');
    return doc;
  }

  deleteDocument(docId: string): boolean {
    const index = this.documents.findIndex(d => d.id === docId);
    if (index === -1) return false;
    this.documents.splice(index, 1);
    this.saveToStorage();
    this.notify('documents');
    return true;
  }

  // ==================== AI ASSETS ====================

  addAIAsset(assetData: Omit<AIAsset, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): AIAsset {
    const newAsset: AIAsset = {
      ...assetData,
      id: generateId(),
      usageCount: 0,
      createdAt: now(),
      updatedAt: now()
    };
    this.aiAssets.push(newAsset);
    this.saveToStorage();
    this.notify('assets');
    return newAsset;
  }

  getAIAssets(options?: { createdBy?: string; type?: string; isShared?: boolean; clientId?: string }): AIAsset[] {
    let filtered = [...this.aiAssets];

    if (options?.createdBy) {
      filtered = filtered.filter(a => a.createdBy === options.createdBy);
    }
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    if (options?.isShared !== undefined) {
      filtered = filtered.filter(a => a.isShared === options.isShared);
    }
    if (options?.clientId) {
      filtered = filtered.filter(a => a.clientId === options.clientId);
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateAIAsset(assetId: string, updates: Partial<AIAsset>): AIAsset | null {
    const asset = this.aiAssets.find(a => a.id === assetId);
    if (!asset) return null;
    Object.assign(asset, updates, { updatedAt: now() });
    this.saveToStorage();
    this.notify('assets');
    return asset;
  }

  deleteAIAsset(assetId: string): boolean {
    const index = this.aiAssets.findIndex(a => a.id === assetId);
    if (index === -1) return false;
    this.aiAssets.splice(index, 1);
    this.saveToStorage();
    this.notify('assets');
    return true;
  }

  incrementAssetUsage(assetId: string) {
    const asset = this.aiAssets.find(a => a.id === assetId);
    if (asset) {
      asset.usageCount++;
      this.saveToStorage();
    }
  }

  // ==================== NOTIFICATIONS ====================

  addNotification(notifData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    const newNotif: Notification = {
      ...notifData,
      id: generateId(),
      isRead: false,
      createdAt: now()
    };
    this.notifications.push(newNotif);
    this.saveToStorage();
    this.notify('notifications');
    return newNotif;
  }

  getNotifications(userId: string): Notification[] {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationAsRead(notifId: string) {
    const notif = this.notifications.find(n => n.id === notifId);
    if (notif) {
      notif.isRead = true;
      this.saveToStorage();
      this.notify('notifications');
    }
  }

  getUnreadNotificationCount(userId: string): number {
    return this.notifications.filter(n => n.userId === userId && !n.isRead).length;
  }

  // ==================== STATS ====================

  getTeamStats() {
    return {
      totalUsers: this.usersCache.length,
      onlineUsers: this.usersCache.filter(u => u.status === 'online').length,
      totalMessages: this.messages.length,
      totalDocuments: this.documents.length,
      totalAIAssets: this.aiAssets.length
    };
  }
}

// Singleton instance
export const appStore = new AppStore();
export default appStore;
