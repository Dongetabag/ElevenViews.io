// Chat Service - Handles message persistence and sync with MCP server
// Provides localStorage fallback for offline support

const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';
const STORAGE_KEY = 'eleven-views-chat-messages';
const POLL_INTERVAL = 3000; // 3 seconds

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId?: string;
  channelId?: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  attachments?: { id: string; name: string; url: string; type: string }[];
  isRead: boolean;
  createdAt: string;
}

// Helper functions
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

// Storage helpers
const getLocalMessages = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalMessages = (messages: ChatMessage[]): void => {
  try {
    // Keep only last 500 messages to prevent storage overflow
    const trimmed = messages.slice(-500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save messages locally:', e);
  }
};

class ChatService {
  private messages: ChatMessage[] = [];
  private listeners: Set<() => void> = new Set();
  private pollInterval: number | null = null;
  private lastFetchTime: string = '';

  constructor() {
    this.messages = getLocalMessages();
    this.startPolling();
  }

  // Subscribe to message updates
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  // Start polling for new messages
  startPolling() {
    if (this.pollInterval) return;

    // Initial fetch
    this.fetchMessages();

    // Poll every 3 seconds
    this.pollInterval = window.setInterval(() => {
      this.fetchMessages();
    }, POLL_INTERVAL);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Fetch messages from MCP server
  async fetchMessages(): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (this.lastFetchTime) {
        params.append('since', this.lastFetchTime);
      }

      const response = await fetch(`${MCP_URL}/chat/messages?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          // Merge new messages with existing
          const newMessages = data.messages.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            recipientId: m.recipient_id,
            channelId: m.channel_id,
            content: m.content,
            type: m.type || 'text',
            attachments: m.attachments,
            isRead: m.is_read || false,
            createdAt: m.created_at
          }));

          // Add only messages we don't have
          const existingIds = new Set(this.messages.map(m => m.id));
          const uniqueNew = newMessages.filter((m: ChatMessage) => !existingIds.has(m.id));

          if (uniqueNew.length > 0) {
            this.messages = [...this.messages, ...uniqueNew].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            saveLocalMessages(this.messages);
            this.notify();
          }
        }

        this.lastFetchTime = now();
      }
    } catch (err) {
      // Silent fail - use local messages
      console.debug('Chat sync unavailable, using local messages');
    }
  }

  // Send a message
  async sendMessage(messageData: {
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    recipientId?: string;
    channelId?: string;
    content: string;
    type?: 'text' | 'file' | 'image' | 'system';
    attachments?: any[];
  }): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: generateId(),
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderAvatar: messageData.senderAvatar,
      recipientId: messageData.recipientId,
      channelId: messageData.channelId || 'general',
      content: messageData.content,
      type: messageData.type || 'text',
      attachments: messageData.attachments,
      isRead: false,
      createdAt: now()
    };

    // Add to local state immediately (optimistic update)
    this.messages.push(message);
    saveLocalMessages(this.messages);
    this.notify();

    // Sync to MCP server
    try {
      const response = await fetch(`${MCP_URL}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: message.id,
          sender_id: message.senderId,
          sender_name: message.senderName,
          sender_avatar: message.senderAvatar,
          recipient_id: message.recipientId,
          channel_id: message.channelId,
          content: message.content,
          type: message.type,
          attachments: message.attachments
        })
      });

      if (!response.ok) {
        console.warn('Failed to sync message to server');
      }
    } catch (err) {
      console.warn('Failed to sync message:', err);
    }

    return message;
  }

  // Get messages for a channel or DM
  getMessages(options?: {
    channelId?: string;
    senderId?: string;
    recipientId?: string;
    limit?: number;
  }): ChatMessage[] {
    let filtered = [...this.messages];

    if (options?.channelId) {
      filtered = filtered.filter(m => m.channelId === options.channelId && !m.recipientId);
    }

    if (options?.senderId && options?.recipientId) {
      // DM conversation - messages between two users
      filtered = filtered.filter(m =>
        (m.senderId === options.senderId && m.recipientId === options.recipientId) ||
        (m.senderId === options.recipientId && m.recipientId === options.senderId)
      );
    }

    // Sort by creation time
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (options?.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  // Mark message as read
  markAsRead(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message && !message.isRead) {
      message.isRead = true;
      saveLocalMessages(this.messages);

      // Sync to server
      fetch(`${MCP_URL}/chat/messages/${messageId}/read`, {
        method: 'POST'
      }).catch(() => {});
    }
  }

  // Get unread count
  getUnreadCount(userId: string, channelId?: string): number {
    return this.messages.filter(m =>
      !m.isRead &&
      m.senderId !== userId &&
      (channelId ? m.channelId === channelId : true)
    ).length;
  }

  // Delete a message (local only for now)
  deleteMessage(messageId: string): void {
    this.messages = this.messages.filter(m => m.id !== messageId);
    saveLocalMessages(this.messages);
    this.notify();
  }

  // Clear all messages (for testing)
  clearAll(): void {
    this.messages = [];
    saveLocalMessages(this.messages);
    this.notify();
  }
}

// Singleton instance
export const chatService = new ChatService();
export default chatService;
