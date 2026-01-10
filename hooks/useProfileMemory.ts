// React hook for Profile Memory integration
import { useState, useEffect, useCallback } from 'react';
import { profileMemory, UserSettings, ChatConversation, GeneratedImage, ChatMessage } from '../services/profileMemory';

// Hook for user settings
export const useUserSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(profileMemory.getSettings());

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    const newSettings = profileMemory.saveSettings(updates);
    setSettings(newSettings);
    return newSettings;
  }, []);

  return { settings, updateSettings };
};

// Hook for chat history
export const useChatHistory = (module?: string) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);

  useEffect(() => {
    const allConversations = profileMemory.getConversations();
    const filtered = module
      ? allConversations.filter(c => c.module === module)
      : allConversations;
    setConversations(filtered);
  }, [module]);

  const createConversation = useCallback((title: string) => {
    const conv = profileMemory.createConversation(title, module);
    setConversations(prev => [conv, ...prev]);
    setActiveConversation(conv);
    return conv;
  }, [module]);

  const addMessage = useCallback((conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const fullMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = profileMemory.addMessageToConversation(conversationId, fullMessage);
    if (updated) {
      setConversations(prev => prev.map(c => c.id === conversationId ? updated : c));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(updated);
      }
    }
    return fullMessage;
  }, [activeConversation]);

  const deleteConversation = useCallback((id: string) => {
    profileMemory.deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  }, [activeConversation]);

  const loadConversation = useCallback((id: string) => {
    const conv = profileMemory.getConversation(id);
    setActiveConversation(conv);
    return conv;
  }, []);

  return {
    conversations,
    activeConversation,
    createConversation,
    addMessage,
    deleteConversation,
    loadConversation,
    setActiveConversation,
  };
};

// Hook for generated images
export const useGeneratedImages = () => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [favorites, setFavorites] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    setImages(profileMemory.getGeneratedImages());
    setFavorites(profileMemory.getFavoriteImages());
  }, []);

  const saveImage = useCallback((image: Omit<GeneratedImage, 'id' | 'createdAt' | 'isFavorite'>) => {
    const fullImage: GeneratedImage = {
      ...image,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      isFavorite: false,
    };
    profileMemory.saveGeneratedImage(fullImage);
    setImages(prev => [fullImage, ...prev]);
    return fullImage;
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    const updated = profileMemory.toggleImageFavorite(id);
    if (updated) {
      setImages(prev => prev.map(i => i.id === id ? updated : i));
      setFavorites(profileMemory.getFavoriteImages());
    }
    return updated;
  }, []);

  const deleteImage = useCallback((id: string) => {
    profileMemory.deleteGeneratedImage(id);
    setImages(prev => prev.filter(i => i.id !== id));
    setFavorites(prev => prev.filter(i => i.id !== id));
  }, []);

  return {
    images,
    favorites,
    saveImage,
    toggleFavorite,
    deleteImage,
  };
};

// Hook for favorites
export const useFavorites = () => {
  const [favorites, setFavorites] = useState(profileMemory.getFavorites());

  const addFavorite = useCallback((itemId: string, itemType: string) => {
    profileMemory.addFavorite(itemId, itemType);
    setFavorites(profileMemory.getFavorites());
  }, []);

  const removeFavorite = useCallback((itemId: string) => {
    profileMemory.removeFavorite(itemId);
    setFavorites(profileMemory.getFavorites());
  }, []);

  const isFavorite = useCallback((itemId: string) => {
    return favorites.some(f => f.id === itemId);
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, isFavorite };
};

// Hook for recent assets
export const useRecentAssets = () => {
  const [recentAssets, setRecentAssets] = useState(profileMemory.getRecentAssets());

  const addRecent = useCallback((assetId: string, assetType: string) => {
    profileMemory.addRecentAsset(assetId, assetType);
    setRecentAssets(profileMemory.getRecentAssets());
  }, []);

  return { recentAssets, addRecent };
};

// Combined hook for full profile memory access
export const useProfileMemory = () => {
  const settings = useUserSettings();
  const generatedImages = useGeneratedImages();
  const favorites = useFavorites();
  const recentAssets = useRecentAssets();

  const exportData = useCallback(() => {
    return profileMemory.exportAllData();
  }, []);

  const importData = useCallback((jsonString: string) => {
    return profileMemory.importData(jsonString);
  }, []);

  const clearAllData = useCallback(() => {
    profileMemory.clearAllData();
  }, []);

  return {
    settings: settings.settings,
    updateSettings: settings.updateSettings,
    generatedImages: generatedImages.images,
    favoriteImages: generatedImages.favorites,
    saveGeneratedImage: generatedImages.saveImage,
    toggleImageFavorite: generatedImages.toggleFavorite,
    deleteGeneratedImage: generatedImages.deleteImage,
    favorites: favorites.favorites,
    addFavorite: favorites.addFavorite,
    removeFavorite: favorites.removeFavorite,
    isFavorite: favorites.isFavorite,
    recentAssets: recentAssets.recentAssets,
    addRecentAsset: recentAssets.addRecent,
    exportData,
    importData,
    clearAllData,
  };
};

export default useProfileMemory;
