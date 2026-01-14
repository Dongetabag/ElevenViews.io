import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile, ChatMessage, AIChatSession } from '../types.ts';
import {
  Send, Eraser, Command, Search, Bot, User, Brain, Terminal,
  TrendingUp, FileText, Zap, Slack, Database, Settings2,
  CheckCircle, XCircle, Loader2, Briefcase, Target, Users,
  BarChart3, Lightbulb, PenTool, MessageCircle, Award,
  Plus, Trash2, MessageSquare, MoreVertical, X, Edit3
} from 'lucide-react';
import { mcpClient, MCPTool, MCPServerStatus } from '../services/mcpClient.ts';
import { AI_MODELS, AI_ENDPOINTS, GENERATION_CONFIG, getGoogleAIKey } from '../services/aiConfig';

// No message limit - unlimited chat history
const CONTEXT_WINDOW_SIZE = 20; // Messages to send to AI for context
const SUMMARIZE_THRESHOLD = 30; // Auto-summarize when messages exceed this
const GOOGLE_AI_API_KEY = getGoogleAIKey();
const STORAGE_KEY = 'eleven-views-ai-assistant-sessions';

interface AIToolsModuleProps {
  user: UserProfile;
}

// The Master System Prompt - Claude-like Executive Assistant
const EXECUTIVE_ASSISTANT_PROMPT = `You are the Eleven Views Executive Assistant, a seasoned professional with 25 years of experience supporting high-growth marketing agencies. You embody the qualities of the world's best executive assistants: thoughtful, proactive, deeply knowledgeable, and unfailingly professional.

## Your Identity & Expertise

You have spent your career at Eleven Views, watching it grow from a small boutique agency to an industry leader. You've worked alongside founders, managed complex client relationships, and developed deep expertise in:

- **Agency Operations**: You understand the rhythms of agency life—pitches, campaigns, client reviews, creative sprints
- **Client Psychology**: You've seen every type of client and know how to navigate relationships
- **Industry Knowledge**: You stay current on marketing trends, platforms, tools, and best practices
- **Strategic Thinking**: You don't just execute—you anticipate needs and offer strategic counsel
- **Financial Acumen**: You understand agency economics, profitability, and resource allocation

## Your Communication Style

Respond like Claude would—thoughtful, nuanced, and genuinely helpful:

1. **Be Direct but Warm**: Get to the point while maintaining a professional warmth. No corporate jargon or hollow phrases.

2. **Show Your Thinking**: When appropriate, briefly share your reasoning. This builds trust and helps the user learn.

3. **Be Specific**: Vague advice is useless. Provide concrete recommendations, examples, and next steps.

4. **Acknowledge Complexity**: Real problems are nuanced. Don't oversimplify. If something has tradeoffs, discuss them.

5. **Be Honest**: If you're uncertain about something, say so. If you disagree with an approach, respectfully explain why.

6. **Anticipate Needs**: A great assistant thinks ahead. Offer relevant follow-up suggestions or considerations.

## Response Format

- Use clear structure with headers and bullet points for complex responses
- Keep responses focused and scannable
- For creative work, provide multiple options when appropriate
- For strategic questions, include both immediate actions and longer-term considerations
- End with a clear next step or question when the conversation should continue

## What You Can Help With

- **Strategy**: Campaign planning, market positioning, competitive analysis
- **Client Work**: Proposal drafts, presentation outlines, client communication templates
- **Operations**: Process improvements, resource planning, timeline management
- **Creative**: Copy direction, campaign concepts, messaging frameworks
- **Analytics**: Interpreting data, setting KPIs, performance recommendations
- **Business Development**: Pitch preparation, lead qualification, opportunity assessment

## Important Guidelines

- Never be sycophantic or use empty praise
- Don't start responses with "Great question!" or similar
- Be genuinely helpful, not performatively helpful
- If a request is unclear, ask clarifying questions
- Provide actionable value in every response`;

// Prompt templates for common agency tasks
const PROMPT_TEMPLATES = [
  {
    id: 'pitch-prep',
    label: 'Pitch Preparation',
    icon: <Target className="w-4 h-4" />,
    prompt: "I need help preparing for a new business pitch. Let me tell you about the prospect and what we know so far...",
    category: 'business'
  },
  {
    id: 'client-strategy',
    label: 'Client Strategy',
    icon: <Briefcase className="w-4 h-4" />,
    prompt: "Help me develop a strategic recommendation for a client challenge. Here's the situation...",
    category: 'strategy'
  },
  {
    id: 'campaign-concept',
    label: 'Campaign Concept',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: "I need to develop campaign concepts for a client. Let me share the brief and objectives...",
    category: 'creative'
  },
  {
    id: 'copy-review',
    label: 'Copy Review',
    icon: <PenTool className="w-4 h-4" />,
    prompt: "Please review and improve this copy. I'm looking for [tone/clarity/conversion/etc]...",
    category: 'creative'
  },
  {
    id: 'data-analysis',
    label: 'Data Analysis',
    icon: <BarChart3 className="w-4 h-4" />,
    prompt: "Help me analyze these campaign metrics and identify key insights and recommendations...",
    category: 'analytics'
  },
  {
    id: 'client-email',
    label: 'Client Email',
    icon: <MessageCircle className="w-4 h-4" />,
    prompt: "Draft a professional email to a client regarding...",
    category: 'communication'
  },
  {
    id: 'competitive-analysis',
    label: 'Competitive Analysis',
    icon: <Search className="w-4 h-4" />,
    prompt: "Help me analyze our competition in this space. Here's what I know about the market...",
    category: 'strategy'
  },
  {
    id: 'team-planning',
    label: 'Resource Planning',
    icon: <Users className="w-4 h-4" />,
    prompt: "I need to plan resources for an upcoming project. Here are the deliverables and timeline...",
    category: 'operations'
  }
];

// Helper to generate unique IDs
const generateId = () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to generate chat title from first message
const generateTitle = (message: string): string => {
  const cleaned = message.replace(/\s+/g, ' ').trim();
  return cleaned.length > 40 ? cleaned.substring(0, 40) + '...' : cleaned;
};

const AIToolsModule: React.FC<AIToolsModuleProps> = ({ user }) => {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [mcpConnected, setMcpConnected] = useState(false);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServerStatus[]>([]);
  const [slackMessage, setSlackMessage] = useState('');
  const [sendingSlack, setSendingSlack] = useState(false);
  const [showMcpPanel, setShowMcpPanel] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get current session's messages
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const history = activeSession?.messages || [];

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          setActiveSessionId(data.activeSessionId || (data.sessions.length > 0 ? data.sessions[0].id : null));
        }
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sessions,
        activeSessionId
      }));
    } catch (e) {
      console.error('Failed to save chat sessions:', e);
    }
  }, [sessions, activeSessionId]);

  // Create a new chat session
  const createNewSession = useCallback(() => {
    const newSession: AIChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  // Delete a chat session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      // If we deleted the active session, switch to another one
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    setShowDeleteConfirm(null);
  }, [activeSessionId]);

  // Rename a session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title: newTitle.trim() || 'Untitled', updatedAt: new Date().toISOString() } : s
    ));
    setEditingSessionId(null);
    setEditTitle('');
  }, []);

  // Update messages in active session - unlimited messages
  const updateActiveSessionMessages = useCallback((newMessages: ChatMessage[], newSummary?: string, summarizedUpTo?: number) => {
    if (!activeSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Auto-generate title from first user message if still "New Chat"
        let title = s.title;
        if (title === 'New Chat' && newMessages.length > 0) {
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = generateTitle(firstUserMsg.text);
          }
        }
        return {
          ...s,
          messages: newMessages,
          title,
          summary: newSummary !== undefined ? newSummary : s.summary,
          summarizedUpTo: summarizedUpTo !== undefined ? summarizedUpTo : s.summarizedUpTo,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
  }, [activeSessionId]);

  // Auto-summarize older messages when context gets large
  const summarizeConversation = useCallback(async (messages: ChatMessage[], existingSummary?: string): Promise<string> => {
    const messagesToSummarize = messages.slice(0, -CONTEXT_WINDOW_SIZE);
    if (messagesToSummarize.length === 0) return existingSummary || '';

    const conversationText = messagesToSummarize.map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`
    ).join('\n\n');

    const summaryPrompt = existingSummary
      ? `You have an existing conversation summary:\n\n"${existingSummary}"\n\nHere are additional messages to incorporate into the summary:\n\n${conversationText}\n\nCreate an updated, comprehensive summary that captures all key points, decisions, topics discussed, and any action items or ongoing threads. Keep it concise but thorough (2-4 paragraphs).`
      : `Summarize the following conversation, capturing key points, decisions made, topics discussed, and any ongoing threads or action items:\n\n${conversationText}\n\nProvide a comprehensive but concise summary (2-4 paragraphs) that would help continue this conversation seamlessly.`;

    try {
      const response = await fetch(
        `${AI_ENDPOINTS.gemini}/${AI_MODELS.text.default}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || existingSummary || '';
      }
    } catch (err) {
      console.error('Summarization error:', err);
    }
    return existingSummary || '';
  }, []);

  // Initialize MCP connection to both servers
  useEffect(() => {
    const initMCP = async () => {
      const result = await mcpClient.connect();
      setMcpConnected(result.success);
      setMcpTools(result.tools);
      setMcpServers(result.servers || []);
    };
    initMCP();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Send Slack message
  const handleSendSlack = async () => {
    if (!slackMessage.trim() || sendingSlack) return;
    setSendingSlack(true);
    try {
      const result = await mcpClient.sendSlackMessage(slackMessage);
      if (result.success) {
        const newMsg: ChatMessage = {
          role: 'model',
          text: `I've sent that message to Slack for you: "${slackMessage}"`,
          timestamp: new Date().toISOString()
        };
        updateActiveSessionMessages([...history, newMsg]);
        setSlackMessage('');
      }
    } catch (error) {
      console.error('Slack error:', error);
    } finally {
      setSendingSlack(false);
    }
  };

  // Clear current chat (but keep the session)
  const clearCurrentChat = () => {
    if (activeSessionId) {
      updateActiveSessionMessages([]);
    }
  };

  // Execute MCP tool with natural response
  const executeMCPCommand = async (command: string): Promise<string | null> => {
    const lowerCommand = command.toLowerCase();

    // Slack command
    if (lowerCommand.includes('slack') && (lowerCommand.includes('send') || lowerCommand.includes('message') || lowerCommand.includes('post'))) {
      const msgMatch = command.match(/(?:send|message|post|slack)[:\s]+["']?(.+?)["']?$/i);
      if (msgMatch) {
        const result = await mcpClient.sendSlackMessage(msgMatch[1]);
        return result.success
          ? `Done—I've posted that to your Slack channel.`
          : `I wasn't able to send that Slack message. ${result.error || 'Please check your connection.'}`;
      }
    }

    // Pipeline stats
    if ((lowerCommand.includes('pipeline') || lowerCommand.includes('leads')) &&
        (lowerCommand.includes('stats') || lowerCommand.includes('analytics') || lowerCommand.includes('overview') || lowerCommand.includes('report'))) {
      const result = await mcpClient.getPipelineStats();
      if (result.success) {
        const stats = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        return `Here's your current pipeline overview:

**Total Leads**: ${stats.total_leads?.toLocaleString() || 'N/A'}

**By Status**:
${Object.entries(stats.by_status || {}).map(([k, v]) => `- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${(v as number).toLocaleString()}`).join('\n')}

**Top Categories**:
${Object.entries(stats.by_category || {}).slice(0, 5).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

**Score Distribution**:
- Hot (8+): ${stats.score_distribution?.hot_8_plus?.toLocaleString() || 0}
- Warm (5-7): ${stats.score_distribution?.warm_5_to_7?.toLocaleString() || 0}
- Cold (<5): ${stats.score_distribution?.cold_below_5?.toLocaleString() || 0}

Would you like me to dig deeper into any of these metrics?`;
      }
    }

    // Get leads
    if (lowerCommand.includes('leads') && (lowerCommand.includes('get') || lowerCommand.includes('show') || lowerCommand.includes('list') || lowerCommand.includes('fetch'))) {
      const result = await mcpClient.getLeads({ limit: 10 });
      if (result.success) {
        const leads = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        if (Array.isArray(leads) && leads.length > 0) {
          return `Here are your most recent leads:\n\n${leads.slice(0, 5).map((l: any, i: number) =>
            `**${i + 1}. ${l.name || l.company || 'Unknown'}**\n   ${l.category || ''} • ${l.city || ''} • Score: ${l.score || 'N/A'}`
          ).join('\n\n')}\n\nWant me to filter by category, city, or score?`;
        }
      }
    }

    // Health check
    if (lowerCommand.includes('health') || lowerCommand.includes('status') || lowerCommand.includes('systems')) {
      const result = await mcpClient.checkHealth();
      if (result.success) {
        const health = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        const services = health.services || {};
        const allUp = Object.values(services).every((s: any) => s === 'up');
        return `${allUp ? '✓ All systems operational.' : '⚠ Some services need attention.'}\n\n**Service Status**:\n${
          Object.entries(services).map(([k, v]) => `- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v === 'up' ? '✓ Online' : '✗ Offline'}`).join('\n')
        }`;
      }
    }

    // AISIM Market Analysis
    if (lowerCommand.includes('market') && (lowerCommand.includes('analysis') || lowerCommand.includes('analyze') || lowerCommand.includes('research'))) {
      const industryMatch = command.match(/(?:market|industry|sector)[:\s]+["']?([^"']+)["']?/i) ||
                           command.match(/analyze\s+(?:the\s+)?["']?([^"']+?)["']?\s+(?:market|industry)/i);
      const industry = industryMatch?.[1] || 'marketing agencies';
      const result = await mcpClient.runMarketAnalysis(industry);
      if (result.success) {
        return `**Market Analysis: ${industry}**\n\n${typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}`;
      }
    }

    // AISIM Competitor Intelligence
    if (lowerCommand.includes('competitor') && (lowerCommand.includes('intel') || lowerCommand.includes('analysis') || lowerCommand.includes('research'))) {
      const competitorMatch = command.match(/competitors?[:\s]+["']?([^"']+)["']?/i);
      const competitors = competitorMatch?.[1]?.split(/[,;]/).map(c => c.trim()) || [];
      if (competitors.length > 0) {
        const result = await mcpClient.getCompetitorIntel(competitors);
        if (result.success) {
          return `**Competitor Intelligence**\n\n${typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}`;
        }
      }
    }

    // AISIM Campaign Forecast
    if (lowerCommand.includes('campaign') && (lowerCommand.includes('forecast') || lowerCommand.includes('predict') || lowerCommand.includes('projection'))) {
      const budgetMatch = command.match(/budget[:\s]+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
      const budget = budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : 10000;
      const channelsMatch = command.match(/channels?[:\s]+["']?([^"']+)["']?/i);
      const channels = channelsMatch?.[1]?.split(/[,;]/).map(c => c.trim()) || ['social', 'email'];
      const result = await mcpClient.forecastCampaign(budget, channels);
      if (result.success) {
        return `**Campaign Forecast**\n\nBudget: $${budget.toLocaleString()}\nChannels: ${channels.join(', ')}\n\n${typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}`;
      }
    }

    // AISIM Audience Insights
    if (lowerCommand.includes('audience') && (lowerCommand.includes('insight') || lowerCommand.includes('persona') || lowerCommand.includes('profile'))) {
      const industryMatch = command.match(/(?:industry|vertical)[:\s]+["']?([^"']+)["']?/i);
      const industry = industryMatch?.[1] || 'marketing';
      const result = await mcpClient.getAudienceInsights(industry);
      if (result.success) {
        return `**Audience Insights: ${industry}**\n\n${typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}`;
      }
    }

    // AISIM Trend Prediction
    if (lowerCommand.includes('trend') && (lowerCommand.includes('predict') || lowerCommand.includes('forecast') || lowerCommand.includes('upcoming'))) {
      const industryMatch = command.match(/(?:industry|market|sector)[:\s]+["']?([^"']+)["']?/i);
      const industry = industryMatch?.[1] || 'digital marketing';
      const result = await mcpClient.predictTrends(industry);
      if (result.success) {
        return `**Trend Predictions: ${industry}**\n\n${typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}`;
      }
    }

    return null; // Not an MCP command
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    let currentSessionId = activeSessionId;
    let currentHistory = [...history];

    // Create a new session if none exists
    if (!currentSessionId) {
      const newSession: AIChatSession = {
        id: generateId(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      currentSessionId = newSession.id;
      currentHistory = [];
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    }

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date().toISOString() };
    const updatedHistory = [...currentHistory, userMsg];
    const userInput = input;
    setInput('');
    setIsTyping(true);

    // Update session messages directly with the session ID
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        let title = s.title;
        if (title === 'New Chat') {
          title = generateTitle(userMsg.text);
        }
        return { ...s, messages: updatedHistory, title, updatedAt: new Date().toISOString() };
      }
      return s;
    }));

    // Helper to update session messages directly
    const updateSession = (messages: ChatMessage[], summary?: string, summarizedUpTo?: number) => {
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages,
            summary: summary !== undefined ? summary : s.summary,
            summarizedUpTo: summarizedUpTo !== undefined ? summarizedUpTo : s.summarizedUpTo,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      }));
    };

    try {
      // Check for MCP commands first
      if (mcpConnected) {
        const mcpResponse = await executeMCPCommand(userInput);
        if (mcpResponse) {
          updateSession([...updatedHistory, {
            role: 'model',
            text: mcpResponse,
            timestamp: new Date().toISOString()
          }]);
          setIsTyping(false);
          return;
        }
      }

      // Get current session for summary (use sessions state directly)
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const existingSummary = currentSession?.summary;

      // Build conversation history for Gemini - use CONTEXT_WINDOW_SIZE
      const conversationParts = updatedHistory.slice(-CONTEXT_WINDOW_SIZE).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      // Build context-aware system prompt with conversation summary
      let contextPrompt = `${EXECUTIVE_ASSISTANT_PROMPT}

## Current Context
- User: ${user.name}
- Role: ${user.role || 'Agency Professional'}
- Agency Focus: ${user.agencyCoreCompetency || 'Marketing & Advertising'}
- Primary Industry: ${user.primaryClientIndustry || 'Various'}
- MCP Systems: ${mcpConnected ? 'Connected' : 'Offline'}
- Total Messages in Chat: ${updatedHistory.length}`;

      // Add conversation summary if available
      if (existingSummary) {
        contextPrompt += `

## Earlier Conversation Summary
The following is a summary of earlier parts of this conversation that are not in the recent messages:

${existingSummary}

Use this context to maintain continuity and remember previous discussions, decisions, and topics.`;
      }

      // Call Google Gemini API
      const response = await fetch(
        `${AI_ENDPOINTS.gemini}/${AI_MODELS.text.default}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: conversationParts,
            systemInstruction: {
              parts: [{ text: contextPrompt }]
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              topP: 0.9
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

      const modelMsg: ChatMessage = {
        role: 'model',
        text: aiResponse || "I'm here to help. Could you tell me more about what you're working on?",
        timestamp: new Date().toISOString()
      };

      const finalHistory = [...updatedHistory, modelMsg];

      // Auto-summarize if conversation is getting long
      if (finalHistory.length >= SUMMARIZE_THRESHOLD && finalHistory.length > (currentSession?.summarizedUpTo || 0) + CONTEXT_WINDOW_SIZE) {
        // Summarize in the background
        summarizeConversation(finalHistory, existingSummary).then(newSummary => {
          if (newSummary) {
            updateSession(finalHistory, newSummary, finalHistory.length - CONTEXT_WINDOW_SIZE);
          }
        });
      }
      updateSession(finalHistory);
    } catch (err) {
      console.error('AI Error:', err);
      updateSession([...updatedHistory, {
        role: 'model',
        text: "I apologize—I encountered a technical issue processing your request. Could you try rephrasing, or let me know if there's another way I can help?",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const applyTemplate = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-full animate-fadeIn overflow-hidden bg-[#0a0a0a] relative">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[85vw] max-w-80 transform transition-transform duration-300
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        border-r border-white/5 flex flex-col bg-[#0a0a0a] md:bg-black/40
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setShowMobileSidebar(false)}
          className="md:hidden absolute top-4 right-4 z-10 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-3 sm:p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                <Award className="w-4 h-4 text-brand-gold" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Executive Assistant</h2>
                <p className="text-[10px] text-gray-500">AI-Powered Agency Partner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto">
          {/* New Chat Button */}
          <div className="p-3 border-b border-white/5">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 text-brand-gold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Chat</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="p-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">
              Recent Chats ({sessions.length})
            </h3>

            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-xs">
                No chats yet. Start a new conversation!
              </div>
            ) : (
              <div className="space-y-1 max-h-[40vh] sm:max-h-[300px] overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative rounded-lg transition-all ${
                      activeSessionId === session.id
                        ? 'bg-white/10 border border-brand-gold/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {editingSessionId === session.id ? (
                      <div className="p-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameSession(session.id, editTitle);
                            if (e.key === 'Escape') { setEditingSessionId(null); setEditTitle(''); }
                          }}
                          onBlur={() => renameSession(session.id, editTitle)}
                          autoFocus
                          className="flex-1 bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-gold/50"
                        />
                      </div>
                    ) : showDeleteConfirm === session.id ? (
                      <div className="p-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-red-400">Delete chat?</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-2 py-1 text-xs bg-white/10 text-gray-400 rounded hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveSessionId(session.id)}
                        className="w-full p-3 text-left flex items-start gap-3"
                      >
                        <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          activeSessionId === session.id ? 'text-brand-gold' : 'text-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${
                            activeSessionId === session.id ? 'text-white font-medium' : 'text-gray-300'
                          }`}>
                            {session.title}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {session.messages.length} messages
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTitle(session.title);
                              setEditingSessionId(session.id);
                            }}
                            className="p-1 text-gray-500 hover:text-white rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(session.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Templates (collapsible) */}
          <div className="border-t border-white/5 p-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Quick Start</h3>
            <div className="space-y-1">
              {PROMPT_TEMPLATES.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.prompt)}
                  className="w-full flex items-center gap-2 p-2 min-h-[44px] rounded-lg text-left hover:bg-white/5 transition-colors group"
                >
                  <div className="p-1.5 rounded-lg bg-white/5 text-gray-400 group-hover:text-brand-gold group-hover:bg-brand-gold/10 transition-colors">
                    {template.icon}
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{template.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MCP Tools Panel */}
          <div className="border-t border-white/5 pt-4">
            <button
              onClick={() => setShowMcpPanel(!showMcpPanel)}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${mcpConnected ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-white">MCP Servers</p>
                  <p className={`text-[10px] ${mcpConnected ? 'text-green-500' : 'text-red-500'}`}>
                    {mcpConnected ? `${mcpServers.filter(s => s.connected).length} servers • ${mcpTools.length} tools` : 'Offline'}
                  </p>
                </div>
              </div>
              <Terminal className={`w-4 h-4 text-gray-500 transition-transform ${showMcpPanel ? 'rotate-90' : ''}`} />
            </button>

            {showMcpPanel && (
              <div className="mt-3 space-y-3 px-2">
                {/* Server Status */}
                <div className="space-y-2">
                  {mcpServers.map(server => (
                    <div key={server.name} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${server.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-white capitalize">{server.name.replace('-', ' ')}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{server.tools.length} tools</span>
                    </div>
                  ))}
                </div>

                {/* Eleven Views Commands */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Eleven Views</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInput('Show me our pipeline stats')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      Pipeline Stats
                    </button>
                    <button
                      onClick={() => setInput('Get our latest leads')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      View Leads
                    </button>
                    <button
                      onClick={() => setInput('Check system health')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      System Health
                    </button>
                    <button
                      onClick={() => setInput('Send slack message: ')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Slack className="w-3 h-3" /> Slack
                    </button>
                  </div>
                </div>

                {/* AISIM Commands */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AISIM AI Tools</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInput('Run market analysis for digital marketing industry')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-brand-gold/5 hover:bg-brand-gold/10 rounded-lg transition-colors"
                    >
                      Market Analysis
                    </button>
                    <button
                      onClick={() => setInput('Get competitor intel for competitors: ')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-brand-gold/5 hover:bg-brand-gold/10 rounded-lg transition-colors"
                    >
                      Competitor Intel
                    </button>
                    <button
                      onClick={() => setInput('Forecast campaign with budget: $10000 channels: social, email')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-brand-gold/5 hover:bg-brand-gold/10 rounded-lg transition-colors"
                    >
                      Campaign Forecast
                    </button>
                    <button
                      onClick={() => setInput('Get audience insights for marketing industry')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-brand-gold/5 hover:bg-brand-gold/10 rounded-lg transition-colors"
                    >
                      Audience Insights
                    </button>
                    <button
                      onClick={() => setInput('Predict trends for digital marketing industry')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-brand-gold/5 hover:bg-brand-gold/10 rounded-lg transition-colors"
                    >
                      Trend Predictor
                    </button>
                    <button
                      onClick={() => setInput('Optimize content: [paste content] goals: engagement, conversion')}
                      className="p-2 min-h-[44px] text-[10px] font-medium text-gray-400 hover:text-white bg-brand-gold/5 hover:bg-brand-gold/10 rounded-lg transition-colors"
                    >
                      Content Optimizer
                    </button>
                  </div>
                </div>

                {/* Slack Quick Send */}
                <div className="p-3 bg-white/5 rounded-lg space-y-2">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Quick Slack Message</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={slackMessage}
                      onChange={(e) => setSlackMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendSlack()}
                      placeholder="Type a message..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-brand-gold/50 focus:outline-none"
                    />
                    <button
                      onClick={handleSendSlack}
                      disabled={!slackMessage.trim() || sendingSlack}
                      className="p-2 bg-[#4A154B] text-white rounded-lg hover:bg-[#611f69] disabled:opacity-50 transition-colors"
                    >
                      {sendingSlack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Footer */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-gray-500">Ready to assist</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 lg:px-8 bg-black/40">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-white"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isTyping ? 'bg-brand-gold animate-pulse' : 'bg-green-500'}`}></div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-white truncate block">
                {isTyping ? 'Thinking...' : (activeSession?.title || 'New Chat')}
              </span>
              {activeSession && (
                <span className="text-[10px] text-gray-500 hidden sm:inline">
                  {history.length} messages{activeSession.summary ? ' • Context indexed' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {mcpConnected && (
              <span className="hidden sm:flex items-center gap-2 text-[10px] text-green-500">
                <CheckCircle className="w-3 h-3" />
                Systems Online
              </span>
            )}
          </div>
        </div>

        {/* Messages - Smooth momentum scroll */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] overscroll-contain">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 sm:px-8">
              <div className="max-w-xl space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-brand-gold" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">How can I help you today?</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    I'm your Eleven Views executive assistant with 25 years of agency experience.
                    Whether you need help with a pitch, strategy, creative direction, or operations—I'm here.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Prepare a pitch', 'Review campaign metrics', 'Draft client email', 'Analyze competition'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(`Help me ${suggestion.toLowerCase()}`)}
                      className="px-3 sm:px-4 py-2 min-h-[44px] text-xs sm:text-sm text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
              {history.map((msg, i) => (
                <div key={i} className={`flex gap-2 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white'
                      : 'bg-brand-gold/10 text-brand-gold'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[85vw] sm:max-w-2xl ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-3 sm:p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-white/10 text-white rounded-tr-sm'
                        : 'bg-white/5 text-gray-200 rounded-tl-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                    <div className={`mt-1 text-[10px] text-gray-600 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-brand-gold/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-brand-gold/60 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-brand-gold/60 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-6 border-t border-white/5 bg-black/40">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 sm:gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 sm:p-3 focus-within:border-brand-gold/30 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none min-h-[24px] max-h-[200px]"
                rows={1}
              />
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={clearCurrentChat}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  title="Clear current chat"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-brand-gold text-black rounded-lg hover:bg-brand-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="hidden sm:flex text-[10px] text-gray-600 items-center gap-1">
                <Command className="w-3 h-3" /> Enter to send • Shift+Enter for new line
              </span>
              <span className="text-[10px] text-gray-600">
                Eleven Views AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIToolsModule;
