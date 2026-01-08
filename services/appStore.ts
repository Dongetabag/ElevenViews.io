// Recipe Labs App Store - Unified state management with persistence
// Handles users, team, chat, documents, and AI assets

const STORAGE_KEYS = {
  USERS: 'recipe-labs-users',
  CURRENT_USER: 'recipe-labs-current-user',
  USER_CREDENTIALS: 'recipe-labs-credentials',
  MESSAGES: 'recipe-labs-messages',
  DOCUMENTS: 'recipe-labs-documents',
  AI_ASSETS: 'recipe-labs-ai-assets',
  NOTIFICATIONS: 'recipe-labs-notifications'
};

// Simple hash function for password storage (not cryptographically secure, but fine for demo)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

interface UserCredentials {
  email: string;
  passwordHash: string;
}

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
  recipientId?: string; // null for team-wide messages
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
  sharedWith: string[]; // user IDs, empty = everyone
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
  private users: User[] = [];
  private currentUserId: string | null = null;
  private credentials: UserCredentials[] = [];
  private messages: Message[] = [];
  private channels: Channel[] = DEFAULT_CHANNELS;
  private documents: Document[] = [];
  private aiAssets: AIAsset[] = [];
  private notifications: Notification[] = [];
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.users = getStorage(STORAGE_KEYS.USERS, []);
    this.currentUserId = getStorage(STORAGE_KEYS.CURRENT_USER, null);
    this.credentials = getStorage(STORAGE_KEYS.USER_CREDENTIALS, []);
    this.messages = getStorage(STORAGE_KEYS.MESSAGES, []);
    this.documents = getStorage(STORAGE_KEYS.DOCUMENTS, []);
    this.aiAssets = getStorage(STORAGE_KEYS.AI_ASSETS, []);
    this.notifications = getStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  private saveToStorage() {
    setStorage(STORAGE_KEYS.USERS, this.users);
    setStorage(STORAGE_KEYS.CURRENT_USER, this.currentUserId);
    setStorage(STORAGE_KEYS.USER_CREDENTIALS, this.credentials);
    setStorage(STORAGE_KEYS.MESSAGES, this.messages);
    setStorage(STORAGE_KEYS.DOCUMENTS, this.documents);
    setStorage(STORAGE_KEYS.AI_ASSETS, this.aiAssets);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  private notify(event: string) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener());
    }
    // Also notify 'all' listeners
    const allListeners = this.listeners.get('all');
    if (allListeners) {
      allListeners.forEach(listener => listener());
    }
  }

  // Subscribe to changes
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

  registerUser(userData: Omit<User, 'id' | 'joinedAt' | 'lastActiveAt' | 'status'>): User {
    const existingUser = this.users.find(u => u.email === userData.email);
    if (existingUser) {
      // Update existing user
      Object.assign(existingUser, userData, { lastActiveAt: now(), status: 'online' });
      this.saveToStorage();
      this.notify('users');
      return existingUser;
    }

    const newUser: User = {
      ...userData,
      id: generateId(),
      status: 'online',
      joinedAt: now(),
      lastActiveAt: now()
    };
    this.users.push(newUser);
    this.currentUserId = newUser.id;
    this.saveToStorage();
    this.notify('users');

    // Add system message for new user
    this.addMessage({
      senderId: 'system',
      senderName: 'System',
      channelId: 'general',
      content: `${newUser.name} has joined Recipe Labs!`,
      type: 'system'
    });

    return newUser;
  }

  getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    return this.users.find(u => u.id === this.currentUserId) || null;
  }

  setCurrentUser(userId: string) {
    this.currentUserId = userId;
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = 'online';
      user.lastActiveAt = now();
    }
    this.saveToStorage();
    this.notify('users');
  }

  updateUser(userId: string, updates: Partial<User>): User | null {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    Object.assign(user, updates, { lastActiveAt: now() });
    this.saveToStorage();
    this.notify('users');
    return user;
  }

  getUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: string): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  getOnlineUsers(): User[] {
    return this.users.filter(u => u.status === 'online');
  }

  setUserStatus(userId: string, status: 'online' | 'away' | 'offline') {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = status;
      user.lastActiveAt = now();
      this.saveToStorage();
      this.notify('users');
    }
  }

  // ==================== AUTHENTICATION ====================

  // Register a new user with password
  registerUserWithPassword(userData: Omit<User, 'id' | 'joinedAt' | 'lastActiveAt' | 'status'>, password: string): { success: boolean; user?: User; error?: string } {
    // Check if email already exists
    const existingUser = this.users.find(u => u.email === userData.email);
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    // Create the user
    const newUser: User = {
      ...userData,
      id: generateId(),
      status: 'online',
      joinedAt: now(),
      lastActiveAt: now()
    };
    this.users.push(newUser);

    // Store credentials
    this.credentials.push({
      email: userData.email,
      passwordHash: simpleHash(password)
    });

    this.currentUserId = newUser.id;
    this.saveToStorage();
    this.notify('users');

    // Add system message for new user
    this.addMessage({
      senderId: 'system',
      senderName: 'System',
      channelId: 'general',
      content: `${newUser.name} has joined Recipe Labs!`,
      type: 'system'
    });

    return { success: true, user: newUser };
  }

  // Login with email and password
  login(email: string, password: string): { success: boolean; user?: User; error?: string } {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'No account found with this email. Please create an account first.' };
    }

    const creds = this.credentials.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!creds) {
      // Legacy user without password - allow login and set password
      return { success: false, error: 'Please set a password for your account.' };
    }

    if (creds.passwordHash !== simpleHash(password)) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    // Login successful
    user.status = 'online';
    user.lastActiveAt = now();
    this.currentUserId = user.id;
    this.saveToStorage();
    this.notify('users');

    return { success: true, user };
  }

  // Check if email exists
  emailExists(email: string): boolean {
    return this.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  }

  // Get all registered emails (for autocomplete)
  getRegisteredEmails(): string[] {
    return this.users.map(u => u.email);
  }

  // Logout
  logout() {
    if (this.currentUserId) {
      const user = this.users.find(u => u.id === this.currentUserId);
      if (user) {
        user.status = 'offline';
      }
    }
    this.currentUserId = null;
    this.saveToStorage();
    this.notify('users');
  }

  // Set password for existing user (for legacy users)
  setPassword(email: string, password: string): boolean {
    const existingCreds = this.credentials.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (existingCreds) {
      existingCreds.passwordHash = simpleHash(password);
    } else {
      this.credentials.push({
        email,
        passwordHash: simpleHash(password)
      });
    }
    this.saveToStorage();
    return true;
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

    // Create notification for recipient
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
      // Direct messages between two users
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

    // Add activity message
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
      totalUsers: this.users.length,
      onlineUsers: this.users.filter(u => u.status === 'online').length,
      totalMessages: this.messages.length,
      totalDocuments: this.documents.length,
      totalAIAssets: this.aiAssets.length
    };
  }
}

// Singleton instance
export const appStore = new AppStore();
export default appStore;
