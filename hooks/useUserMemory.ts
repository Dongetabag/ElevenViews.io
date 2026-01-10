// User Memory Hook - Persistent storage for user preferences, recent files, and chat history
import { useState, useEffect, useCallback } from 'react';
import {
  UserMemory, UserPreferences, RecentFile, FavoriteFile, AIChatSession
} from '../types';

const STORAGE_PREFIX = 'eleven-views';
const MAX_RECENT_FILES = 50;
const MAX_CHAT_SESSIONS = 100;

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  viewMode: 'grid',
  sortBy: 'date',
  sortOrder: 'desc',
  categoryFilter: null,
  subcategoryFilter: null,
};

// Get storage key for a user
const getStorageKey = (userId: string, suffix: string): string => {
  return `${STORAGE_PREFIX}-${userId}-${suffix}`;
};

// Generic localStorage helpers
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

// Hook for user preferences
export function useUserPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  // Load preferences
  useEffect(() => {
    if (!userId) return;
    const key = getStorageKey(userId, 'preferences');
    const stored = getFromStorage<UserPreferences>(key, DEFAULT_PREFERENCES);
    setPreferences(stored);
    setLoaded(true);
  }, [userId]);

  // Update preferences
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    if (!userId) return;
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    saveToStorage(getStorageKey(userId, 'preferences'), newPrefs);
  }, [userId, preferences]);

  return { preferences, updatePreferences, loaded };
}

// Hook for recent files
export function useRecentFiles(userId: string | null) {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Load recent files
  useEffect(() => {
    if (!userId) return;
    const key = getStorageKey(userId, 'recent');
    const stored = getFromStorage<RecentFile[]>(key, []);
    setRecentFiles(stored);
  }, [userId]);

  // Add to recent files
  const addRecentFile = useCallback((file: Omit<RecentFile, 'accessedAt'>) => {
    if (!userId) return;

    setRecentFiles(prev => {
      // Remove if already exists
      const filtered = prev.filter(f => f.assetId !== file.assetId);

      // Add to beginning with current timestamp
      const newFile: RecentFile = {
        ...file,
        accessedAt: new Date().toISOString(),
      };

      const updated = [newFile, ...filtered].slice(0, MAX_RECENT_FILES);
      saveToStorage(getStorageKey(userId, 'recent'), updated);
      return updated;
    });
  }, [userId]);

  // Clear recent files
  const clearRecentFiles = useCallback(() => {
    if (!userId) return;
    setRecentFiles([]);
    saveToStorage(getStorageKey(userId, 'recent'), []);
  }, [userId]);

  return { recentFiles, addRecentFile, clearRecentFiles };
}

// Hook for favorite files
export function useFavoriteFiles(userId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteFile[]>([]);

  // Load favorites
  useEffect(() => {
    if (!userId) return;
    const key = getStorageKey(userId, 'favorites');
    const stored = getFromStorage<FavoriteFile[]>(key, []);
    setFavorites(stored);
  }, [userId]);

  // Toggle favorite
  const toggleFavorite = useCallback((file: Omit<FavoriteFile, 'addedAt'>) => {
    if (!userId) return;

    setFavorites(prev => {
      const exists = prev.find(f => f.assetId === file.assetId);

      if (exists) {
        // Remove from favorites
        const updated = prev.filter(f => f.assetId !== file.assetId);
        saveToStorage(getStorageKey(userId, 'favorites'), updated);
        return updated;
      } else {
        // Add to favorites
        const newFav: FavoriteFile = {
          ...file,
          addedAt: new Date().toISOString(),
        };
        const updated = [newFav, ...prev];
        saveToStorage(getStorageKey(userId, 'favorites'), updated);
        return updated;
      }
    });
  }, [userId]);

  // Check if file is favorite
  const isFavorite = useCallback((assetId: string) => {
    return favorites.some(f => f.assetId === assetId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

// Hook for AI chat sessions
export function useChatSessions(userId: string | null) {
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions
  useEffect(() => {
    if (!userId) return;
    const sessionsKey = getStorageKey(userId, 'chat-sessions');
    const activeKey = getStorageKey(userId, 'chat-current');

    const storedSessions = getFromStorage<AIChatSession[]>(sessionsKey, []);
    const storedActive = getFromStorage<string | null>(activeKey, null);

    setSessions(storedSessions);
    setActiveSessionId(storedActive);
  }, [userId]);

  // Get current session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Create new session
  const createSession = useCallback((title: string = 'New Chat') => {
    if (!userId) return null;

    const newSession: AIChatSession = {
      id: `session-${Date.now()}`,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSession, ...sessions].slice(0, MAX_CHAT_SESSIONS);
    setSessions(updated);
    setActiveSessionId(newSession.id);

    saveToStorage(getStorageKey(userId, 'chat-sessions'), updated);
    saveToStorage(getStorageKey(userId, 'chat-current'), newSession.id);

    return newSession;
  }, [userId, sessions]);

  // Update session
  const updateSession = useCallback((sessionId: string, updates: Partial<AIChatSession>) => {
    if (!userId) return;

    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === sessionId
          ? { ...s, ...updates, updatedAt: new Date().toISOString() }
          : s
      );
      saveToStorage(getStorageKey(userId, 'chat-sessions'), updated);
      return updated;
    });
  }, [userId]);

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    if (!userId) return;

    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveToStorage(getStorageKey(userId, 'chat-sessions'), updated);

      // If deleting active session, set a new one
      if (activeSessionId === sessionId) {
        const newActive = updated.length > 0 ? updated[0].id : null;
        setActiveSessionId(newActive);
        saveToStorage(getStorageKey(userId, 'chat-current'), newActive);
      }

      return updated;
    });
  }, [userId, activeSessionId]);

  // Set active session
  const setActiveSession = useCallback((sessionId: string | null) => {
    if (!userId) return;
    setActiveSessionId(sessionId);
    saveToStorage(getStorageKey(userId, 'chat-current'), sessionId);
  }, [userId]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    updateSession,
    deleteSession,
    setActiveSession,
  };
}

// Combined hook for all user memory
export function useUserMemory(userId: string | null) {
  const { preferences, updatePreferences, loaded: preferencesLoaded } = useUserPreferences(userId);
  const { recentFiles, addRecentFile, clearRecentFiles } = useRecentFiles(userId);
  const { favorites, toggleFavorite, isFavorite } = useFavoriteFiles(userId);
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    updateSession,
    deleteSession,
    setActiveSession,
  } = useChatSessions(userId);

  // Get full memory object
  const memory: UserMemory | null = userId ? {
    userId,
    preferences,
    recentFiles,
    favorites,
    chatSessions: sessions,
    currentChatSessionId: activeSessionId,
    lastSyncedAt: new Date().toISOString(),
  } : null;

  // Export memory (for backup)
  const exportMemory = useCallback(() => {
    if (!memory) return null;
    return JSON.stringify(memory, null, 2);
  }, [memory]);

  // Import memory (from backup)
  const importMemory = useCallback((jsonString: string) => {
    if (!userId) return false;

    try {
      const imported = JSON.parse(jsonString) as UserMemory;

      // Validate structure
      if (!imported.userId || !imported.preferences) {
        throw new Error('Invalid memory format');
      }

      // Save all sections
      saveToStorage(getStorageKey(userId, 'preferences'), imported.preferences);
      saveToStorage(getStorageKey(userId, 'recent'), imported.recentFiles || []);
      saveToStorage(getStorageKey(userId, 'favorites'), imported.favorites || []);
      saveToStorage(getStorageKey(userId, 'chat-sessions'), imported.chatSessions || []);
      saveToStorage(getStorageKey(userId, 'chat-current'), imported.currentChatSessionId);

      // Trigger reload
      window.location.reload();
      return true;
    } catch (e) {
      console.error('Failed to import memory:', e);
      return false;
    }
  }, [userId]);

  // Clear all memory
  const clearAllMemory = useCallback(() => {
    if (!userId) return;

    localStorage.removeItem(getStorageKey(userId, 'preferences'));
    localStorage.removeItem(getStorageKey(userId, 'recent'));
    localStorage.removeItem(getStorageKey(userId, 'favorites'));
    localStorage.removeItem(getStorageKey(userId, 'chat-sessions'));
    localStorage.removeItem(getStorageKey(userId, 'chat-current'));

    window.location.reload();
  }, [userId]);

  return {
    // User memory
    memory,
    isLoaded: preferencesLoaded,

    // Preferences
    preferences,
    updatePreferences,

    // Recent files
    recentFiles,
    addRecentFile,
    clearRecentFiles,

    // Favorites
    favorites,
    toggleFavorite,
    isFavorite,

    // Chat sessions
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    updateSession,
    deleteSession,
    setActiveSession,

    // Utilities
    exportMemory,
    importMemory,
    clearAllMemory,
  };
}

export default useUserMemory;
