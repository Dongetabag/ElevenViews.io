// Eleven Views App Store - Unified state management with persistence
// Handles users, team, chat, documents, and AI assets
// Updated to use MCP Server for user authentication (bypasses invalid Supabase API key)

import { sendWelcomeEmail, sendPasswordResetEmail } from './resendService';

const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

const STORAGE_KEYS = {
  USERS_CACHE: 'eleven-views-users-cache',
  CURRENT_USER: 'eleven-views-current-user',
  MESSAGES: 'eleven-views-messages',
  DOCUMENTS: 'eleven-views-documents',
  AI_ASSETS: 'eleven-views-ai-assets',
  NOTIFICATIONS: 'eleven-views-notifications'
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

// Default channels for Eleven Views members portal
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
    id: 'music',
    name: 'Music',
    description: 'Music production, A&R, and artist discussions',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  },
  {
    id: 'film',
    name: 'Film',
    description: 'Film projects, direction, and cinematography',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Fashion design, styling, and brand collaborations',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  },
  {
    id: 'design',
    name: 'Design',
    description: 'Visual design, branding, and creative direction',
    type: 'public',
    members: [],
    createdBy: 'system',
    createdAt: now()
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Active client projects and collaborations',
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
    this.syncUsersFromMCP();
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

  private async syncUsersFromMCP() {
    try {
      const response = await fetch(`${MCP_URL}/auth/users`);
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to sync users from MCP:', data.error);
        return;
      }

      if (data.users) {
        this.usersCache = data.users.map((u: any) => this.mapMCPUserToUser(u));
        this.saveToStorage();
        this.notify('users');
      }
    } catch (err) {
      console.error('MCP sync error:', err);
    }
  }

  private mapMCPUserToUser(mcpUser: any): User {
    return {
      id: mcpUser.id,
      name: mcpUser.name || '',
      email: mcpUser.email,
      role: mcpUser.role || 'user',
      avatar: mcpUser.avatar,
      status: 'offline',
      joinedAt: mcpUser.joinedAt,
      lastActiveAt: mcpUser.lastActiveAt || mcpUser.joinedAt
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
    // Check if user exists in cache first
    const existingLocal = this.usersCache.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingLocal) {
      existingLocal.name = userData.name;
      existingLocal.status = 'online';
      this.currentUserId = existingLocal.id;
      this.saveToStorage();
      this.notify('users');
      return existingLocal;
    }

    // Create new user locally (for social/OAuth login without password)
    const newUser: User = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: userData.name,
      email: userData.email,
      role: userData.role || 'user',
      avatar: userData.avatar,
      status: 'online',
      joinedAt: now(),
      lastActiveAt: now()
    };

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
    const user = this.usersCache.find(u => u.id === userId);
    if (!user) {
      console.error('User not found:', userId);
      return null;
    }

    Object.assign(user, updates, { lastActiveAt: now() });
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
      // Use MCP auth endpoint for registration
      const response = await fetch(`${MCP_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          password: password,
          name: userData.name,
          role: userData.role || 'user',
          avatar: userData.avatar
        })
      });

      // Handle HTTP errors
      if (!response.ok) {
        console.error('Registration HTTP error:', response.status, response.statusText);
        return { success: false, error: `Server error (${response.status}). Please try again.` };
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error('Failed to parse registration response:', parseErr);
        return { success: false, error: 'Invalid server response. Please try again.' };
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Failed to create account. Please try again.' };
      }

      const newUser = this.mapMCPUserToUser(data.user);
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

      // Send welcome/confirmation email via Resend
      sendWelcomeEmail(userData.email, newUser.name).catch(err => {
        console.error('Failed to send welcome email:', err);
      });

      return { success: true, user: newUser };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Use MCP auth endpoint for login
      const response = await fetch(`${MCP_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Login failed. Please try again.' };
      }

      const user = this.mapMCPUserToUser(data.user);
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
    try {
      const response = await fetch(`${MCP_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      return data.exists || false;
    } catch {
      return false;
    }
  }


  // Request password reset email - generates token via MCP and sends email with link
  async requestPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Request token from MCP server (stores token in database)
      const response = await fetch(`${MCP_URL}/auth/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!data.success) {
        // Don't reveal if email exists for security - always show success
        if (data.error === 'User not found') {
          return { success: true };
        }
        return { success: false, error: data.error || 'Failed to request reset.' };
      }

      // Get user name for email personalization
      const user = this.usersCache.find(u => u.email.toLowerCase() === email.toLowerCase());
      const userName = user?.name || 'User';

      // Send reset email with link via Resend
      const emailResult = await sendPasswordResetEmail(email, userName, data.token);

      if (!emailResult.success) {
        return { success: false, error: emailResult.error || 'Failed to send reset email.' };
      }

      return { success: true };
    } catch (err) {
      console.error('Password reset request error:', err);
      return { success: false, error: 'Failed to send reset email.' };
    }
  }

  // Verify reset token and get associated email
  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const response = await fetch(`${MCP_URL}/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!data.success) {
        return { valid: false, error: data.error || 'Invalid or expired token.' };
      }

      return { valid: true, email: data.email };
    } catch (err) {
      console.error('Token verification error:', err);
      return { valid: false, error: 'Failed to verify token.' };
    }
  }

  // Reset password using token (called from reset password page)
  async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${MCP_URL}/auth/reset-password-with-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to reset password.' };
      }

      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { success: false, error: 'Failed to reset password.' };
    }
  }

  // Legacy method - Simple password reset (using MCP endpoint directly)
  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${MCP_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to reset password.' };
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
      const result = await this.resetPassword(email, password);
      return result.success;
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
