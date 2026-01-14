// React hooks for the App Store
import { useState, useEffect, useCallback } from 'react';
import { appStore, User, Message, Document, AIAsset, Notification, Channel } from '../services/appStore';
import { chatService, ChatMessage } from '../services/chatService';

// Hook for current user
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(appStore.getCurrentUser());

  useEffect(() => {
    const unsubscribe = appStore.subscribe('users', () => {
      setUser(appStore.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (user) {
      appStore.updateUser(user.id, updates);
    }
  }, [user]);

  const setStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    if (user) {
      appStore.setUserStatus(user.id, status);
    }
  }, [user]);

  return { user, updateUser, setStatus };
}

// Hook for team members
export function useTeam() {
  const [users, setUsers] = useState<User[]>(appStore.getUsers());
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const allUsers = appStore.getUsers();
      setUsers(allUsers);
      setOnlineCount(allUsers.filter(u => u.status === 'online').length);
    };
    update();
    const unsubscribe = appStore.subscribe('users', update);
    return unsubscribe;
  }, []);

  return { users, onlineCount };
}

// Hook for messages - uses chatService with MCP sync and localStorage persistence
export function useMessages(options?: { channelId?: string; recipientId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { user } = useCurrentUser();

  useEffect(() => {
    const update = () => {
      if (options?.channelId) {
        setMessages(chatService.getMessages({ channelId: options.channelId }));
      } else if (options?.recipientId && user) {
        setMessages(chatService.getMessages({ senderId: user.id, recipientId: options.recipientId }));
      } else {
        setMessages(chatService.getMessages({ limit: 100 }));
      }
    };

    // Initial load
    update();

    // Subscribe to updates from chatService
    const unsubscribe = chatService.subscribe(update);

    return () => {
      unsubscribe();
    };
  }, [options?.channelId, options?.recipientId, user]);

  const sendMessage = useCallback(async (content: string, attachments?: any[]) => {
    if (!user) return null;

    return chatService.sendMessage({
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      recipientId: options?.recipientId,
      channelId: options?.channelId || 'general',
      content,
      type: attachments?.length ? 'file' : 'text',
      attachments
    });
  }, [user, options]);

  const markAsRead = useCallback((messageId: string) => {
    chatService.markAsRead(messageId);
  }, []);

  return { messages, sendMessage, markAsRead };
}

// Hook for channels
export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>(appStore.getChannels());

  useEffect(() => {
    setChannels(appStore.getChannels());
  }, []);

  return { channels };
}

// Hook for documents
export function useDocuments(options?: { folderId?: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const { user } = useCurrentUser();

  useEffect(() => {
    const update = () => {
      setDocuments(appStore.getDocuments({
        sharedWith: user?.id,
        folderId: options?.folderId
      }));
    };
    update();
    const unsubscribe = appStore.subscribe('documents', update);
    return unsubscribe;
  }, [user, options?.folderId]);

  const uploadDocument = useCallback((doc: Omit<Document, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'uploadedBy' | 'uploadedByName'>) => {
    if (!user) return null;
    return appStore.addDocument({
      ...doc,
      uploadedBy: user.id,
      uploadedByName: user.name
    });
  }, [user]);

  const deleteDocument = useCallback((docId: string) => {
    return appStore.deleteDocument(docId);
  }, []);

  return { documents, uploadDocument, deleteDocument };
}

// Hook for AI assets - now uses backend API with Supabase
export function useAIAssets(options?: { type?: string; isShared?: boolean }) {
  const [assets, setAssets] = useState<AIAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useCurrentUser();

  // Fetch assets from backend API
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options?.type && options.type !== 'all') {
        params.append('type', options.type);
      }

      const response = await fetch(`/api/v1/assets?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Map backend format to frontend format
        const mappedAssets: AIAsset[] = (data.assets || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          content: a.content,
          prompt: a.prompt,
          model: a.model,
          createdBy: a.created_by,
          createdByName: a.created_by_name,
          clientId: a.client_id,
          campaignId: a.campaign_id,
          tags: a.tags || [],
          isFavorite: a.is_favorite,
          isShared: a.is_shared,
          usageCount: a.usage_count || 0,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }));
        setAssets(mappedAssets);
      } else {
        // Fallback to local store if API fails
        setAssets(appStore.getAIAssets({
          type: options?.type,
          isShared: options?.isShared
        }));
      }
    } catch (error) {
      console.error('Failed to fetch assets from API:', error);
      // Fallback to local store
      setAssets(appStore.getAIAssets({
        type: options?.type,
        isShared: options?.isShared
      }));
    } finally {
      setLoading(false);
    }
  }, [options?.type, options?.isShared]);

  useEffect(() => {
    fetchAssets();
    // Also subscribe to local store changes
    const unsubscribe = appStore.subscribe('assets', fetchAssets);
    return unsubscribe;
  }, [fetchAssets]);

  const saveAsset = useCallback(async (asset: Omit<AIAsset, 'id' | 'usageCount' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => {
    if (!user) return null;

    try {
      // Save to backend API
      const response = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: asset.name,
          type: asset.type,
          content: asset.content,
          prompt: asset.prompt,
          model: asset.model,
          tags: asset.tags,
          is_shared: asset.isShared,
          created_by: user.id,
          created_by_name: user.name,
          metadata: {}
        })
      });

      if (response.ok) {
        const data = await response.json();
        fetchAssets(); // Refresh list
        return data.asset;
      }
    } catch (error) {
      console.error('Failed to save asset to API:', error);
    }

    // Fallback to local store
    return appStore.addAIAsset({
      ...asset,
      createdBy: user.id,
      createdByName: user.name
    });
  }, [user, fetchAssets]);

  const updateAsset = useCallback(async (assetId: string, updates: Partial<AIAsset>) => {
    try {
      const response = await fetch(`/api/v1/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_favorite: updates.isFavorite,
          is_shared: updates.isShared,
          name: updates.name,
          tags: updates.tags
        })
      });

      if (response.ok) {
        fetchAssets(); // Refresh list
        return true;
      }
    } catch (error) {
      console.error('Failed to update asset:', error);
    }

    // Fallback to local store
    return appStore.updateAIAsset(assetId, updates);
  }, [fetchAssets]);

  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      const response = await fetch(`/api/v1/assets/${assetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAssets(); // Refresh list
        return true;
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }

    // Fallback to local store
    return appStore.deleteAIAsset(assetId);
  }, [fetchAssets]);

  return { assets, saveAsset, updateAsset, deleteAsset, loading, refresh: fetchAssets };
}

// Hook for notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useCurrentUser();

  useEffect(() => {
    const update = () => {
      if (user) {
        setNotifications(appStore.getNotifications(user.id));
        setUnreadCount(appStore.getUnreadNotificationCount(user.id));
      }
    };
    update();
    const unsubscribe = appStore.subscribe('notifications', update);
    return unsubscribe;
  }, [user]);

  const markAsRead = useCallback((notifId: string) => {
    appStore.markNotificationAsRead(notifId);
  }, []);

  return { notifications, unreadCount, markAsRead };
}

// Hook for team stats
export function useTeamStats() {
  const [stats, setStats] = useState(appStore.getTeamStats());

  useEffect(() => {
    const update = () => setStats(appStore.getTeamStats());
    const unsubscribes = [
      appStore.subscribe('users', update),
      appStore.subscribe('messages', update),
      appStore.subscribe('documents', update),
      appStore.subscribe('assets', update)
    ];
    return () => unsubscribes.forEach(u => u());
  }, []);

  return stats;
}

// Register user on app initialization
export function useRegisterUser(profileData: any) {
  useEffect(() => {
    if (profileData?.name && profileData?.email) {
      appStore.registerUser({
        name: profileData.name,
        email: profileData.email,
        role: profileData.role || 'Team Member',
        department: profileData.role,
        title: profileData.role,
        agencyCoreCompetency: profileData.agencyCoreCompetency,
        primaryClientIndustry: profileData.primaryClientIndustry,
        avatar: profileData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileData.name)}`
      });
    }
  }, [profileData?.name, profileData?.email]);
}
