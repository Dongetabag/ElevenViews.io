import { useState, useEffect, useCallback } from 'react';

export interface SessionMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface Session {
  id: string;
  title: string;
  moduleId: string;
  messages: SessionMessage[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface SessionMemoryData {
  sessions: Session[];
  activeSessionId: string | null;
}

const MAX_MESSAGES_PER_SESSION = 25;
const STORAGE_PREFIX = 'recipe-labs-sessions-';

// Generate unique ID
const generateId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Generate title from first message
const generateTitle = (text: string, maxLength: number = 40): string => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) + '...' : cleaned;
};

/**
 * Hook for managing session memory across modules
 * @param moduleId - Unique identifier for the module (e.g., 'tools-headline-generator', 'email-playbook')
 */
export function useSessionMemory(moduleId: string) {
  const storageKey = `${STORAGE_PREFIX}${moduleId}`;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data: SessionMemoryData = JSON.parse(stored);
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          setActiveSessionId(data.activeSessionId || (data.sessions.length > 0 ? data.sessions[0].id : null));
        }
      }
    } catch (e) {
      console.error(`Failed to load sessions for ${moduleId}:`, e);
    }
  }, [storageKey, moduleId]);

  // Save to localStorage whenever sessions change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        sessions,
        activeSessionId
      }));
    } catch (e) {
      console.error(`Failed to save sessions for ${moduleId}:`, e);
    }
  }, [sessions, activeSessionId, storageKey, moduleId]);

  // Create a new session
  const createSession = useCallback((title?: string, metadata?: Record<string, any>) => {
    const newSession: Session = {
      id: generateId(),
      title: title || 'New Chat',
      moduleId,
      messages: [],
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, [moduleId]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  }, [activeSessionId]);

  // Rename a session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, title: newTitle.trim() || 'Untitled', updatedAt: new Date().toISOString() }
        : s
    ));
  }, []);

  // Switch to a session
  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Add a message to the active session
  const addMessage = useCallback((role: 'user' | 'model', text: string) => {
    if (!activeSessionId) {
      // Auto-create a session if none exists
      const newSessionId = createSession();
      // Need to update the new session with the message
      setSessions(prev => prev.map(s => {
        if (s.id === newSessionId) {
          const newMessages = [...s.messages, { role, text, timestamp: new Date().toISOString() }];
          let title = s.title;
          if (title === 'New Chat' && role === 'user') {
            title = generateTitle(text);
          }
          return {
            ...s,
            messages: newMessages.slice(-MAX_MESSAGES_PER_SESSION),
            title,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      }));
      return;
    }

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const newMessages = [...s.messages, { role, text, timestamp: new Date().toISOString() }];
        let title = s.title;
        if (title === 'New Chat' && role === 'user') {
          title = generateTitle(text);
        }
        return {
          ...s,
          messages: newMessages.slice(-MAX_MESSAGES_PER_SESSION),
          title,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
  }, [activeSessionId, createSession]);

  // Update all messages in the active session
  const updateMessages = useCallback((newMessages: SessionMessage[]) => {
    if (!activeSessionId) return;

    const limitedMessages = newMessages.slice(-MAX_MESSAGES_PER_SESSION);

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        let title = s.title;
        if (title === 'New Chat' && limitedMessages.length > 0) {
          const firstUserMsg = limitedMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = generateTitle(firstUserMsg.text);
          }
        }
        return { ...s, messages: limitedMessages, title, updatedAt: new Date().toISOString() };
      }
      return s;
    }));
  }, [activeSessionId]);

  // Clear messages in active session
  const clearMessages = useCallback(() => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [], updatedAt: new Date().toISOString() }
        : s
    ));
  }, [activeSessionId]);

  // Update session metadata
  const updateMetadata = useCallback((metadata: Record<string, any>) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, metadata: { ...s.metadata, ...metadata }, updatedAt: new Date().toISOString() }
        : s
    ));
  }, [activeSessionId]);

  return {
    // State
    sessions,
    activeSession,
    activeSessionId,
    messages,

    // Actions
    createSession,
    deleteSession,
    renameSession,
    switchSession,
    addMessage,
    updateMessages,
    clearMessages,
    updateMetadata,

    // Utilities
    maxMessages: MAX_MESSAGES_PER_SESSION
  };
}

export default useSessionMemory;
