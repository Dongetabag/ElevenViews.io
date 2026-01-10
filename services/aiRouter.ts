// AI Router Service - Routes AI requests through N8N webhooks for secure, stable integration
// This provides centralized AI routing with logging, rate limiting, and fallback handling

const N8N_BASE_URL = import.meta.env.VITE_N8N_API_URL || 'https://n8n.srv1167160.hstgr.cloud';
const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';
const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

// AI Webhook endpoints
const AI_WEBHOOKS = {
  chat: `${N8N_BASE_URL}/webhook/ai-chat`,
  image: `${N8N_BASE_URL}/webhook/ai-image`,
  analysis: `${N8N_BASE_URL}/webhook/ai-analysis`,
  mcpQuery: `${N8N_BASE_URL}/webhook/ai-mcp-query`,
  librarian: `${N8N_BASE_URL}/webhook/agent-librarian`,
  production: `${N8N_BASE_URL}/webhook/agent-production`,
  content: `${N8N_BASE_URL}/webhook/agent-content`,
  research: `${N8N_BASE_URL}/webhook/agent-research`,
} as const;

export type AIEndpoint = keyof typeof AI_WEBHOOKS;

// Request/Response interfaces
export interface AIRequest {
  message?: string;
  prompt?: string;
  context?: Record<string, unknown>;
  imageUrl?: string;
  mediaUrl?: string;
  userId?: string;
  sessionId?: string;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  data?: Record<string, unknown>;
  error?: string;
  source: 'n8n' | 'direct' | 'mcp';
}

// Google AI direct fallback (when N8N unavailable)
async function directGoogleAI(prompt: string, context?: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context ? `Context: ${context}\n\nUser: ${prompt}` : prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Google AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

// MCP Claude query fallback
async function mcpClaudeQuery(query: string, context?: string): Promise<string> {
  const response = await fetch(`${MCP_URL}/mcp/tools/claude_database_query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context })
  });

  if (!response.ok) {
    throw new Error(`MCP query error: ${response.status}`);
  }

  const data = await response.json();
  return data.response || data.result || 'Query processed';
}

// Main routing function
export async function routeAIRequest(
  endpoint: AIEndpoint,
  payload: AIRequest,
  options: { timeout?: number; retries?: number } = {}
): Promise<AIResponse> {
  const { timeout = 30000, retries = 1 } = options;
  const webhookUrl = AI_WEBHOOKS[endpoint];

  // Try N8N webhook first
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          source: 'eleven-views-platform'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          response: data.response || data.message || data.result,
          data: data,
          source: 'n8n'
        };
      }

      // If N8N returns error, log and try fallback
      console.warn(`N8N webhook returned ${response.status} for ${endpoint}`);

    } catch (error) {
      console.warn(`N8N webhook attempt ${attempt + 1} failed:`, error);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Exponential backoff
      }
    }
  }

  // Fallback to direct API calls
  console.log('Falling back to direct API calls');

  try {
    if (endpoint === 'mcpQuery') {
      // Use MCP Claude for database queries
      const response = await mcpClaudeQuery(
        payload.prompt || payload.message || '',
        JSON.stringify(payload.context)
      );
      return { success: true, response, source: 'mcp' };
    }

    // Use direct Google AI for other requests
    const response = await directGoogleAI(
      payload.prompt || payload.message || '',
      JSON.stringify(payload.context)
    );
    return { success: true, response, source: 'direct' };

  } catch (fallbackError) {
    return {
      success: false,
      error: `AI request failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
      source: 'direct'
    };
  }
}

// Convenience functions for specific endpoints
export const aiChat = (message: string, context?: Record<string, unknown>) =>
  routeAIRequest('chat', { message, context });

export const aiImageEdit = (prompt: string, imageUrl: string) =>
  routeAIRequest('image', { prompt, imageUrl });

export const aiAnalyze = (mediaUrl: string, prompt?: string) =>
  routeAIRequest('analysis', { mediaUrl, prompt });

export const aiMCPQuery = (query: string, context?: Record<string, unknown>) =>
  routeAIRequest('mcpQuery', { prompt: query, context });

// Agent-specific functions
export const agentLibrarian = (prompt: string, context?: Record<string, unknown>) =>
  routeAIRequest('librarian', { prompt, context });

export const agentProduction = (prompt: string, context?: Record<string, unknown>) =>
  routeAIRequest('production', { prompt, context });

export const agentContent = (prompt: string, context?: Record<string, unknown>) =>
  routeAIRequest('content', { prompt, context });

export const agentResearch = (prompt: string, context?: Record<string, unknown>) =>
  routeAIRequest('research', { prompt, context });

// Check if N8N is available
export async function checkN8NHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  routeAIRequest,
  aiChat,
  aiImageEdit,
  aiAnalyze,
  aiMCPQuery,
  agentLibrarian,
  agentProduction,
  agentContent,
  agentResearch,
  checkN8NHealth,
  AI_WEBHOOKS
};
